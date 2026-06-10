package com.scheduleiq.backend.controller;

import com.scheduleiq.backend.repository.EmployeeRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Profile;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * DEV-ONLY utility controller for initializing demo account passwords.
 * This controller is ONLY active on the "default" (local) profile.
 * It is automatically excluded in production by using @Profile("!prod").
 *
 * Usage: POST http://localhost:8080/api/dev/reset-passwords
 * This must be called ONCE after first startup to BCrypt-hash the seeded plain-text passwords.
 */
@RestController
@RequestMapping("/api/dev")
@RequiredArgsConstructor
public class DevUtilController {

    private final EmployeeRepository employeeRepository;
    private final PasswordEncoder passwordEncoder;

    /**
     * One-time endpoint: re-hashes all employee passwords with BCrypt.
     * Safe to call multiple times — it won't re-hash already-hashed passwords.
     */
    @PostMapping("/reset-passwords")
    public ResponseEntity<Map<String, Object>> resetDemoPasswords(
            @RequestParam(defaultValue = "password123") String newPassword,
            @RequestParam(defaultValue = "false") boolean force) {

        var employees = employeeRepository.findAll();
        int updated = 0;
        String newHash = passwordEncoder.encode(newPassword);

        for (var emp : employees) {
            String currentPassword = emp.getPassword();
            // Update if: force=true, OR password not already a valid BCrypt hash
            boolean needsUpdate = force || currentPassword == null || !currentPassword.startsWith("$2");
            if (needsUpdate) {
                emp.setPassword(newHash);
                employeeRepository.save(emp);
                updated++;
            }
        }

        return ResponseEntity.ok(Map.of(
                "message", "Password reset complete.",
                "totalEmployees", employees.size(),
                "updated", updated,
                "skipped", employees.size() - updated,
                "newPasswordUsed", newPassword,
                "generatedHash", newHash
        ));
    }

    /** Returns a sample BCrypt hash for the given password — useful for SQL scripts. */
    @GetMapping("/hash")
    public ResponseEntity<Map<String, String>> generateHash(
            @RequestParam(defaultValue = "password123") String password) {
        String hash = passwordEncoder.encode(password);
        return ResponseEntity.ok(Map.of(
                "password", password,
                "bcryptHash", hash
        ));
    }
}
