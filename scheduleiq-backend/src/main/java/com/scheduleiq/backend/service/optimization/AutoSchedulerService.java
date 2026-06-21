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
            System.out.println(">>> Loading native Google OR-Tools libraries...");
            Loader.loadNativeLibraries(); // Mandatory step for loading C++ JNI wrappers!

            // 1. Fetch available workers and open shifts
            List<Employee> employees = new java.util.ArrayList<>();
            Employee manager = employeeRepository.findById(managerId).orElse(null);
            if (manager != null) {
                employees.add(manager);
            }
            employees.addAll(employeeRepository.findByManagerIdOrderByIdAsc(managerId));

            List<Shift> openShifts = shiftRepository.findByManagerIdAndStartTimeBetween(managerId, weekStart, weekEnd);

            if (openShifts.isEmpty()) {
                // If there are no pre-seeded shifts, we create some skeleton draft shifts for the week
                openShifts = createDraftShiftsForWeek(weekStart, managerId);
            }

            List<LeaveRequest> approvedLeaves = leaveRequestRepository.findByLeaveDateBetween(
                    weekStart.toLocalDate(), weekEnd.toLocalDate());

            job.setProgressPct(30);
            jobStatusRepository.save(Objects.requireNonNull(job));

            // 2. Initialize CP-SAT Constraint Programming Model
            CpModel model = new CpModel();

            // Decision variable mapping: Map<EmployeeId, Map<ShiftId, Literal>>
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

            // 3. Define Hard Constraints

            // Rule A: Single coverage - at most one employee assigned to each shift
            for (Shift shift : openShifts) {
                List<Literal> shiftAssignees = new ArrayList<>();
                for (Employee emp : employees) {
                    shiftAssignees.add(x.get(emp.getId()).get(shift.getId()));
                }
                model.addAtMostOne(shiftAssignees.toArray(new Literal[0]));
            }

            // Rule B: Overlap prevention - a worker cannot work overlapping shifts
            for (Employee emp : employees) {
                for (int i = 0; i < openShifts.size(); i++) {
                    Shift s1 = openShifts.get(i);
                    for (int j = i + 1; j < openShifts.size(); j++) {
                        Shift s2 = openShifts.get(j);
                        if (shiftsOverlap(s1, s2)) {
                            model.addImplication(x.get(emp.getId()).get(s1.getId()), 
                                    x.get(emp.getId()).get(s2.getId()).not());
                        }
                    }
                }
            }

            // Rule C: Leave requests - a worker cannot be scheduled on their leave day
            for (LeaveRequest leave : approvedLeaves) {
                if (!"APPROVED".equals(leave.getStatus())) continue;
                Employee emp = leave.getEmployee();
                if (emp == null || !employees.contains(emp)) continue;
                for (Shift shift : openShifts) {
                    if (shift.getStartTime().toLocalDate().equals(leave.getLeaveDate())) {
                        model.addEquality(x.get(emp.getId()).get(shift.getId()), 0);
                    }
                }
            }

            // Rule D: Mandatory 8-hour rest periods between consecutive shifts
            for (Employee emp : employees) {
                for (Shift s1 : openShifts) {
                    for (Shift s2 : openShifts) {
                        if (s1.getId().equals(s2.getId())) continue;
                        if (restPeriodTooShort(s1, s2, 8)) {
                            model.addImplication(x.get(emp.getId()).get(s1.getId()), 
                                    x.get(emp.getId()).get(s2.getId()).not());
                        }
                    }
                }
            }

            // Rule E: Maximum weekly hours limitations
            for (Employee emp : employees) {
                LinearExprBuilder totalHours = LinearExpr.newBuilder();
                for (Shift shift : openShifts) {
                    double durationHours = Duration.between(shift.getStartTime(), shift.getEndTime()).toMinutes() / 60.0;
                    totalHours.addTerm(x.get(emp.getId()).get(shift.getId()), (long) durationHours);
                }
                model.addLessOrEqual(totalHours.build(), emp.getMaxHoursPerWeek());
            }

            job.setProgressPct(60);
            jobStatusRepository.save(Objects.requireNonNull(job));

            // 4. Objective Formulation (Soft constraints)
            LinearExprBuilder objective = LinearExpr.newBuilder();
            for (Employee emp : employees) {
                for (Shift shift : openShifts) {
                    double durationHours = Duration.between(shift.getStartTime(), shift.getEndTime()).toMinutes() / 60.0;
                    long cost = (long) (durationHours * emp.getBaseHourlyRate());
                    
                    long weight = 100000L - cost + (long)(emp.getReliabilityScore() * 1000);
                    objective.addTerm(x.get(emp.getId()).get(shift.getId()), weight);
                }
            }
            model.maximize(objective.build());

            // 5. Solve CP-SAT model
            CpSolver solver = new CpSolver();
            solver.getParameters().setMaxTimeInSeconds(5.0);
            
            job.setProgressPct(80);
            jobStatusRepository.save(Objects.requireNonNull(job));

            CpSolverStatus status = solver.solve(model);

            if (status == CpSolverStatus.OPTIMAL || status == CpSolverStatus.FEASIBLE) {
                System.out.println(">>> Optimizer finished. Status: " + status);
                
                for (Shift shift : openShifts) {
                    for (Employee emp : employees) {
                        boolean isAssigned = solver.booleanValue(x.get(emp.getId()).get(shift.getId()));
                        if (isAssigned) {
                            shift.setEmployee(emp);
                            shift.setStatus("PUBLISHED");
                            shiftRepository.save(shift);
                        }
                    }
                }

                job.setProgressPct(100);
                job.setStatus("COMPLETED");
                jobStatusRepository.save(Objects.requireNonNull(job));
            } else {
                System.out.println(">>> Solver returned status FAILED or INFEASIBLE. Running fallback scheduler...");
                runGreedyFallbackScheduler(managerId, employees, openShifts, approvedLeaves);
                job.setProgressPct(100);
                job.setStatus("COMPLETED");
                jobStatusRepository.save(Objects.requireNonNull(job));
            }

        } catch (Throwable t) {
            System.err.println(">>> OR-Tools solver threw exception/error: " + t.getMessage() + ". Running fallback scheduler...");
            try {
                List<Employee> employees = new java.util.ArrayList<>();
                Employee manager = employeeRepository.findById(managerId).orElse(null);
                if (manager != null) {
                    employees.add(manager);
                }
                employees.addAll(employeeRepository.findByManagerIdOrderByIdAsc(managerId));

                List<Shift> openShifts = shiftRepository.findByManagerIdAndStartTimeBetween(managerId, weekStart, weekEnd);
                if (openShifts.isEmpty()) {
                    openShifts = createDraftShiftsForWeek(weekStart, managerId);
                }

                List<LeaveRequest> approvedLeaves = leaveRequestRepository.findByLeaveDateBetween(
                        weekStart.toLocalDate(), weekEnd.toLocalDate());

                runGreedyFallbackScheduler(managerId, employees, openShifts, approvedLeaves);

                job.setProgressPct(100);
                job.setStatus("COMPLETED");
                jobStatusRepository.save(Objects.requireNonNull(job));
            } catch (Exception fallbackErr) {
                fallbackErr.printStackTrace();
                job.setStatus("FAILED");
                job.setErrorMessage("Fallback scheduler failed: " + fallbackErr.getMessage());
                jobStatusRepository.save(Objects.requireNonNull(job));
            }
        }
    }

    private void runGreedyFallbackScheduler(Long managerId, List<Employee> employees, List<Shift> openShifts, List<LeaveRequest> approvedLeaves) {
        System.out.println(">>> Running Java Greedy Fallback Scheduler...");
        
        List<Employee> sortedEmployees = new ArrayList<>(employees);
        sortedEmployees.sort(Comparator.comparingDouble(Employee::getBaseHourlyRate));
        
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
        
        for (Shift shift : openShifts) {
            double shiftDuration = Duration.between(shift.getStartTime(), shift.getEndTime()).toMinutes() / 60.0;
            
            Employee selected = null;
            for (Employee emp : sortedEmployees) {
                if (emp.getRole() == Role.MANAGER && sortedEmployees.size() > 1) {
                    continue;
                }
                
                double currentHours = employeeHours.get(emp.getId());
                if (currentHours + shiftDuration > emp.getMaxHoursPerWeek()) {
                    continue;
                }
                
                if (leaveMap.containsKey(emp.getId()) && 
                    leaveMap.get(emp.getId()).contains(shift.getStartTime().toLocalDate())) {
                    continue;
                }
                
                boolean hasConflict = false;
                for (Shift s : employeeShifts.get(emp.getId())) {
                    if (shiftsOverlap(shift, s) || restPeriodTooShort(shift, s, 8) || restPeriodTooShort(s, shift, 8)) {
                        hasConflict = true;
                        break;
                    }
                }
                if (hasConflict) {
                    continue;
                }
                
                selected = emp;
                break;
            }
            
            if (selected != null) {
                shift.setEmployee(selected);
                shift.setStatus("PUBLISHED");
                shiftRepository.save(shift);
                
                employeeHours.put(selected.getId(), employeeHours.get(selected.getId()) + shiftDuration);
                employeeShifts.get(selected.getId()).add(shift);
            }
        }
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

    // Creates skeleton shifts for mock target week if no pre-generated roster exists
    private List<Shift> createDraftShiftsForWeek(LocalDateTime weekStart, Long managerId) {
        List<Shift> shifts = new ArrayList<>();
        for (int day = 0; day < 7; day++) {
            LocalDateTime dayStart = weekStart.plusDays(day);
            
            shifts.add(Shift.builder()
                    .startTime(dayStart.withHour(9).withMinute(0))
                    .endTime(dayStart.withHour(17).withMinute(0))
                    .role(Role.CASHIER)
                    .status("DRAFT")
                    .managerId(managerId)
                    .build());

            shifts.add(Shift.builder()
                    .startTime(dayStart.withHour(6).withMinute(0))
                    .endTime(dayStart.withHour(14).withMinute(0))
                    .role(Role.STOCKER)
                    .status("DRAFT")
                    .managerId(managerId)
                    .build());

            shifts.add(Shift.builder()
                    .startTime(dayStart.withHour(14).withMinute(0))
                    .endTime(dayStart.withHour(22).withMinute(0))
                    .role(Role.CASHIER)
                    .status("DRAFT")
                    .managerId(managerId)
                    .build());
        }
        return shiftRepository.saveAll(Objects.requireNonNull(shifts));
    }
}
