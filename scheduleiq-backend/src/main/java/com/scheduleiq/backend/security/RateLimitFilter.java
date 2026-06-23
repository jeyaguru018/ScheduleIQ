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
 * Protected endpoints and their limits (hardened per security audit):
 *   POST /api/auth/login         → 5 requests / 15 minutes  (strong brute-force protection)
 *   POST /api/auth/register      → 3 requests / 15 minutes  (signup spam prevention)
 *   POST /api/schedule/generate  → 3 requests / hour        (expensive AI operation)
 *   All other endpoints          → 200 requests / minute    (general API protection)
 */
@Component
@Slf4j
public class RateLimitFilter extends OncePerRequestFilter {

    // Separate bucket maps per endpoint type for independent limits
    private final ConcurrentHashMap<String, Bucket> loginBuckets    = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, Bucket> registerBuckets = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, Bucket> schedulerBuckets = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, Bucket> generalBuckets  = new ConcurrentHashMap<>();

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Override
    protected void doFilterInternal(@NonNull HttpServletRequest request,
                                    @NonNull HttpServletResponse response,
                                    @NonNull FilterChain filterChain) throws ServletException, IOException {

        String ip     = getClientIp(request);
        String path   = request.getRequestURI();
        String method = request.getMethod();

        Bucket bucket;

        if ("POST".equals(method) && path.startsWith("/api/auth/login")) {
            // 5 login attempts per 15 minutes per IP — strong brute-force protection
            bucket = loginBuckets.computeIfAbsent(ip, k ->
                    Bucket.builder()
                            .addLimit(Bandwidth.classic(5, Refill.intervally(5, Duration.ofMinutes(15))))
                            .build());

        } else if ("POST".equals(method) && path.startsWith("/api/auth/register")) {
            // 3 registrations per 15 minutes per IP — stops signup spam
            bucket = registerBuckets.computeIfAbsent(ip, k ->
                    Bucket.builder()
                            .addLimit(Bandwidth.classic(3, Refill.intervally(3, Duration.ofMinutes(15))))
                            .build());

        } else if ("POST".equals(method) && path.startsWith("/api/schedule/generate")) {
            // 3 AI generation jobs per hour — very expensive CPU operation
            bucket = schedulerBuckets.computeIfAbsent(ip, k ->
                    Bucket.builder()
                            .addLimit(Bandwidth.classic(3, Refill.intervally(3, Duration.ofHours(1))))
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

            // Inform clients how long to wait before retrying
            String retryAfter = path.contains("/api/auth/") ? "900"
                    : path.contains("/api/schedule/generate") ? "3600"
                    : "60";
            response.setHeader("Retry-After", retryAfter);
            response.setHeader("X-RateLimit-Limit",
                    path.contains("/api/auth/login") ? "5"
                    : path.contains("/api/auth/register") ? "3"
                    : path.contains("/api/schedule/generate") ? "3"
                    : "200");
            response.setHeader("X-RateLimit-Window",
                    path.contains("/api/auth/") ? "15m"
                    : path.contains("/api/schedule/generate") ? "1h"
                    : "1m");

            Map<String, Object> body = Map.of(
                    "timestamp", Instant.now().toString(),
                    "status", 429,
                    "error", "Too Many Requests",
                    "message", "Rate limit exceeded. Please wait before sending more requests.",
                    "path", path,
                    "retryAfterSeconds", Integer.parseInt(retryAfter)
            );
            objectMapper.writeValue(response.getWriter(), body);
        }
    }

    /**
     * Extracts client IP, hardened against X-Forwarded-For header injection.
     * We only trust the leftmost IP in XFF (which is the actual client).
     * We validate it looks like an IPv4/IPv6 address to prevent injection.
     */
    private String getClientIp(HttpServletRequest request) {
        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            String firstIp = forwarded.split(",")[0].trim();
            // Only accept if it looks like a valid IP (IPv4 or IPv6)
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
