package com.scheduleiq.backend.controller;

import com.scheduleiq.backend.model.Employee;
import com.scheduleiq.backend.model.Role;
import com.scheduleiq.backend.repository.EmployeeRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.cache.annotation.Caching;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/employees")
@RequiredArgsConstructor
@Slf4j
public class EmployeeController {

    private final EmployeeRepository employeeRepository;
    private final PasswordEncoder passwordEncoder;

    /** GET /api/employees — List all employees (manager only). Cached for 5 minutes. */
    @GetMapping
    @PreAuthorize("hasRole('MANAGER')")
    @Cacheable(value = "employees")
    public ResponseEntity<List<Employee>> getAllEmployees() {
        log.debug("Cache miss: fetching all employees from database");
        return ResponseEntity.ok(employeeRepository.findAll());
    }

    /** GET /api/employees/me — Current user's profile. Cached by email. */
    @GetMapping("/me")
    public ResponseEntity<Employee> getMyProfile(@AuthenticationPrincipal UserDetails userDetails) {
        return employeeRepository.findByEmail(userDetails.getUsername())
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    /** GET /api/employees/{id} — Individual employee profile. Cached by ID. */
    @GetMapping("/{id}")
    @Cacheable(value = "employeeById", key = "#id")
    public ResponseEntity<Employee> getEmployeeById(@PathVariable Long id) {
        log.debug("Cache miss: fetching employee [{}] from database", id);
        return employeeRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    /** PUT /api/employees/me — Update own profile. Evicts affected caches. */
    @PutMapping("/me")
    @Transactional
    @CacheEvict(value = "employees", allEntries = true)
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
                    Employee saved = employeeRepository.save(employee);
                    log.info("Employee [{}] updated their profile", employee.getId());
                    return ResponseEntity.ok(saved);
                })
                .orElse(ResponseEntity.notFound().build());
    }

    /** PUT /api/employees/{id} — Manager updates any employee. Evicts all employee caches. */
    @PutMapping("/{id}")
    @PreAuthorize("hasRole('MANAGER')")
    @Transactional
    @Caching(evict = {
        @CacheEvict(value = "employees", allEntries = true),
        @CacheEvict(value = "employeeById", key = "#id")
    })
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
                    Employee saved = employeeRepository.save(employee);
                    log.info("Manager updated employee [{}]", employee.getId());
                    return ResponseEntity.ok(saved);
                })
                .orElse(ResponseEntity.notFound().build());
    }

    /** DELETE /api/employees/{id} — Manager removes an employee. Evicts all employee caches. */
    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('MANAGER')")
    @Transactional
    @Caching(evict = {
        @CacheEvict(value = "employees", allEntries = true),
        @CacheEvict(value = "employeeById", key = "#id")
    })
    public ResponseEntity<Void> deleteEmployee(@PathVariable Long id) {
        if (!employeeRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        employeeRepository.deleteById(id);
        log.info("Employee [{}] deleted by manager", id);
        return ResponseEntity.noContent().build();
    }
}

