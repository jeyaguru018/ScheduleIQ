package com.scheduleiq.backend.service.core;

import com.scheduleiq.backend.model.*;
import com.scheduleiq.backend.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;
import java.util.Objects;

@Service
@RequiredArgsConstructor
public class ShiftSwapService {

    private final SwapRequestRepository swapRequestRepository;
    private final ShiftRepository shiftRepository;
    private final EmployeeRepository employeeRepository;
    private final LeaveRequestRepository leaveRequestRepository;

    @Transactional
    public SwapRequest createSwapRequest(Long requesterShiftId, Long requesterId) {
        Shift shift = shiftRepository.findById(Objects.requireNonNull(requesterShiftId))
                .orElseThrow(() -> new IllegalArgumentException("Shift not found"));
        Employee requester = employeeRepository.findById(Objects.requireNonNull(requesterId))
                .orElseThrow(() -> new IllegalArgumentException("Employee not found"));

        if (!shift.getEmployee().getId().equals(requester.getId())) {
            throw new IllegalStateException("You can only request swaps for shifts assigned to you!");
        }

        shift.setStatus("WAITING_SWAP");
        shiftRepository.save(shift);

        SwapRequest request = SwapRequest.builder()
                .requesterShift(shift)
                .requester(requester)
                .status("PENDING")
                .build();

        return swapRequestRepository.save(Objects.requireNonNull(request));
    }

    @Transactional
    public void approveSwap(Long swapRequestId, Long acceptorEmployeeId, Long acceptorShiftId) {
        SwapRequest request = swapRequestRepository.findById(Objects.requireNonNull(swapRequestId))
                .orElseThrow(() -> new IllegalArgumentException("Swap request not found"));
        Employee acceptor = employeeRepository.findById(Objects.requireNonNull(acceptorEmployeeId))
                .orElseThrow(() -> new IllegalArgumentException("Employee not found"));
        Shift requesterShift = request.getRequesterShift();

        // 1. Fetch Acceptor Shift if it's a peer-to-peer exchange, otherwise it's a cover/pickup request
        Shift acceptorShift = null;
        if (acceptorShiftId != null) {
            acceptorShift = shiftRepository.findById(acceptorShiftId)
                    .orElseThrow(() -> new IllegalArgumentException("Acceptor shift not found"));
        }

        // 2. Perform Strict Validation Checks
        validateSwapFeasibility(requesterShift, acceptorShift, request.getRequester(), acceptor);

        // 3. Swap assignments in a single atomic transaction!
        Employee requester = request.getRequester();
        
        // Requester Shift gets assigned to Acceptor
        requesterShift.setEmployee(acceptor);
        requesterShift.setStatus("PUBLISHED");
        shiftRepository.save(requesterShift); // Trigger JPA @Version check!

        if (acceptorShift != null) {
            // Acceptor Shift gets assigned to Requester
            acceptorShift.setEmployee(requester);
            acceptorShift.setStatus("PUBLISHED");
            shiftRepository.save(acceptorShift); // Trigger JPA @Version check!
            request.setTargetShift(acceptorShift);
        }

        request.setTargetEmployee(acceptor);
        request.setStatus("APPROVED");
        swapRequestRepository.save(Objects.requireNonNull(request));
    }

    private void validateSwapFeasibility(Shift s1, Shift s2, Employee emp1, Employee emp2) {
        // A. Check Role requirements
        if (emp2.getRole() != s1.getRole() && emp2.getRole() != Role.LEAD_CASHIER) {
            throw new IllegalStateException(emp2.getName() + " is not qualified for the " + s1.getRole() + " role!");
        }
        if (s2 != null && emp1.getRole() != s2.getRole() && emp1.getRole() != Role.LEAD_CASHIER) {
            throw new IllegalStateException(emp1.getName() + " is not qualified for the " + s2.getRole() + " role!");
        }

        // B. Check scheduling overlaps for Emp2 (accepting Shift s1)
        List<Shift> emp2Shifts = shiftRepository.findByEmployeeIdAndStartTimeBetween(
                emp2.getId(), s1.getStartTime().minusHours(12), s1.getEndTime().plusHours(12));
        for (Shift s : emp2Shifts) {
            if (s.getId().equals(s1.getId())) continue;
            if (s2 != null && s.getId().equals(s2.getId())) continue; // s2 will be traded away, so no overlap concern
            if (shiftsOverlap(s, s1)) {
                throw new IllegalStateException("Swap fails: Overlapping schedule detected for " + emp2.getName());
            }
        }

        // C. Check overlaps for Emp1 (accepting Shift s2)
        if (s2 != null) {
            List<Shift> emp1Shifts = shiftRepository.findByEmployeeIdAndStartTimeBetween(
                    emp1.getId(), s2.getStartTime().minusHours(12), s2.getEndTime().plusHours(12));
            for (Shift s : emp1Shifts) {
                if (s.getId().equals(s2.getId())) continue;
                if (s.getId().equals(s1.getId())) continue; // s1 will be traded away
                if (shiftsOverlap(s, s2)) {
                    throw new IllegalStateException("Swap fails: Overlapping schedule detected for " + emp1.getName());
                }
            }
        }

        // D. Check Leave status
        List<LeaveRequest> leaveRequests1 = leaveRequestRepository.findByEmployeeId(emp1.getId());
        List<LeaveRequest> leaveRequests2 = leaveRequestRepository.findByEmployeeId(emp2.getId());

        if (s2 != null) {
            for (LeaveRequest leave : leaveRequests1) {
                if ("APPROVED".equals(leave.getStatus()) && leave.getLeaveDate().equals(s2.getStartTime().toLocalDate())) {
                    throw new IllegalStateException("Swap fails: " + emp1.getName() + " has approved leave on this date!");
                }
            }
        }

        for (LeaveRequest leave : leaveRequests2) {
            if ("APPROVED".equals(leave.getStatus()) && leave.getLeaveDate().equals(s1.getStartTime().toLocalDate())) {
                throw new IllegalStateException("Swap fails: " + emp2.getName() + " has approved leave on this date!");
            }
        }
    }

    private boolean shiftsOverlap(Shift s1, Shift s2) {
        return s1.getStartTime().isBefore(s2.getEndTime()) && s2.getStartTime().isBefore(s1.getEndTime());
    }
}
