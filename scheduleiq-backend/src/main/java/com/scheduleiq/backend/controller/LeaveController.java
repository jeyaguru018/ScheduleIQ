package com.scheduleiq.backend.controller;

import com.scheduleiq.backend.model.LeaveRequest;
import com.scheduleiq.backend.repository.EmployeeRepository;
import com.scheduleiq.backend.repository.LeaveRequestRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/leave")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class LeaveController {

    private final LeaveRequestRepository leaveRequestRepository;
    private final EmployeeRepository employeeRepository;

    /** GET /api/leave — Manager sees all leave requests */
    @GetMapping
    @PreAuthorize("hasRole('MANAGER')")
    public ResponseEntity<List<LeaveRequest>> getAllLeaves() {
        return ResponseEntity.ok(leaveRequestRepository.findAll());
    }

    /** GET /api/leave/my — Employee sees their own leave requests */
    @GetMapping("/my")
    @Transactional
    public ResponseEntity<List<LeaveRequest>> getMyLeaves(@AuthenticationPrincipal UserDetails userDetails) {
        return employeeRepository.findByEmail(userDetails.getUsername())
                .map(emp -> ResponseEntity.ok(leaveRequestRepository.findByEmployee(emp)))
                .orElse(ResponseEntity.notFound().build());
    }

    /** POST /api/leave — Employee submits a leave request */
    @PostMapping
    @Transactional
    public ResponseEntity<?> requestLeave(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestBody Map<String, String> request) {

        return employeeRepository.findByEmail(userDetails.getUsername())
                .map(emp -> {
                    LeaveRequest leave = LeaveRequest.builder()
                            .employee(emp)
                            .leaveDate(LocalDate.parse(request.get("leaveDate")))
                            .reason(request.getOrDefault("reason", "Personal"))
                            .status("PENDING")
                            .build();
                    return ResponseEntity.status(HttpStatus.CREATED)
                            .body(leaveRequestRepository.save(leave));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    /** PATCH /api/leave/{id}/approve — Manager approves a leave */
    @PatchMapping("/{id}/approve")
    @PreAuthorize("hasRole('MANAGER')")
    @Transactional
    public ResponseEntity<LeaveRequest> approveLeave(@PathVariable Long id) {
        return leaveRequestRepository.findById(id)
                .map(leave -> {
                    leave.setStatus("APPROVED");
                    return ResponseEntity.ok(leaveRequestRepository.save(leave));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    /** PATCH /api/leave/{id}/reject — Manager rejects a leave */
    @PatchMapping("/{id}/reject")
    @PreAuthorize("hasRole('MANAGER')")
    @Transactional
    public ResponseEntity<LeaveRequest> rejectLeave(@PathVariable Long id) {
        return leaveRequestRepository.findById(id)
                .map(leave -> {
                    leave.setStatus("REJECTED");
                    return ResponseEntity.ok(leaveRequestRepository.save(leave));
                })
                .orElse(ResponseEntity.notFound().build());
    }
}
