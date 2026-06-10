package com.scheduleiq.backend.controller;

import com.scheduleiq.backend.model.Employee;
import com.scheduleiq.backend.model.SwapRequest;
import com.scheduleiq.backend.repository.EmployeeRepository;
import com.scheduleiq.backend.repository.SwapRequestRepository;
import com.scheduleiq.backend.service.core.ShiftSwapService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/swaps")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class ShiftSwapController {

    private final ShiftSwapService shiftSwapService;
    private final SwapRequestRepository swapRequestRepository;
    private final EmployeeRepository employeeRepository;

    @PostMapping
    public ResponseEntity<?> requestSwap(
            @RequestBody Map<String, Object> body,
            @AuthenticationPrincipal UserDetails userDetails) {
        
        Long shiftId = Long.parseLong(body.get("shiftId").toString());
        
        Employee employee = employeeRepository.findByEmail(userDetails.getUsername())
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        
        SwapRequest request = shiftSwapService.createSwapRequest(shiftId, employee.getId());
        return ResponseEntity.ok(request);
    }

    @PatchMapping("/{id}/approve")
    public ResponseEntity<?> approveSwap(
            @PathVariable Long id,
            @RequestBody(required = false) Map<String, Object> body,
            @AuthenticationPrincipal UserDetails userDetails) {
        
        Employee employee = employeeRepository.findByEmail(userDetails.getUsername())
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        Long targetShiftId = null;
        if (body != null && body.containsKey("targetShiftId") && body.get("targetShiftId") != null) {
            targetShiftId = Long.parseLong(body.get("targetShiftId").toString());
        }
        
        try {
            shiftSwapService.approveSwap(id, employee.getId(), targetShiftId);
            return ResponseEntity.ok(Map.of("message", "Shift swap approved and synced across all schedules successfully!"));
        } catch (IllegalStateException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping
    public ResponseEntity<List<SwapRequest>> listAllSwaps() {
        return ResponseEntity.ok(swapRequestRepository.findAll());
    }
}
