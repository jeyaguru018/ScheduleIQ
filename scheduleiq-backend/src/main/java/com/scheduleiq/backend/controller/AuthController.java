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

    /**
     * POST /api/auth/login
     * Body: { "email": "...", "password": "..." }
     * Returns: { "token": "...", "role": "MANAGER|EMPLOYEE|CASHIER", "name": "..." }
     */
    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody Map<String, String> request) {
        String email = request.get("email");
        String password = request.get("password");

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
        String email = (String) request.get("email");

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
                .name((String) request.get("name"))
                .email(email)
                .password(passwordEncoder.encode((String) request.get("password")))
                .role(Role.valueOf(((String) request.get("role")).toUpperCase()))
                .baseHourlyRate(Double.parseDouble(request.get("baseHourlyRate").toString()))
                .maxHoursPerWeek(Integer.parseInt(request.get("maxHoursPerWeek").toString()))
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
