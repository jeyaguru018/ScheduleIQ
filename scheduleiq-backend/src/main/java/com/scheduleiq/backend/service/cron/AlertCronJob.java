package com.scheduleiq.backend.service.cron;

import com.scheduleiq.backend.model.Employee;
import com.scheduleiq.backend.model.Role;
import com.scheduleiq.backend.model.Shift;
import com.scheduleiq.backend.repository.EmployeeRepository;
import com.scheduleiq.backend.repository.ShiftRepository;
import com.scheduleiq.backend.service.forecasting.MlIntegrationService;
import com.scheduleiq.backend.service.notification.EmailNotificationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import java.time.LocalDateTime;
import java.util.List;

@Component
@RequiredArgsConstructor
@Slf4j
public class AlertCronJob {

    private final MlIntegrationService mlIntegrationService;
    private final ShiftRepository shiftRepository;
    private final EmployeeRepository employeeRepository;
    private final EmailNotificationService emailNotificationService;
    private final SimpMessagingTemplate messagingTemplate;

    // Runs every 2 minutes (120000ms) for testing convenience, with an initial delay of 10 seconds
    @Scheduled(initialDelay = 10000, fixedDelay = 120000)
    public void evaluateUpcomingShiftRisks() {
        log.info(">>> AlertCronJob: Beginning automated ML shift risk evaluation...");
        
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime end = now.plusDays(7); // Evaluate next 7 days of shifts
        
        List<Shift> shifts = shiftRepository.findByStartTimeBetween(now, end);
        if (shifts.isEmpty()) {
            log.info("AlertCronJob: No upcoming shifts found to evaluate.");
            return;
        }

        log.info("AlertCronJob: Found {} upcoming shifts. Evaluating via ML service...", shifts.size());
        mlIntegrationService.evaluateNoShowRisks(shifts);

        // Filter and process high-risk alerts
        for (Shift shift : shifts) {
            if (shift.getEmployee() != null && shift.getNoShowRisk() >= 0.25) { // 25% threshold
                log.warn("AlertCronJob: High no-show risk detected for employee {} on shift {}", 
                        shift.getEmployee().getName(), shift.getId());

                // 1. Broadcast live alert over WebSocket to managers
                messagingTemplate.convertAndSend("/topic/alerts", shift);

                // 2. Send critical email notification to all store managers
                List<Employee> managers = employeeRepository.findAll().stream()
                        .filter(e -> e.getRole() == Role.MANAGER)
                        .toList();

                for (Employee manager : managers) {
                    String alertMsg = String.format(
                            "Employee <strong>%s</strong> (Role: %s) has been flagged by ScheduleIQ's AI "
                            + "with a high no-show risk of <strong>%.1f%%</strong> for the shift on %s (%s to %s).",
                            shift.getEmployee().getName(),
                            shift.getRole().name(),
                            shift.getNoShowRisk() * 100,
                            shift.getStartTime().toLocalDate().toString(),
                            shift.getStartTime().toLocalTime().toString(),
                            shift.getEndTime().toLocalTime().toString()
                    );
                    emailNotificationService.sendCriticalAlertEmail(
                            manager.getName(), 
                            manager.getEmail(), 
                            alertMsg
                    );
                }
            }
        }
        
        log.info(">>> AlertCronJob: Automated evaluation completed and broadcasted.");
    }
}
