package com.scheduleiq.backend.config;

import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.context.request.WebRequest;

import java.time.Instant;
import java.util.HashMap;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * GlobalExceptionHandler — Production-grade centralized error handling.
 * All exceptions are caught here. Stack traces are NEVER exposed to clients.
 * All error responses follow a consistent JSON structure.
 */
@RestControllerAdvice
@Slf4j
public class GlobalExceptionHandler {

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, Object>> handleValidation(MethodArgumentNotValidException ex, WebRequest request) {
        Map<String, String> fieldErrors = ex.getBindingResult().getFieldErrors().stream()
                .collect(Collectors.toMap(
                        FieldError::getField,
                        fe -> fe.getDefaultMessage() != null ? fe.getDefaultMessage() : "Invalid value",
                        (existing, replacement) -> existing
                ));
        log.warn("Validation failure on [{}]: {}", request.getDescription(false), fieldErrors);
        return buildError(HttpStatus.BAD_REQUEST, "Validation failed", fieldErrors, request);
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<Map<String, Object>> handleIllegalArgument(IllegalArgumentException ex, WebRequest request) {
        log.warn("Illegal argument on [{}]: {}", request.getDescription(false), ex.getMessage());
        return buildError(HttpStatus.BAD_REQUEST, ex.getMessage(), null, request);
    }

    @ExceptionHandler(IllegalStateException.class)
    public ResponseEntity<Map<String, Object>> handleIllegalState(IllegalStateException ex, WebRequest request) {
        log.warn("Business rule violation on [{}]: {}", request.getDescription(false), ex.getMessage());
        return buildError(HttpStatus.CONFLICT, ex.getMessage(), null, request);
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<Map<String, Object>> handleAccessDenied(AccessDeniedException ex, WebRequest request) {
        log.warn("Access denied on [{}]", request.getDescription(false));
        return buildError(HttpStatus.FORBIDDEN, "Access denied. You do not have permission to perform this action.", null, request);
    }

    @ExceptionHandler(BadCredentialsException.class)
    public ResponseEntity<Map<String, Object>> handleBadCredentials(BadCredentialsException ex, WebRequest request) {
        log.warn("Bad credentials attempt on [{}]", request.getDescription(false));
        return buildError(HttpStatus.UNAUTHORIZED, "Invalid email or password.", null, request);
    }

    @ExceptionHandler(RateLimitExceededException.class)
    public ResponseEntity<Map<String, Object>> handleRateLimit(RateLimitExceededException ex, WebRequest request) {
        log.warn("Rate limit exceeded on [{}]", request.getDescription(false));
        return buildError(HttpStatus.TOO_MANY_REQUESTS, "Too many requests. Please wait before trying again.", null, request);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, Object>> handleGeneric(Exception ex, WebRequest request) {
        log.error("Unexpected error on [{}]: {}", request.getDescription(false), ex.getMessage(), ex);
        return buildError(HttpStatus.INTERNAL_SERVER_ERROR,
                "An internal server error occurred. Our team has been notified.", null, request);
    }

    private ResponseEntity<Map<String, Object>> buildError(
            HttpStatus status, String message, Map<String, String> details, WebRequest request) {
        Map<String, Object> body = new HashMap<>();
        body.put("timestamp", Instant.now().toString());
        body.put("status", status.value());
        body.put("error", status.getReasonPhrase());
        body.put("message", message);
        body.put("path", request.getDescription(false).replace("uri=", ""));
        if (details != null && !details.isEmpty()) body.put("details", details);
        return ResponseEntity.status(status).body(body);
    }
}
