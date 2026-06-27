package com.scheduleiq.backend.service.optimization;

import com.google.ortools.Loader;
import com.google.ortools.sat.*;
import com.scheduleiq.backend.model.*;
import com.scheduleiq.backend.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.*;
import java.util.Objects;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class AutoSchedulerService {

    private final EmployeeRepository employeeRepository;
    private final ShiftRepository shiftRepository;
    private final LeaveRequestRepository leaveRequestRepository;
    private final JobStatusRepository jobStatusRepository;

    @Async // Runs asynchronously in the background task executor!
    public void generateOptimalRoster(String jobId, LocalDateTime weekStart, LocalDateTime weekEnd, double budgetCap, Long managerId) {
        JobStatus job = JobStatus.builder()
                .jobId(jobId)
                .status("RUNNING")
                .progressPct(10)
                .createdAt(LocalDateTime.now())
                .build();
        jobStatusRepository.save(Objects.requireNonNull(job));

        try {
            log.info(">>> Loading native Google OR-Tools libraries...");
            Loader.loadNativeLibraries();

            // 1. Fetch all NON-MANAGER employees for this team
            List<Employee> employees = employeeRepository.findByManagerIdOrderByIdAsc(managerId);

            if (employees.isEmpty()) {
                // Edge case: no employees yet — mark complete with a warning
                log.warn(">>> No employees found for manager [{}]. Cannot generate schedule.", managerId);
                job.setProgressPct(100);
                job.setStatus("COMPLETED");
                job.setErrorMessage("No employees in your team. Add employees before generating a schedule.");
                jobStatusRepository.save(Objects.requireNonNull(job));
                return;
            }

            log.info(">>> Found {} employees for manager [{}]", employees.size(), managerId);

            // 2. Get or create draft shifts for the week
            List<Shift> openShifts = shiftRepository.findByManagerIdAndStartTimeBetween(managerId, weekStart, weekEnd);
            Set<Role> existingRoles = openShifts.stream().map(Shift::getRole).collect(Collectors.toSet());
            Set<Role> teamRoles = employees.stream().map(Employee::getRole).collect(Collectors.toSet());
            
            if (openShifts.isEmpty() || !existingRoles.containsAll(teamRoles)) {
                List<Shift> unassignedDrafts = openShifts.stream()
                        .filter(s -> "DRAFT".equals(s.getStatus()) && s.getEmployee() == null)
                        .collect(Collectors.toList());
                if (!unassignedDrafts.isEmpty()) {
                    shiftRepository.deleteAll(unassignedDrafts);
                }
                openShifts = createSmartDraftShiftsForWeek(weekStart, managerId, employees);
            }

            log.info(">>> Working with {} open shifts", openShifts.size());

            // 3. Load approved leave requests
            List<LeaveRequest> approvedLeaves = leaveRequestRepository.findByLeaveDateBetween(
                    weekStart.toLocalDate(), weekEnd.toLocalDate());

            job.setProgressPct(30);
            jobStatusRepository.save(Objects.requireNonNull(job));

            // 4. Initialize CP-SAT Constraint Programming Model
            CpModel model = new CpModel();

            // Decision variable: x[emp][shift] = true if emp works that shift
            Map<Long, Map<Long, Literal>> x = new HashMap<>();
            for (Employee emp : employees) {
                x.put(emp.getId(), new HashMap<>());
            }

            for (Employee emp : employees) {
                for (Shift shift : openShifts) {
                    Literal var = model.newBoolVar("emp_" + emp.getId() + "_shift_" + shift.getId());
                    x.get(emp.getId()).put(shift.getId(), var);
                }
            }

            // 5. Hard Constraints

            // Rule A: At most one employee per shift
            for (Shift shift : openShifts) {
                List<Literal> shiftAssignees = new ArrayList<>();
                for (Employee emp : employees) {
                    shiftAssignees.add(x.get(emp.getId()).get(shift.getId()));
                }
                model.addAtMostOne(shiftAssignees.toArray(new Literal[0]));
            }

            // Rule B: No overlapping shifts for one employee
            for (Employee emp : employees) {
                for (int i = 0; i < openShifts.size(); i++) {
                    Shift s1 = openShifts.get(i);
                    for (int j = i + 1; j < openShifts.size(); j++) {
                        Shift s2 = openShifts.get(j);
                        if (shiftsOverlap(s1, s2)) {
                            model.addImplication(
                                x.get(emp.getId()).get(s1.getId()),
                                x.get(emp.getId()).get(s2.getId()).not());
                        }
                    }
                }
            }

            // Rule C: Approved leave days blocked
            for (LeaveRequest leave : approvedLeaves) {
                if (!"APPROVED".equals(leave.getStatus())) continue;
                Employee emp = leave.getEmployee();
                if (emp == null) continue;
                // Find this employee in our list by ID
                Employee matchingEmp = null;
                for (Employee e : employees) {
                    if (e.getId().equals(emp.getId())) {
                        matchingEmp = e;
                        break;
                    }
                }
                if (matchingEmp != null) {
                    for (Shift shift : openShifts) {
                        if (shift.getStartTime().toLocalDate().equals(leave.getLeaveDate())) {
                            model.addEquality(x.get(matchingEmp.getId()).get(shift.getId()), 0);
                        }
                    }
                }
            }

            // Rule D: 8-hour rest period between consecutive shifts
            for (Employee emp : employees) {
                for (Shift s1 : openShifts) {
                    for (Shift s2 : openShifts) {
                        if (s1.getId().equals(s2.getId())) continue;
                        if (restPeriodTooShort(s1, s2, 8)) {
                            model.addImplication(
                                x.get(emp.getId()).get(s1.getId()),
                                x.get(emp.getId()).get(s2.getId()).not());
                        }
                    }
                }
            }

            // Rule E: Weekly hours cap per employee
            for (Employee emp : employees) {
                LinearExprBuilder totalHours = LinearExpr.newBuilder();
                for (Shift shift : openShifts) {
                    double durationHours = Duration.between(shift.getStartTime(), shift.getEndTime()).toMinutes() / 60.0;
                    totalHours.addTerm(x.get(emp.getId()).get(shift.getId()), (long) durationHours);
                }
                model.addLessOrEqual(totalHours.build(), emp.getMaxHoursPerWeek());
            }

            // Rule F: Employee Role must match Shift Role
            for (Employee emp : employees) {
                for (Shift shift : openShifts) {
                    if (emp.getRole() != shift.getRole()) {
                        model.addEquality(x.get(emp.getId()).get(shift.getId()), 0);
                    }
                }
            }

            job.setProgressPct(60);
            jobStatusRepository.save(Objects.requireNonNull(job));

            // 6. Objective: maximize coverage and fairness, minimize cost
            LinearExprBuilder objective = LinearExpr.newBuilder();
            for (Employee emp : employees) {
                for (Shift shift : openShifts) {
                    double durationHours = Duration.between(shift.getStartTime(), shift.getEndTime()).toMinutes() / 60.0;
                    long cost = (long) (durationHours * emp.getBaseHourlyRate());
                    // Maximize assignment coverage, weighted by reliability, reduced by cost
                    long weight = 100000L - cost + (long)(emp.getReliabilityScore() * 1000);
                    objective.addTerm(x.get(emp.getId()).get(shift.getId()), weight);
                }
            }
            model.maximize(objective.build());

            // 7. Solve
            CpSolver solver = new CpSolver();
            solver.getParameters().setMaxTimeInSeconds(10.0); // give more time

            job.setProgressPct(80);
            jobStatusRepository.save(Objects.requireNonNull(job));

            CpSolverStatus status = solver.solve(model);
            log.info(">>> CP-SAT solver completed with status: {}", status);

            if (status == CpSolverStatus.OPTIMAL || status == CpSolverStatus.FEASIBLE) {
                int assignedCount = 0;
                for (Shift shift : openShifts) {
                    for (Employee emp : employees) {
                        boolean isAssigned = solver.booleanValue(x.get(emp.getId()).get(shift.getId()));
                        if (isAssigned) {
                            shift.setEmployee(emp);
                            shift.setStatus("PUBLISHED");
                            shiftRepository.save(shift);
                            assignedCount++;
                            break; // at-most-one constraint ensures only one per shift
                        }
                    }
                }
                log.info(">>> Assigned {}/{} shifts via CP-SAT solver", assignedCount, openShifts.size());
            } else {
                log.warn(">>> CP-SAT returned {}. Running greedy fallback...", status);
                runGreedyFallbackScheduler(managerId, employees, openShifts, approvedLeaves);
            }

            job.setProgressPct(100);
            job.setStatus("COMPLETED");
            jobStatusRepository.save(Objects.requireNonNull(job));

        } catch (Throwable t) {
            log.error(">>> OR-Tools threw exception: {}. Running fallback...", t.getMessage(), t);
            try {
                List<Employee> employees = employeeRepository.findByManagerIdOrderByIdAsc(managerId);
                List<Shift> openShifts = shiftRepository.findByManagerIdAndStartTimeBetween(managerId, weekStart, weekEnd);
                if (openShifts.isEmpty()) {
                    openShifts = createSmartDraftShiftsForWeek(weekStart, managerId, employees);
                }
                List<LeaveRequest> approvedLeaves = leaveRequestRepository.findByLeaveDateBetween(
                        weekStart.toLocalDate(), weekEnd.toLocalDate());

                runGreedyFallbackScheduler(managerId, employees, openShifts, approvedLeaves);

                job.setProgressPct(100);
                job.setStatus("COMPLETED");
                jobStatusRepository.save(Objects.requireNonNull(job));
            } catch (Exception fallbackErr) {
                log.error(">>> Fallback scheduler also failed: {}", fallbackErr.getMessage(), fallbackErr);
                job.setStatus("FAILED");
                job.setErrorMessage("Schedule generation failed: " + fallbackErr.getMessage());
                jobStatusRepository.save(Objects.requireNonNull(job));
            }
        }
    }

    private void runGreedyFallbackScheduler(Long managerId, List<Employee> employees, List<Shift> openShifts, List<LeaveRequest> approvedLeaves) {
        log.info(">>> Running Java Greedy Fallback Scheduler with {} employees, {} shifts", employees.size(), openShifts.size());

        // Sort employees by hourly rate (cheapest first for cost efficiency)
        List<Employee> sortedEmployees = new ArrayList<>(employees);
        sortedEmployees.sort(Comparator.comparingDouble(Employee::getBaseHourlyRate));

        // Build leave map: employeeId -> set of leave dates
        Map<Long, Set<java.time.LocalDate>> leaveMap = new HashMap<>();
        for (LeaveRequest leave : approvedLeaves) {
            if ("APPROVED".equals(leave.getStatus()) && leave.getEmployee() != null) {
                leaveMap.computeIfAbsent(leave.getEmployee().getId(), k -> new HashSet<>())
                        .add(leave.getLeaveDate());
            }
        }

        Map<Long, Double> employeeHours = new HashMap<>();
        Map<Long, List<Shift>> employeeShifts = new HashMap<>();
        for (Employee emp : employees) {
            employeeHours.put(emp.getId(), 0.0);
            employeeShifts.put(emp.getId(), new ArrayList<>());
        }

        int assignedCount = 0;
        for (Shift shift : openShifts) {
            double shiftDuration = Duration.between(shift.getStartTime(), shift.getEndTime()).toMinutes() / 60.0;
            Employee selected = null;

            for (Employee emp : sortedEmployees) {
                // Check weekly hours cap
                double currentHours = employeeHours.get(emp.getId());
                if (currentHours + shiftDuration > emp.getMaxHoursPerWeek()) continue;

                // Check role match
                if (emp.getRole() != shift.getRole()) continue;

                // Check leave day
                if (leaveMap.containsKey(emp.getId()) &&
                    leaveMap.get(emp.getId()).contains(shift.getStartTime().toLocalDate())) continue;

                // Check conflicts with already-assigned shifts
                boolean hasConflict = false;
                for (Shift s : employeeShifts.get(emp.getId())) {
                    if (shiftsOverlap(shift, s) || restPeriodTooShort(shift, s, 8) || restPeriodTooShort(s, shift, 8)) {
                        hasConflict = true;
                        break;
                    }
                }
                if (hasConflict) continue;

                selected = emp;
                break;
            }

            if (selected != null) {
                shift.setEmployee(selected);
                shift.setStatus("PUBLISHED");
                shiftRepository.save(shift);
                employeeHours.put(selected.getId(), employeeHours.get(selected.getId()) + shiftDuration);
                employeeShifts.get(selected.getId()).add(shift);
                assignedCount++;
            }
        }
        log.info(">>> Greedy fallback assigned {}/{} shifts", assignedCount, openShifts.size());
    }

    private boolean shiftsOverlap(Shift s1, Shift s2) {
        return s1.getStartTime().isBefore(s2.getEndTime()) && s2.getStartTime().isBefore(s1.getEndTime());
    }

    private boolean restPeriodTooShort(Shift s1, Shift s2, int restHours) {
        if (s1.getEndTime().isBefore(s2.getStartTime())) {
            long restDurationMinutes = Duration.between(s1.getEndTime(), s2.getStartTime()).toMinutes();
            return restDurationMinutes < (restHours * 60);
        }
        return false;
    }

    /**
     * Creates draft shifts that are proportional to the team's actual roles.
     * Each employee gets 1 shift per day (spread across morning/afternoon/evening),
     * ensuring a realistic coverage without creating far more shifts than employees.
     */
    private List<Shift> createSmartDraftShiftsForWeek(LocalDateTime weekStart, Long managerId, List<Employee> employees) {
        log.info(">>> Creating smart draft shifts for {} employees", employees.size());
        List<Shift> shifts = new ArrayList<>();

        // Determine distinct roles in the team
        Map<Role, List<Employee>> byRole = employees.stream()
            .collect(Collectors.groupingBy(Employee::getRole));

        // Standard shift templates: morning (6-14), day (9-17), evening (14-22)
        int[][] shiftTemplates = {
            {6, 14},   // Early shift
            {9, 17},   // Day shift
            {14, 22},  // Evening shift
        };

        // Create shifts across the week such that each employee of a role gets at most 5 shifts (40h max)
        for (Map.Entry<Role, List<Employee>> entry : byRole.entrySet()) {
            Role role = entry.getKey();
            int empCount = entry.getValue().size();
            int templateIdx = 0;

            // Generate shifts for 5 days per employee (40 hours max)
            for (int i = 0; i < empCount; i++) {
                // Pick 5 active days for this employee index to spread coverage across the 7-day week
                for (int d = 0; d < 5; d++) {
                    int day = (i + d) % 7; // staggered across days
                    LocalDateTime dayStart = weekStart.plusDays(day);
                    int[] template = shiftTemplates[templateIdx % shiftTemplates.length];
                    templateIdx++;

                    shifts.add(Shift.builder()
                        .startTime(dayStart.withHour(template[0]).withMinute(0))
                        .endTime(dayStart.withHour(template[1]).withMinute(0))
                        .role(role)
                        .status("DRAFT")
                        .managerId(managerId)
                        .build());
                }
            }
        }

        List<Shift> saved = shiftRepository.saveAll(Objects.requireNonNull(shifts));
        log.info(">>> Created {} draft shifts for the week across all roles", saved.size());
        return saved;
    }
}
