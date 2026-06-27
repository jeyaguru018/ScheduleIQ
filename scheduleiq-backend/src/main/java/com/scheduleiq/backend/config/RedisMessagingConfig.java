package com.scheduleiq.backend.config;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.ApplicationListener;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.listener.ChannelTopic;
import org.springframework.data.redis.listener.RedisMessageListenerContainer;
import org.springframework.data.redis.listener.adapter.MessageListenerAdapter;
import org.springframework.stereotype.Component;

@Configuration
@Slf4j
public class RedisMessagingConfig {

    public static final String SCHEDULE_JOB_TOPIC = "schedule_generation_jobs";

    @Bean
    public ChannelTopic scheduleTopic() {
        return new ChannelTopic(SCHEDULE_JOB_TOPIC);
    }

    @Bean
    public RedisMessageListenerContainer redisMessageListenerContainer(
            RedisConnectionFactory connectionFactory,
            MessageListenerAdapter listenerAdapter) {
        
        RedisMessageListenerContainer container = new RedisMessageListenerContainer() {
            @Override
            public boolean isAutoStartup() {
                return false;
            }
        };
        container.setConnectionFactory(connectionFactory);
        // Subscribe to the schedule generation topic
        container.addMessageListener(listenerAdapter, scheduleTopic());
        return container;
    }

    @Bean
    public MessageListenerAdapter listenerAdapter(com.scheduleiq.backend.service.messaging.ScheduleJobSubscriber subscriber) {
        // When a message arrives, it will call the "handleMessage" method in our subscriber
        return new MessageListenerAdapter(subscriber, "handleMessage");
    }

    @Component
    @RequiredArgsConstructor
    public static class RedisListenerContainerStarter implements ApplicationListener<ApplicationReadyEvent> {

        private final RedisMessageListenerContainer container;

        @Override
        public void onApplicationEvent(ApplicationReadyEvent event) {
            log.info("Starting background thread to initialize Redis Message Listener Container...");
            Thread thread = new Thread(() -> {
                boolean started = false;
                int attempts = 0;
                while (!started && !Thread.currentThread().isInterrupted()) {
                    attempts++;
                    try {
                        log.info("Attempting to start Redis Message Listener Container (attempt {})...", attempts);
                        container.start();
                        started = container.isRunning();
                        if (started) {
                            log.info("Successfully started Redis Message Listener Container on attempt {}.", attempts);
                        }
                    } catch (Exception e) {
                        log.warn("Failed to start Redis Message Listener Container (attempt {}): {}. Retrying in 10 seconds...", 
                                attempts, e.getMessage());
                        try {
                            Thread.sleep(10000); // Wait 10 seconds before retrying
                        } catch (InterruptedException ie) {
                            Thread.currentThread().interrupt();
                        }
                    }
                }
            });
            thread.setName("redis-listener-starter");
            thread.setDaemon(true);
            thread.start();
        }
    }
}
