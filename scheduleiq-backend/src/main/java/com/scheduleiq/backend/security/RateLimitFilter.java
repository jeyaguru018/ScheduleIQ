package com.scheduleiq.backend.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.script.DefaultRedisScript;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.Instant;
import java.util.Collections;
import java.util.Map;

/**
 * RateLimitFilter — Distributed Token-bucket rate limiting via Redis Lua Script.
 */
@Component
@Slf4j
public class RateLimitFilter extends OncePerRequestFilter {

    private final StringRedisTemplate redisTemplate;
    private final ObjectMapper objectMapper = new ObjectMapper();
    private final DefaultRedisScript<Long> rateLimitScript;

    public RateLimitFilter(StringRedisTemplate redisTemplate) {
        this.redisTemplate = redisTemplate;
        this.rateLimitScript = new DefaultRedisScript<>();
        this.rateLimitScript.setResultType(Long.class);
        // Standard Token Bucket Lua Script
        this.rateLimitScript.setScriptText(
                "local key = KEYS[1]\n" +
                "local limit = tonumber(ARGV[1])\n" +
                "local window_secs = tonumber(ARGV[2])\n" +
                "local current = redis.call('GET', key)\n" +
                "if current and tonumber(current) >= limit then\n" +
                "  return 0\n" +
                "end\n" +
                "current = redis.call('INCR', key)\n" +
                "if tonumber(current) == 1 then\n" +
                "  redis.call('EXPIRE', key, window_secs)\n" +
                "end\n" +
                "return 1"
        );
    }

    @Override
    protected void doFilterInternal(@NonNull HttpServletRequest request,
                                    @NonNull HttpServletResponse response,
                                    @NonNull FilterChain filterChain) throws ServletException, IOException {

        String path = request.getRequestURI();
        // Bypass rate limiting for health check and actuator endpoints to ensure reliable deployments
        if (path.startsWith("/api/auth/health") || path.startsWith("/actuator")) {
            filterChain.doFilter(request, response);
            return;
        }

        String ip = getClientIp(request);
        String method = request.getMethod();

        int limit;
        int windowSeconds;
        String prefix;

        if ("POST".equals(method) && path.startsWith("/api/auth/login")) {
            limit = 5;
            windowSeconds = 15 * 60; // 15 mins
            prefix = "rl:login:";
        } else if ("POST".equals(method) && path.startsWith("/api/auth/register")) {
            limit = 3;
            windowSeconds = 15 * 60; // 15 mins
            prefix = "rl:register:";
        } else if ("POST".equals(method) && path.startsWith("/api/schedule/generate")) {
            limit = 3;
            windowSeconds = 60 * 60; // 1 hr
            prefix = "rl:generate:";
        } else {
            limit = 200;
            windowSeconds = 60; // 1 min
            prefix = "rl:general:";
        }

        String key = prefix + ip;
        boolean allowed = true;
        try {
            Long result = redisTemplate.execute(rateLimitScript, Collections.singletonList(key), String.valueOf(limit), String.valueOf(windowSeconds));
            allowed = (result != null && result == 1L);
        } catch (Exception e) {
            log.error("Redis rate limiting error for IP [{}], failing open: {}", ip, e.getMessage());
        }

        if (allowed) {
            filterChain.doFilter(request, response);
        } else {
            log.warn("Rate limit exceeded for IP [{}] on [{}] [{}]", ip, method, path);
            response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
            response.setContentType(MediaType.APPLICATION_JSON_VALUE);

            response.setHeader("Retry-After", String.valueOf(windowSeconds));
            response.setHeader("X-RateLimit-Limit", String.valueOf(limit));
            response.setHeader("X-RateLimit-Window", windowSeconds + "s");

            Map<String, Object> body = Map.of(
                    "timestamp", Instant.now().toString(),
                    "status", 429,
                    "error", "Too Many Requests",
                    "message", "Rate limit exceeded. Please wait before sending more requests.",
                    "path", path,
                    "retryAfterSeconds", windowSeconds
            );
            objectMapper.writeValue(response.getWriter(), body);
        }
    }

    private String getClientIp(HttpServletRequest request) {
        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            String firstIp = forwarded.split(",")[0].trim();
            if (firstIp.matches("[0-9a-fA-F.:]+") && firstIp.length() <= 45) {
                return firstIp;
            }
        }
        String realIp = request.getHeader("X-Real-IP");
        if (realIp != null && !realIp.isBlank()
                && realIp.matches("[0-9a-fA-F.:]+") && realIp.length() <= 45) {
            return realIp;
        }
        return request.getRemoteAddr();
    }
}
