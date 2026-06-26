package com.scheduleiq.backend.controller;

import com.scheduleiq.backend.model.Employee;
import com.scheduleiq.backend.model.JobStatus;
import com.scheduleiq.backend.model.Role;
import com.scheduleiq.backend.model.Shift;
import com.scheduleiq.backend.repository.JobStatusRepository;
import com.scheduleiq.backend.repository.ShiftRepository;
import com.scheduleiq.backend.service.optimization.AutoSchedulerService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/schedule")
@RequiredArgsConstructor
@Slf4j
@CrossOrigin(origins = "*")
public class AutoSchedulerController {

    private final AutoSchedulerService autoSchedulerService;
    private final JobStatusRepository jobStatusRepository;
    private final ShiftRepository shiftRepository;
    private final com.scheduleiq.backend.repository.EmployeeRepository employeeRepository;
    // v2.0: WebSocket broadcast for real-time schedule publishing notifications
    private final SimpMessagingTemplate messagingTemplate;

    private final com.scheduleiq.backend.service.messaging.ScheduleJobPublisher scheduleJobPublisher;

    private Employee getEmployeeForUser(UserDetails userDetails) {
        return employeeRepository.findByEmail(userDetails.getUsername())
                .orElseThrow(() -> new IllegalArgumentException("User not found: " + userDetails.getUsername()));
    }

    private Long getManagerIdForUser(UserDetails userDetails) {
        Employee user = getEmployeeForUser(userDetails);
        return user.getRole() == Role.MANAGER ? user.getId() : user.getManagerId();
    }

    /**
     * POST /api/schedule/generate
     * Kicks off asynchronous AI schedule generation for a manager's team via Redis Message Broker.
     */
    @PostMapping("/generate")
    public ResponseEntity<Map<String, String>> generateSchedule(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime weekStart,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime weekEnd,
            @RequestParam double budgetCap,
            @AuthenticationPrincipal UserDetails userDetails) {

        Employee manager = getEmployeeForUser(userDetails);
        if (manager.getRole() != Role.MANAGER) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "Only managers can generate schedules."));
        }

        String jobId = UUID.randomUUID().toString();
        log.info("Schedule generation requested by manager [{}] for week [{} - {}]. Enqueueing to Redis...", manager.getId(), weekStart, weekEnd);

        // Enqueue the CPU-heavy constraint solver to the Redis Message Broker
        scheduleJobPublisher.publishJob(jobId, weekStart, weekEnd, budgetCap, manager.getId());

        return ResponseEntity.status(HttpStatus.ACCEPTED).body(Map.of(
                "jobId", jobId,
                "status", "PENDING",
                "message", "AI schedule generation started. Poll /api/schedule/job/" + jobId + " for status."
        ));
    }

    /**
     * GET /api/schedule/job/{jobId}
     * Poll the async job status.
     */
    @GetMapping("/job/{jobId}")
    public ResponseEntity<JobStatus> getJobStatus(@PathVariable String jobId) {
        return jobStatusRepository.findById(jobId)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    /**
     * GET /api/schedule/shifts
     * Returns shifts for a date range, scoped to the logged-in user's team.
     * - Managers see all shifts for their team
     * - Employees see only their own assigned shifts
     */
    @GetMapping("/shifts")
    public ResponseEntity<List<Shift>> getShifts(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime start,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime end,
            @AuthenticationPrincipal UserDetails userDetails) {

        Employee user = getEmployeeForUser(userDetails);

        if (user.getRole() == Role.MANAGER) {
            // Managers see all shifts for their team
            List<Shift> shifts = shiftRepository.findByManagerIdAndStartTimeBetween(user.getId(), start, end);
            return ResponseEntity.ok(shifts);
        } else {
            // Employees see only their own PUBLISHED shifts
            Long managerId = user.getManagerId();
            if (managerId == null) {
                return ResponseEntity.ok(List.of());
            }
            List<Shift> allShifts = shiftRepository.findByManagerIdAndStartTimeBetween(managerId, start, end);
            // Filter to only shifts assigned to this employee
            List<Shift> myShifts = allShifts.stream()
                    .filter(s -> s.getEmployee() != null && s.getEmployee().getId().equals(user.getId()))
                    .toList();
            log.debug("Employee [{}] viewing {} shifts in range", user.getId(), myShifts.size());
            return ResponseEntity.ok(myShifts);
        }
    }

    /**
     * POST /api/schedule/publish
     * Marks all ASSIGNED shifts in a date range as PUBLISHED.
     * This makes them visible to employees.
     */
    @PostMapping("/publish")
    @Transactional
    public ResponseEntity<Map<String, Object>> publishSchedule(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime weekStart,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime weekEnd,
            @AuthenticationPrincipal UserDetails userDetails) {

        Employee manager = getEmployeeForUser(userDetails);
        if (manager.getRole() != Role.MANAGER) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "Only managers can publish schedules."));
        }

        List<Shift> shifts = shiftRepository.findByManagerIdAndStartTimeBetween(manager.getId(), weekStart, weekEnd);
        int publishedCount = 0;
        for (Shift shift : shifts) {
            if (shift.getEmployee() != null) {
                shift.setStatus("PUBLISHED");
                shiftRepository.save(shift);
                publishedCount++;
            }
        }

        log.info("Manager [{}] published {} shifts for week [{} - {}]", manager.getId(), publishedCount, weekStart, weekEnd);
        // v2.0: Broadcast schedule publish event — all employee dashboards update in real-time
        messagingTemplate.convertAndSend("/topic/schedule-updates",
                Map.of("managerId", manager.getId(), "publishedCount", publishedCount,
                       "weekStart", weekStart.toString(), "weekEnd", weekEnd.toString(),
                       "message", "New schedule published! Check your upcoming shifts."));
        return ResponseEntity.ok(Map.of(
                "publishedCount", publishedCount,
                "totalShifts", shifts.size(),
                "message", publishedCount + " shifts published successfully."
        ));
    }

    /**
     * PUT /api/schedule/shifts/{id}/assign
     * Assign a specific employee to a shift (manual override).
     */
    @PutMapping("/shifts/{id}/assign")
    @Transactional
    public ResponseEntity<Shift> assignEmployeeToShift(
            @PathVariable Long id,
            @RequestParam Long employeeId) {

        Shift shift = shiftRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Shift not found: " + id));
        Employee employee = employeeRepository.findById(employeeId)
                .orElseThrow(() -> new IllegalArgumentException("Employee not found: " + employeeId));

        shift.setEmployee(employee);
        shift.setNoShowRisk(0.0);
        shift.setStatus("PUBLISHED");

        Shift updated = shiftRepository.save(shift);
        log.info("Shift [{}] manually assigned to employee [{}]", id, employeeId);
        return ResponseEntity.ok(updated);
    }

    /**
     * PUT /api/schedule/shifts/{id}/clock-in
     */
    @PutMapping("/shifts/{id}/clock-in")
    @Transactional
    public ResponseEntity<Shift> clockIn(@PathVariable Long id) {
        Shift shift = shiftRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Shift not found: " + id));
        shift.setActualStartTime(LocalDateTime.now());
        shift.setClockStatus("CLOCKED_IN");
        return ResponseEntity.ok(shiftRepository.save(shift));
    }

    /**
     * PUT /api/schedule/shifts/{id}/clock-out
     */
    @PutMapping("/shifts/{id}/clock-out")
    @Transactional
    public ResponseEntity<Shift> clockOut(@PathVariable Long id) {
        Shift shift = shiftRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Shift not found: " + id));
        shift.setActualEndTime(LocalDateTime.now());
        shift.setClockStatus("CLOCKED_OUT");
        return ResponseEntity.ok(shiftRepository.save(shift));
    }
}
