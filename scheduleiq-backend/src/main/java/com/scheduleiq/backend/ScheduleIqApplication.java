package com.scheduleiq.backend;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;
import org.springframework.retry.annotation.EnableRetry;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableAsync        // Enables running our optimization constraint solver in background worker threads!
@EnableScheduling   // Enables running automated scheduled cron jobs!
@EnableJpaAuditing  // Populates @CreatedDate and @LastModifiedDate automatically
@EnableRetry        // Enables @Retryable for resilient ML service calls
public class ScheduleIqApplication {
    public static void main(String[] args) {
        SpringApplication.run(ScheduleIqApplication.class, args);
    }
}

