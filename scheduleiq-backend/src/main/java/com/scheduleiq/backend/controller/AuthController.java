package com.scheduleiq.backend.controller;

import com.scheduleiq.backend.model.Employee;
import com.scheduleiq.backend.model.Role;
import com.scheduleiq.backend.repository.EmployeeRepository;
import com.scheduleiq.backend.security.JwtService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.regex.Pattern;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
@Slf4j
public class AuthController {

    private final AuthenticationManager authenticationManager;
    private final EmployeeRepository employeeRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final UserDetailsService userDetailsService;
    private final com.scheduleiq.backend.service.notification.EmailNotificationService emailNotificationService;

    // ── Input validation constants ─────────────────────────────────────────────
    private static final int MAX_EMAIL_LENGTH    = 254;  // RFC 5321 max
    private static final int MAX_NAME_LENGTH     = 100;
    private static final int MAX_PASSWORD_LENGTH = 128;  // Prevent BCrypt DoS
    private static final int MIN_PASSWORD_LENGTH = 6;

    // Simple but effective email format validator
    private static final Pattern EMAIL_PATTERN = Pattern.compile(
            "^[a-zA-Z0-9._%+\\-]+@[a-zA-Z0-9.\\-]+\\.[a-zA-Z]{2,}$"
    );

    /**
     * Sanitizes a string: trims whitespace, strips null bytes and control chars.
     * Returns empty string if input is null.
     */
    private String sanitize(String input) {
        if (input == null) return "";
        // Remove null bytes and ASCII control characters (< 0x20 except tab/newline)
        return input.trim().replaceAll("[\\x00-\\x08\\x0B\\x0C\\x0E-\\x1F\\x7F]", "");
    }

    /**
     * POST /api/auth/login
     * Body: { "email": "...", "password": "..." }
     * Returns: { "token": "...", "role": "MANAGER|EMPLOYEE|CASHIER", "name": "..." }
     */
    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody Map<String, String> request) {
        // ── Input Validation ──────────────────────────────────────────────────
        String email    = sanitize(request.get("email"));
        String password = request.get("password"); // Do NOT trim passwords (may have intentional spaces)

        if (email.isEmpty() || password == null || password.isEmpty()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", "Email and password are required."));
        }
        if (email.length() > MAX_EMAIL_LENGTH) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", "Email address is too long."));
        }
        if (!EMAIL_PATTERN.matcher(email).matches()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", "Invalid email format."));
        }
        if (password.length() > MAX_PASSWORD_LENGTH) {
            // Reject oversized passwords — BCrypt has a 72-char limit; very long passwords
            // can also be used to DoS the CPU. Return a generic error to not hint at limits.
            log.warn("Login rejected: oversized password for [{}]", email);
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Invalid email or password."));
        }
        // ─────────────────────────────────────────────────────────────────────

        try {
            authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(email, password));
        } catch (AuthenticationException e) {
            log.warn("Failed login attempt for email: [{}]", email);
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Invalid email or password."));
        }

        Employee employee = employeeRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Employee not found after auth"));

        UserDetails userDetails = userDetailsService.loadUserByUsername(email);
        String token = jwtService.generateToken(
                Map.of("role", employee.getRole().name(), "name", employee.getName()),
                userDetails);

        log.info("Successful login for employee [{}] role=[{}]", employee.getId(), employee.getRole());
        return ResponseEntity.ok(Map.of(
                "token", token,
                "role", employee.getRole().name(),
                "name", employee.getName(),
                "employeeId", employee.getId()
        ));
    }

    /**
     * POST /api/auth/register
     * Body: { "name": "...", "email": "...", "password": "...", "role": "MANAGER|CASHIER|STOCKER|DELIVERY", "baseHourlyRate": 450, "maxHoursPerWeek": 40 }
     */
    @PostMapping("/register")
    @Transactional
    @CacheEvict(value = "employees", allEntries = true)
    public ResponseEntity<?> register(
            @RequestBody Map<String, Object> request,
            @org.springframework.security.core.annotation.AuthenticationPrincipal org.springframework.security.core.userdetails.UserDetails loggedInUser) {

        // ── Input Validation & Sanitization ───────────────────────────────────
        String name     = sanitize((String) request.get("name"));
        String email    = sanitize((String) request.get("email"));
        String password = (String) request.get("password");
        String roleStr  = sanitize((String) request.get("role"));

        if (name.isEmpty() || email.isEmpty() || password == null || password.isEmpty()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", "Name, email, and password are all required."));
        }
        if (name.length() > MAX_NAME_LENGTH) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", "Name is too long (max 100 characters)."));
        }
        if (email.length() > MAX_EMAIL_LENGTH) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", "Email address is too long."));
        }
        if (!EMAIL_PATTERN.matcher(email).matches()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", "Invalid email format."));
        }
        if (password.length() < MIN_PASSWORD_LENGTH) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", "Password must be at least " + MIN_PASSWORD_LENGTH + " characters long."));
        }
        if (password.length() > MAX_PASSWORD_LENGTH) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", "Password is too long (max " + MAX_PASSWORD_LENGTH + " characters)."));
        }

        // Validate role is one of our known roles
        Role role;
        try {
            role = Role.valueOf(roleStr.toUpperCase());
        } catch (IllegalArgumentException | NullPointerException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", "Invalid role. Must be one of: MANAGER, CASHIER, STOCKER, DELIVERY_BOY, LEAD_CASHIER."));
        }

        // Validate numeric fields
        double baseHourlyRate;
        int maxHoursPerWeek;
        try {
            baseHourlyRate = Double.parseDouble(request.get("baseHourlyRate").toString());
            maxHoursPerWeek = Integer.parseInt(request.get("maxHoursPerWeek").toString());
            if (baseHourlyRate < 0 || baseHourlyRate > 100000) throw new NumberFormatException("rate out of range");
            if (maxHoursPerWeek < 1 || maxHoursPerWeek > 168) throw new NumberFormatException("hours out of range");
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", "Invalid numeric values for hourly rate or weekly hours."));
        }
        // ─────────────────────────────────────────────────────────────────────

        if (employeeRepository.findByEmail(email).isPresent()) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(Map.of("error", "An account with this email already exists."));
        }

        Long managerId = null;
        if (loggedInUser != null && loggedInUser.getUsername() != null) {
            java.util.Optional<Employee> managerOpt = employeeRepository.findByEmail(loggedInUser.getUsername());
            if (managerOpt.isPresent()) {
                managerId = managerOpt.get().getId();
            }
        }

        Employee employee = Employee.builder()
                .name(name)
                .email(email)
                .password(passwordEncoder.encode(password))
                .role(role)
                .baseHourlyRate(baseHourlyRate)
                .maxHoursPerWeek(maxHoursPerWeek)
                .managerId(managerId)
                .build();

        employeeRepository.save(employee);
        log.info("New employee registered: id=[{}] role=[{}] email=[{}] managerId=[{}]", employee.getId(), employee.getRole(), email, managerId);

        // Send welcome/onboarding email asynchronously
        try {
            emailNotificationService.sendEmployeeOnboardingEmail(employee.getName(), employee.getEmail());
        } catch (Exception e) {
            log.warn("SMTP onboarding email failed for [{}]: {}", email, e.getMessage());
        }

        UserDetails userDetails = userDetailsService.loadUserByUsername(email);
        String token = jwtService.generateToken(
                Map.of("role", employee.getRole().name(), "name", employee.getName()),
                userDetails);

        return ResponseEntity.status(HttpStatus.CREATED).body(Map.of(
                "token", token,
                "role", employee.getRole().name(),
                "name", employee.getName(),
                "employeeId", employee.getId()
        ));
    }

    /** GET /api/health — public healthcheck */
    @GetMapping("/health")
    public ResponseEntity<Map<String, String>> health() {
        return ResponseEntity.ok(Map.of("status", "UP", "service", "scheduleiq-backend"));
    }
}
