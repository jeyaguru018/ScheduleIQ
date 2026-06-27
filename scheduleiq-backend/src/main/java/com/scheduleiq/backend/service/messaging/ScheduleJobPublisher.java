package com.scheduleiq.backend.service.messaging;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.scheduleiq.backend.service.optimization.AutoSchedulerService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class ScheduleJobPublisher {

    private final StringRedisTemplate redisTemplate;
    private final ObjectMapper objectMapper;
    private final AutoSchedulerService autoSchedulerService;

    public void publishJob(String jobId, LocalDateTime weekStart, LocalDateTime weekEnd, double budgetCap, Long managerId) {
        try {
            Map<String, Object> payload = new HashMap<>();
            payload.put("jobId", jobId);
            payload.put("weekStart", weekStart.toString());
            payload.put("weekEnd", weekEnd.toString());
            payload.put("budgetCap", budgetCap);
            payload.put("managerId", managerId);

            String message = objectMapper.writeValueAsString(payload);
            redisTemplate.convertAndSend("schedule_generation_jobs", message);
            log.info("Published async schedule generation job to Redis: {}", jobId);
        } catch (Exception e) {
            log.warn("Could not publish schedule job to Redis (Redis offline or error: {}). Executing via direct Spring @Async fallback...", e.getMessage());
            // Fallback: execute directly via Spring @Async executor
            autoSchedulerService.generateOptimalRoster(jobId, weekStart, weekEnd, budgetCap, managerId);
        }
    }
}
