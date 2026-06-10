package com.scheduleiq.backend.controller;

import com.scheduleiq.backend.model.Employee;
import com.scheduleiq.backend.model.Role;
import com.scheduleiq.backend.repository.EmployeeRepository;
import com.scheduleiq.backend.security.JwtService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
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
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Invalid email or password."));
        }

        Employee employee = employeeRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Employee not found after auth"));

        UserDetails userDetails = userDetailsService.loadUserByUsername(email);
        String token = jwtService.generateToken(
                Map.of("role", employee.getRole().name(), "name", employee.getName()),
                userDetails);

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
    public ResponseEntity<?> register(@RequestBody Map<String, Object> request) {
        String email = (String) request.get("email");

        if (employeeRepository.findByEmail(email).isPresent()) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(Map.of("error", "An account with this email already exists."));
        }

        Employee employee = Employee.builder()
                .name((String) request.get("name"))
                .email(email)
                .password(passwordEncoder.encode((String) request.get("password")))
                .role(Role.valueOf(((String) request.get("role")).toUpperCase()))
                .baseHourlyRate(Double.parseDouble(request.get("baseHourlyRate").toString()))
                .maxHoursPerWeek(Integer.parseInt(request.get("maxHoursPerWeek").toString()))
                .build();

        employeeRepository.save(employee);

        // Send welcome/onboarding email asynchronously or via safe block so it doesn't block response on error
        try {
            emailNotificationService.sendEmployeeOnboardingEmail(employee.getName(), employee.getEmail());
        } catch (Exception e) {
            System.err.println("SMTP Mail sending failed: " + e.getMessage());
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
