package com.scheduleiq.backend.service.messaging;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.scheduleiq.backend.service.optimization.AutoSchedulerService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class ScheduleJobSubscriber {

    private final AutoSchedulerService autoSchedulerService;
    private final ObjectMapper objectMapper;

    /**
     * This method is invoked by the RedisMessageListenerContainer when a message arrives
     * on the "schedule_generation_jobs" topic.
     */
    public void handleMessage(String message) {
        log.info("Received background job from Redis Message Queue.");
        try {
            Map<String, Object> payload = objectMapper.readValue(message, new TypeReference<Map<String, Object>>() {});
            
            String jobId = (String) payload.get("jobId");
            LocalDateTime weekStart = LocalDateTime.parse((String) payload.get("weekStart"));
            LocalDateTime weekEnd = LocalDateTime.parse((String) payload.get("weekEnd"));
            double budgetCap = Double.parseDouble(payload.get("budgetCap").toString());
            Long managerId = Long.parseLong(payload.get("managerId").toString());

            log.info("Processing async job [{}]: manager={}, weekStart={}", jobId, managerId, weekStart);
            
            // Execute the heavy constraint solver
            autoSchedulerService.generateOptimalRoster(jobId, weekStart, weekEnd, budgetCap, managerId);
            
            log.info("Successfully completed async job [{}]", jobId);
            
        } catch (Exception e) {
            log.error("Error processing Redis schedule job message: {}", message, e);
        }
    }
}
