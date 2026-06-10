package com.scheduleiq.backend.service.optimization;

import com.google.ortools.Loader;
import com.google.ortools.sat.*;
import com.scheduleiq.backend.model.*;
import com.scheduleiq.backend.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.*;
import java.util.Objects;

@Service
@RequiredArgsConstructor
public class AutoSchedulerService {

    private final EmployeeRepository employeeRepository;
    private final ShiftRepository shiftRepository;
    private final LeaveRequestRepository leaveRequestRepository;
    private final JobStatusRepository jobStatusRepository;

    @Async // Runs asynchronously in the background task executor!
    @Transactional
    public void generateOptimalRoster(String jobId, LocalDateTime weekStart, LocalDateTime weekEnd, double budgetCap) {
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
            List<Employee> employees = employeeRepository.findAll();
            List<Shift> openShifts = shiftRepository.findByStartTimeBetween(weekStart, weekEnd);

            if (openShifts.isEmpty()) {
                // If there are no pre-seeded shifts, we create some skeleton draft shifts for the week
                openShifts = createDraftShiftsForWeek(weekStart);
            }

            List<LeaveRequest> approvedLeaves = leaveRequestRepository.findByLeaveDateBetween(
                    weekStart.toLocalDate(), weekEnd.toLocalDate());

            job.setProgressPct(30);
            jobStatusRepository.save(Objects.requireNonNull(job));

            // 2. Initialize CP-SAT Constraint Programming Model
            CpModel model = new CpModel();

            // Decision variable mapping: Map<EmployeeId, Map<ShiftId, Literal>>
            // x[e][s] is a boolean variable which is 1 if employee 'e' is scheduled for shift 's', and 0 otherwise.
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
                            // s1 and s2 overlap: x[e][s1] + x[e][s2] <= 1
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
                for (Shift shift : openShifts) {
                    if (shift.getStartTime().toLocalDate().equals(leave.getLeaveDate())) {
                        // Force assignment variable to 0
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
                            // Force: cannot work both shifts
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
            // Objective: Maximize fairness score and minimize labor costs
            LinearExprBuilder objective = LinearExpr.newBuilder();
            for (Employee emp : employees) {
                for (Shift shift : openShifts) {
                    double durationHours = Duration.between(shift.getStartTime(), shift.getEndTime()).toMinutes() / 60.0;
                    long cost = (long) (durationHours * emp.getBaseHourlyRate());
                    
                    // Standard cost minimization combined with keeping highly reliable employees active
                    long weight = (long) (emp.getReliabilityScore() * 100 - cost);
                    objective.addTerm(x.get(emp.getId()).get(shift.getId()), weight);
                }
            }
            model.maximize(objective.build());

            // 5. Solve CP-SAT model
            CpSolver solver = new CpSolver();
            solver.getParameters().setMaxTimeInSeconds(5.0); // 5-second limit to handle scalability cleanly
            
            job.setProgressPct(80);
            jobStatusRepository.save(Objects.requireNonNull(job));

            CpSolverStatus status = solver.solve(model);

            if (status == CpSolverStatus.OPTIMAL || status == CpSolverStatus.FEASIBLE) {
                System.out.println(">>> Optimizer finished. Status: " + status);
                
                // Write output back to PostgreSQL database ledger
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
                job.setStatus("FAILED");
                job.setErrorMessage("Optimization infeasible under current constraints.");
                jobStatusRepository.save(Objects.requireNonNull(job));
            }

        } catch (Exception e) {
            e.printStackTrace();
            job.setStatus("FAILED");
            job.setErrorMessage(e.getMessage());
            jobStatusRepository.save(Objects.requireNonNull(job));
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
    private List<Shift> createDraftShiftsForWeek(LocalDateTime weekStart) {
        List<Shift> shifts = new ArrayList<>();
        // Generate daily shifts (Morning: 9am-5pm, Afternoon: 1pm-9pm, Night: 5pm-1am) for Cashier and Stocker roles
        for (int day = 0; day < 7; day++) {
            LocalDateTime dayStart = weekStart.plusDays(day);
            
            // Morning Shift
            shifts.add(Shift.builder()
                    .startTime(dayStart.withHour(9).withMinute(0))
                    .endTime(dayStart.withHour(17).withMinute(0))
                    .role(Role.CASHIER)
                    .status("DRAFT")
                    .build());

            // Stocker Shift
            shifts.add(Shift.builder()
                    .startTime(dayStart.withHour(6).withMinute(0))
                    .endTime(dayStart.withHour(14).withMinute(0))
                    .role(Role.STOCKER)
                    .status("DRAFT")
                    .build());

            // Evening Shift
            shifts.add(Shift.builder()
                    .startTime(dayStart.withHour(14).withMinute(0))
                    .endTime(dayStart.withHour(22).withMinute(0))
                    .role(Role.CASHIER)
                    .status("DRAFT")
                    .build());
        }
        return shiftRepository.saveAll(Objects.requireNonNull(shifts));
    }
}
