package com.scheduleiq.backend.service.optimization;

import com.scheduleiq.backend.model.*;
import com.scheduleiq.backend.repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

@ExtendWith(MockitoExtension.class)
public class AutoSchedulerServiceTest {

    @Mock
    private EmployeeRepository employeeRepository;
    @Mock
    private ShiftRepository shiftRepository;
    @Mock
    private LeaveRequestRepository leaveRequestRepository;
    @Mock
    private JobStatusRepository jobStatusRepository;

    @InjectMocks
    private AutoSchedulerService schedulerService;

    private Employee cashier;
    private Employee stocker;

    @BeforeEach
    void setUp() {
        cashier = Employee.builder()
                .id(1L)
                .name("John")
                .role(Role.CASHIER)
                .maxHoursPerWeek(40)
                .baseHourlyRate(15.0)
                .build();

        stocker = Employee.builder()
                .id(2L)
                .name("Alice")
                .role(Role.STOCKER)
                .maxHoursPerWeek(20)
                .baseHourlyRate(16.0)
                .build();
    }

    @Test
    void testRestPeriodTooShort_Violates8HourRule() {
        Shift s1 = Shift.builder()
                .startTime(LocalDateTime.of(2026, 6, 1, 14, 0))
                .endTime(LocalDateTime.of(2026, 6, 1, 22, 0))
                .build();

        Shift s2 = Shift.builder()
                .startTime(LocalDateTime.of(2026, 6, 2, 4, 0))
                .endTime(LocalDateTime.of(2026, 6, 2, 12, 0))
                .build();

        // 22:00 to 04:00 is only 6 hours of rest, violates 8 hour minimum
        assertTrue(schedulerService.restPeriodTooShort(s1, s2, 8), "Rest period of 6 hours should be flagged as too short");
    }

    @Test
    void testRestPeriodTooShort_ValidRest() {
        Shift s1 = Shift.builder()
                .startTime(LocalDateTime.of(2026, 6, 1, 14, 0))
                .endTime(LocalDateTime.of(2026, 6, 1, 22, 0))
                .build();

        Shift s2 = Shift.builder()
                .startTime(LocalDateTime.of(2026, 6, 2, 9, 0))
                .endTime(LocalDateTime.of(2026, 6, 2, 17, 0))
                .build();

        // 22:00 to 09:00 is 11 hours of rest, valid
        assertFalse(schedulerService.restPeriodTooShort(s1, s2, 8), "Rest period of 11 hours should be valid");
    }

    @Test
    void testGreedyFallback_RoleMismatchRejection() {
        List<Employee> employees = List.of(cashier);
        List<Shift> shifts = new ArrayList<>();
        
        // A stocker shift, but we only have a cashier available
        Shift stockerShift = Shift.builder()
                .id(100L)
                .role(Role.STOCKER)
                .startTime(LocalDateTime.of(2026, 6, 1, 9, 0))
                .endTime(LocalDateTime.of(2026, 6, 1, 17, 0))
                .status("DRAFT")
                .build();
        shifts.add(stockerShift);

        schedulerService.runGreedyFallbackScheduler(1L, employees, shifts, new ArrayList<>());

        // The stocker shift should remain unassigned because role matching is strictly enforced
        assertNull(stockerShift.getEmployee(), "Cashier should not be assigned to a Stocker shift");
    }

    @Test
    void testGreedyFallback_WeeklyHourCapEnforcement() {
        List<Employee> employees = List.of(stocker); // Stocker has 20h max per week
        List<Shift> shifts = new ArrayList<>();
        
        // Create 3 shifts of 8 hours each (24 hours total)
        for (int i = 0; i < 3; i++) {
            shifts.add(Shift.builder()
                    .id((long) i)
                    .role(Role.STOCKER)
                    .startTime(LocalDateTime.of(2026, 6, i + 1, 9, 0))
                    .endTime(LocalDateTime.of(2026, 6, i + 1, 17, 0))
                    .status("DRAFT")
                    .build());
        }

        schedulerService.runGreedyFallbackScheduler(1L, employees, shifts, new ArrayList<>());

        // Only 2 shifts (16 hours) should be assigned, 3rd shift (24th hour) should exceed 20h cap and be rejected
        long assignedCount = shifts.stream().filter(s -> s.getEmployee() != null).count();
        assertEquals(2, assignedCount, "Employee should only be assigned shifts up to their weekly max hours cap");
    }
}
