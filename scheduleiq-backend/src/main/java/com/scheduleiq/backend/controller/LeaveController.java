package com.scheduleiq.backend.controller;

import com.scheduleiq.backend.model.Employee;
import com.scheduleiq.backend.model.LeaveRequest;
import com.scheduleiq.backend.model.Role;
import com.scheduleiq.backend.repository.EmployeeRepository;
import com.scheduleiq.backend.repository.LeaveRequestRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.simp.SimpMessagingTemplate;
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
@Slf4j
@CrossOrigin(origins = "*")
public class LeaveController {

    private final LeaveRequestRepository leaveRequestRepository;
    private final EmployeeRepository employeeRepository;
    // v2.0: WebSocket broadcasting for real-time leave status updates
    private final SimpMessagingTemplate messagingTemplate;

    /**
     * GET /api/leave
     * Manager sees leave requests ONLY for their own team (scoped by managerId).
     */
    @GetMapping
    @PreAuthorize("hasRole('MANAGER')")
    public ResponseEntity<List<LeaveRequest>> getAllLeaves(
            @AuthenticationPrincipal UserDetails userDetails) {
        return employeeRepository.findByEmail(userDetails.getUsername())
                .map(manager -> {
                    List<LeaveRequest> teamLeaves = leaveRequestRepository.findByEmployeeManagerId(manager.getId());
                    log.debug("Manager [{}] fetching {} leave requests for their team", manager.getId(), teamLeaves.size());
                    return ResponseEntity.ok(teamLeaves);
                })
                .orElse(ResponseEntity.ok(List.of()));
    }

    /**
     * GET /api/leave/my
     * Employee sees their own leave requests.
     */
    @GetMapping("/my")
    @Transactional
    public ResponseEntity<List<LeaveRequest>> getMyLeaves(@AuthenticationPrincipal UserDetails userDetails) {
        return employeeRepository.findByEmail(userDetails.getUsername())
                .map(emp -> ResponseEntity.ok(leaveRequestRepository.findByEmployee(emp)))
                .orElse(ResponseEntity.notFound().build());
    }

    /**
     * POST /api/leave
     * Employee submits a leave request.
     */
    @PostMapping
    @Transactional
    public ResponseEntity<?> requestLeave(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestBody Map<String, String> request) {

        return employeeRepository.findByEmail(userDetails.getUsername())
                .map(emp -> {
                    String leaveDateStr = request.get("leaveDate");
                    if (leaveDateStr == null || leaveDateStr.isBlank()) {
                        return ResponseEntity.badRequest()
                                .body(Map.of("error", "Leave date is required."));
                    }

                    LeaveRequest leave = LeaveRequest.builder()
                            .employee(emp)
                            .leaveDate(LocalDate.parse(leaveDateStr))
                            .reason(request.getOrDefault("reason", "Personal"))
                            .status("PENDING")
                            .build();

                    LeaveRequest saved = leaveRequestRepository.save(leave);
                    log.info("Employee [{}] submitted leave request for date [{}]", emp.getId(), leaveDateStr);
                    return ResponseEntity.status(HttpStatus.CREATED).body(saved);
                })
                .orElse(ResponseEntity.notFound().build());
    }

    /**
     * PATCH /api/leave/{id}/approve
     * Manager approves a leave request.
     */
    @PatchMapping("/{id}/approve")
    @PreAuthorize("hasRole('MANAGER')")
    @Transactional
    @CacheEvict(value = "leaveRequests", allEntries = true)
    public ResponseEntity<LeaveRequest> approveLeave(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetails userDetails) {
        return leaveRequestRepository.findById(id)
                .map(leave -> {
                    leave.setStatus("APPROVED");
                    LeaveRequest saved = leaveRequestRepository.save(leave);
                    log.info("Leave [{}] approved by manager for employee [{}]",
                            id, leave.getEmployee() != null ? leave.getEmployee().getId() : "unknown");
                    // v2.0: Real-time broadcast to employees — no manual sync needed
                    messagingTemplate.convertAndSend("/topic/leave-updates",
                            Map.of("leaveId", id, "status", "APPROVED",
                                   "employeeId", leave.getEmployee() != null ? leave.getEmployee().getId() : -1));
                    return ResponseEntity.ok(saved);
                })
                .orElse(ResponseEntity.notFound().build());
    }

    /**
     * PATCH /api/leave/{id}/reject
     * Manager rejects a leave request.
     */
    @PatchMapping("/{id}/reject")
    @PreAuthorize("hasRole('MANAGER')")
    @Transactional
    @CacheEvict(value = "leaveRequests", allEntries = true)
    public ResponseEntity<LeaveRequest> rejectLeave(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetails userDetails) {
        return leaveRequestRepository.findById(id)
                .map(leave -> {
                    leave.setStatus("REJECTED");
                    LeaveRequest saved = leaveRequestRepository.save(leave);
                    log.info("Leave [{}] rejected by manager", id);
                    // v2.0: Real-time broadcast
                    messagingTemplate.convertAndSend("/topic/leave-updates",
                            Map.of("leaveId", id, "status", "REJECTED",
                                   "employeeId", leave.getEmployee() != null ? leave.getEmployee().getId() : -1));
                    return ResponseEntity.ok(saved);
                })
                .orElse(ResponseEntity.notFound().build());
    }
}
