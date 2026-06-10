package com.scheduleiq.backend.controller;

import com.scheduleiq.backend.model.Employee;
import com.scheduleiq.backend.model.Shift;
import com.scheduleiq.backend.repository.ShiftRepository;
import com.scheduleiq.backend.service.forecasting.MlIntegrationService;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/attendance")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class AttendanceController {

    private final MlIntegrationService mlIntegrationService;
    private final ShiftRepository shiftRepository;

    @PostMapping("/evaluate")
    public ResponseEntity<Map<String, String>> evaluateRisks(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime start,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime end) {
        
        List<Shift> shifts = shiftRepository.findByStartTimeBetween(start, end);
        mlIntegrationService.evaluateNoShowRisks(shifts);

        return ResponseEntity.ok(Map.of("message", "No-show risk factors evaluated and updated in DB."));
    }

    @GetMapping("/backups/{shiftId}")
    public ResponseEntity<List<Employee>> getBackups(@PathVariable Long shiftId) {
        List<Employee> backups = mlIntegrationService.getBackupWorkersForShift(shiftId);
        return ResponseEntity.ok(backups);
    }

    @GetMapping("/alerts")
    public ResponseEntity<List<Shift>> getAlerts(@RequestParam(defaultValue = "0.15") Double threshold) {
        return ResponseEntity.ok(shiftRepository.findByNoShowRiskGreaterThanEqual(threshold));
    }
}
