package com.scheduleiq.backend.config;

import com.github.benmanes.caffeine.cache.Caffeine;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.cache.CacheManager;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.cache.caffeine.CaffeineCacheManager;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;
import org.springframework.data.redis.cache.RedisCacheConfiguration;
import org.springframework.data.redis.cache.RedisCacheManager;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.serializer.GenericJackson2JsonRedisSerializer;
import org.springframework.data.redis.serializer.RedisSerializationContext;
import org.springframework.data.redis.serializer.StringRedisSerializer;

import java.time.Duration;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.TimeUnit;

/**
 * CacheConfig v2.0 — Dual-mode cache: Redis (production) + Caffeine (local dev fallback).
 *
 * Cache strategy by cache name:
 *   - "employees"       : Manager roster list. 5-min TTL.
 *   - "employeeById"    : Individual employee profiles. 10-min TTL.
 *   - "forecastSignals" : Demand forecast signals. 30-min TTL (stable data).
 *   - "jobStatus"       : Scheduler job polling. Short 10s TTL (changes rapidly).
 *   - "shifts"          : Published shift data. 5-min TTL.
 *   - "leaveRequests"   : Leave request lists. 2-min TTL (changes frequently).
 */
@Configuration
@EnableCaching
public class CacheConfig {

    /**
     * Primary CacheManager using Redis for distributed caching.
     * This is the production configuration, backed by the Render Redis instance.
     *
     * Per-cache TTL configurations ensure correct expiry per data type.
     */
    @Bean
    @Primary
    public CacheManager redisCacheManager(RedisConnectionFactory connectionFactory) {
        // Default serialization: JSON for values, String for keys
        RedisCacheConfiguration defaultConfig = RedisCacheConfiguration.defaultCacheConfig()
                .entryTtl(Duration.ofMinutes(5))
                .disableCachingNullValues()
                .serializeKeysWith(
                        RedisSerializationContext.SerializationPair.fromSerializer(new StringRedisSerializer()))
                .serializeValuesWith(
                        RedisSerializationContext.SerializationPair.fromSerializer(new GenericJackson2JsonRedisSerializer()));

        // Per-cache custom TTL overrides
        Map<String, RedisCacheConfiguration> cacheConfigs = new HashMap<>();

        cacheConfigs.put("employees",
                defaultConfig.entryTtl(Duration.ofMinutes(5)));

        cacheConfigs.put("employeeById",
                defaultConfig.entryTtl(Duration.ofMinutes(10)));

        cacheConfigs.put("forecastSignals",
                defaultConfig.entryTtl(Duration.ofMinutes(30)));

        cacheConfigs.put("jobStatus",
                defaultConfig.entryTtl(Duration.ofSeconds(10)));

        cacheConfigs.put("shifts",
                defaultConfig.entryTtl(Duration.ofMinutes(5)));

        cacheConfigs.put("leaveRequests",
                defaultConfig.entryTtl(Duration.ofMinutes(2)));

        return RedisCacheManager.builder(connectionFactory)
                .cacheDefaults(defaultConfig)
                .withInitialCacheConfigurations(cacheConfigs)
                .transactionAware()
                .build();
    }
}
