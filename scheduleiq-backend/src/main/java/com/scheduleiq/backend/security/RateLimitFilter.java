package com.scheduleiq.backend.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;
import io.github.bucket4j.Refill;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * RateLimitFilter — Token-bucket rate limiting per IP address.
 *
 * Protected endpoints and their limits:
 *   POST /api/auth/login    → 10 requests / minute (brute-force protection)
 *   POST /api/auth/register → 5 requests / minute  (signup abuse prevention)
 *   POST /api/schedule/generate → 3 requests / minute (expensive AI endpoint)
 *
 * All other endpoints → 200 requests / minute (general API protection)
 */
@Component
@Slf4j
public class RateLimitFilter extends OncePerRequestFilter {

    // Separate bucket maps per endpoint type for independent limits
    private final ConcurrentHashMap<String, Bucket> loginBuckets = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, Bucket> registerBuckets = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, Bucket> schedulerBuckets = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, Bucket> generalBuckets = new ConcurrentHashMap<>();

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Override
    protected void doFilterInternal(@NonNull HttpServletRequest request,
                                    @NonNull HttpServletResponse response,
                                    @NonNull FilterChain filterChain) throws ServletException, IOException {

        String ip = getClientIp(request);
        String path = request.getRequestURI();
        String method = request.getMethod();

        Bucket bucket;

        if ("POST".equals(method) && path.startsWith("/api/auth/login")) {
            // 10 login attempts per minute per IP — prevents brute force
            bucket = loginBuckets.computeIfAbsent(ip, k ->
                    Bucket.builder()
                            .addLimit(Bandwidth.classic(10, Refill.greedy(10, Duration.ofMinutes(1))))
                            .build());
        } else if ("POST".equals(method) && path.startsWith("/api/auth/register")) {
            // 5 registrations per minute per IP
            bucket = registerBuckets.computeIfAbsent(ip, k ->
                    Bucket.builder()
                            .addLimit(Bandwidth.classic(5, Refill.greedy(5, Duration.ofMinutes(1))))
                            .build());
        } else if ("POST".equals(method) && path.startsWith("/api/schedule/generate")) {
            // 3 AI generation jobs per minute — very expensive CPU operation
            bucket = schedulerBuckets.computeIfAbsent(ip, k ->
                    Bucket.builder()
                            .addLimit(Bandwidth.classic(3, Refill.greedy(3, Duration.ofMinutes(1))))
                            .build());
        } else {
            // General API: 200 requests/minute
            bucket = generalBuckets.computeIfAbsent(ip, k ->
                    Bucket.builder()
                            .addLimit(Bandwidth.classic(200, Refill.greedy(200, Duration.ofMinutes(1))))
                            .build());
        }

        if (bucket.tryConsume(1)) {
            filterChain.doFilter(request, response);
        } else {
            log.warn("Rate limit exceeded for IP [{}] on [{}] [{}]", ip, method, path);
            response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
            response.setContentType(MediaType.APPLICATION_JSON_VALUE);
            response.setHeader("Retry-After", "60");
            Map<String, Object> body = Map.of(
                    "timestamp", Instant.now().toString(),
                    "status", 429,
                    "error", "Too Many Requests",
                    "message", "Rate limit exceeded. Please wait before sending more requests.",
                    "path", path
            );
            objectMapper.writeValue(response.getWriter(), body);
        }
    }

    private String getClientIp(HttpServletRequest request) {
        // Honor X-Forwarded-For header when behind a reverse proxy (Render, Vercel, etc.)
        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            return forwarded.split(",")[0].trim();
        }
        String realIp = request.getHeader("X-Real-IP");
        if (realIp != null && !realIp.isBlank()) {
            return realIp;
        }
        return request.getRemoteAddr();
    }
}
