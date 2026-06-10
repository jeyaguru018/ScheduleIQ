package com.scheduleiq.backend;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableAsync // Enables running our optimization constraint solver in background worker threads!
@EnableScheduling // Enables running automated scheduled cron jobs!
public class ScheduleIqApplication {
    public static void main(String[] args) {
        SpringApplication.run(ScheduleIqApplication.class, args);
    }
}
