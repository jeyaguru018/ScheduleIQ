package com.scheduleiq.backend.config;

import com.github.benmanes.caffeine.cache.Caffeine;
import org.springframework.cache.CacheManager;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.cache.caffeine.CaffeineCacheManager;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.concurrent.TimeUnit;

/**
 * CacheConfig — Configures Caffeine in-memory caching.
 *
 * Cache strategy by cache name:
 *   - "employees"       : Manager roster list. 5-min TTL, max 200 entries.
 *   - "employeeById"    : Individual employee profiles. 10-min TTL, max 500.
 *   - "forecastSignals" : Demand forecast signals. 30-min TTL (data is stable).
 *   - "jobStatus"       : Scheduler job polling. Short 10s TTL (changes quickly).
 */
@Configuration
@EnableCaching
public class CacheConfig {

    @Bean
    public CacheManager cacheManager() {
        CaffeineCacheManager cacheManager = new CaffeineCacheManager();

        // Different TTL strategies per cache — critical for correctness
        cacheManager.registerCustomCache("employees",
                Caffeine.newBuilder()
                        .maximumSize(200)
                        .expireAfterWrite(5, TimeUnit.MINUTES)
                        .recordStats()  // Enable hit/miss metrics for monitoring
                        .build());

        cacheManager.registerCustomCache("employeeById",
                Caffeine.newBuilder()
                        .maximumSize(500)
                        .expireAfterWrite(10, TimeUnit.MINUTES)
                        .recordStats()
                        .build());

        cacheManager.registerCustomCache("forecastSignals",
                Caffeine.newBuilder()
                        .maximumSize(50)
                        .expireAfterWrite(30, TimeUnit.MINUTES)
                        .recordStats()
                        .build());

        cacheManager.registerCustomCache("jobStatus",
                Caffeine.newBuilder()
                        .maximumSize(1000)
                        .expireAfterWrite(10, TimeUnit.SECONDS)
                        .recordStats()
                        .build());

        return cacheManager;
    }
}
