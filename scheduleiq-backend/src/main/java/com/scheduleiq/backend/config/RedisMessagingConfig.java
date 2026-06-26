package com.scheduleiq.backend.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.listener.ChannelTopic;
import org.springframework.data.redis.listener.RedisMessageListenerContainer;
import org.springframework.data.redis.listener.adapter.MessageListenerAdapter;

@Configuration
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
        
        RedisMessageListenerContainer container = new RedisMessageListenerContainer();
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
}
