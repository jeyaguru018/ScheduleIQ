package com.scheduleiq.backend.controller;

import com.scheduleiq.backend.model.Employee;
import com.scheduleiq.backend.model.Role;
import com.scheduleiq.backend.repository.EmployeeRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/employees")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class EmployeeController {

    private final EmployeeRepository employeeRepository;
    private final PasswordEncoder passwordEncoder;

    /** GET /api/employees — List all employees (manager only) */
    @GetMapping
    @PreAuthorize("hasRole('MANAGER')")
    public ResponseEntity<List<Employee>> getAllEmployees() {
        return ResponseEntity.ok(employeeRepository.findAll());
    }

    /** GET /api/employees/me — Current user's profile */
    @GetMapping("/me")
    public ResponseEntity<Employee> getMyProfile(@AuthenticationPrincipal UserDetails userDetails) {
        return employeeRepository.findByEmail(userDetails.getUsername())
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    /** GET /api/employees/{id} */
    @GetMapping("/{id}")
    public ResponseEntity<Employee> getEmployeeById(@PathVariable Long id) {
        return employeeRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    /** PUT /api/employees/me — Update own profile */
    @PutMapping("/me")
    public ResponseEntity<Employee> updateMyProfile(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestBody Map<String, Object> updates) {

        return employeeRepository.findByEmail(userDetails.getUsername())
                .map(employee -> {
                    if (updates.containsKey("name")) {
                        employee.setName((String) updates.get("name"));
                    }
                    if (updates.containsKey("maxHoursPerWeek")) {
                        employee.setMaxHoursPerWeek(Integer.parseInt(updates.get("maxHoursPerWeek").toString()));
                    }
                    if (updates.containsKey("password")) {
                        employee.setPassword(passwordEncoder.encode((String) updates.get("password")));
                    }
                    return ResponseEntity.ok(employeeRepository.save(employee));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    /** PUT /api/employees/{id} — Manager updates any employee */
    @PutMapping("/{id}")
    @PreAuthorize("hasRole('MANAGER')")
    public ResponseEntity<Employee> updateEmployee(
            @PathVariable Long id,
            @RequestBody Map<String, Object> updates) {

        return employeeRepository.findById(id)
                .map(employee -> {
                    if (updates.containsKey("name")) {
                        employee.setName((String) updates.get("name"));
                    }
                    if (updates.containsKey("baseHourlyRate")) {
                        employee.setBaseHourlyRate(Double.parseDouble(updates.get("baseHourlyRate").toString()));
                    }
                    if (updates.containsKey("maxHoursPerWeek")) {
                        employee.setMaxHoursPerWeek(Integer.parseInt(updates.get("maxHoursPerWeek").toString()));
                    }
                    if (updates.containsKey("role")) {
                        employee.setRole(Role.valueOf(((String) updates.get("role")).toUpperCase()));
                    }
                    return ResponseEntity.ok(employeeRepository.save(employee));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    /** DELETE /api/employees/{id} — Manager removes an employee */
    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('MANAGER')")
    public ResponseEntity<Void> deleteEmployee(@PathVariable Long id) {
        if (!employeeRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        employeeRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}
