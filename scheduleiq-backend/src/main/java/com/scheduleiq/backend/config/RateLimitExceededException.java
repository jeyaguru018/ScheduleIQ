package com.scheduleiq.backend.config;

/**
 * Thrown when a client exceeds the rate limit for a protected endpoint.
 * Handled by GlobalExceptionHandler to return HTTP 429.
 */
public class RateLimitExceededException extends RuntimeException {
    public RateLimitExceededException(String message) {
        super(message);
    }
}
