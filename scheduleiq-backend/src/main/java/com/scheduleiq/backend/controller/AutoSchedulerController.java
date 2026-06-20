package com.scheduleiq.backend.controller;

import com.scheduleiq.backend.model.Employee;
import com.scheduleiq.backend.model.JobStatus;
import com.scheduleiq.backend.model.Shift;
import com.scheduleiq.backend.repository.JobStatusRepository;
import com.scheduleiq.backend.repository.ShiftRepository;
import com.scheduleiq.backend.service.optimization.AutoSchedulerService;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/schedule")
@RequiredArgsConstructor
@CrossOrigin(origins = "*") // Cross-origin safety for React client
public class AutoSchedulerController {

    private final AutoSchedulerService autoSchedulerService;
    private final JobStatusRepository jobStatusRepository;
    private final ShiftRepository shiftRepository;
    private final com.scheduleiq.backend.repository.EmployeeRepository employeeRepository;

    @PostMapping("/generate")
    public ResponseEntity<Map<String, String>> generateSchedule(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime weekStart,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime weekEnd,
            @RequestParam double budgetCap) {
        
        String jobId = UUID.randomUUID().toString();
        
        // Immediately kick off the CPU-heavy constraint solver asynchronously!
        autoSchedulerService.generateOptimalRoster(jobId, weekStart, weekEnd, budgetCap);

        // Instantly return 202 Accepted with the tracking identifier
        java.util.Map<String, String> response = new java.util.HashMap<>();
        response.put("jobId", java.util.Objects.requireNonNull(jobId));
        response.put("status", "PENDING");
        response.put("message", "Optimizing workforce roster in background solver thread...");
        return ResponseEntity.status(HttpStatus.ACCEPTED).body(response);
    }

    @GetMapping("/job/{jobId}")
    public ResponseEntity<JobStatus> getJobStatus(@PathVariable String jobId) {
        return jobStatusRepository.findById(java.util.Objects.requireNonNull(jobId))
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/shifts")
    public ResponseEntity<List<Shift>> getShifts(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime start,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime end) {
        
        List<Shift> shifts = shiftRepository.findByStartTimeBetween(start, end);
        return ResponseEntity.ok(shifts);
    }

    @PutMapping("/shifts/{id}/assign")
    @Transactional
    public ResponseEntity<Shift> assignEmployeeToShift(
            @PathVariable Long id,
            @RequestParam Long employeeId) {
        
        Shift shift = shiftRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Shift not found"));
        Employee employee = employeeRepository.findById(employeeId)
                .orElseThrow(() -> new IllegalArgumentException("Employee not found"));
        
        shift.setEmployee(employee);
        shift.setNoShowRisk(0.0); // Reset no show risk upon re-assignment
        shift.setStatus("PUBLISHED");
        
        Shift updated = shiftRepository.save(shift);
        return ResponseEntity.ok(updated);
    }

    @PutMapping("/shifts/{id}/clock-in")
    @Transactional
    public ResponseEntity<Shift> clockIn(@PathVariable Long id) {
        Shift shift = shiftRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Shift not found"));
        shift.setActualStartTime(LocalDateTime.now());
        shift.setClockStatus("CLOCKED_IN");
        return ResponseEntity.ok(shiftRepository.save(shift));
    }

    @PutMapping("/shifts/{id}/clock-out")
    @Transactional
    public ResponseEntity<Shift> clockOut(@PathVariable Long id) {
        Shift shift = shiftRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Shift not found"));
        shift.setActualEndTime(LocalDateTime.now());
        shift.setClockStatus("CLOCKED_OUT");
        return ResponseEntity.ok(shiftRepository.save(shift));
    }
}
