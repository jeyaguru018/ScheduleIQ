package com.scheduleiq.backend.controller;

import com.scheduleiq.backend.model.ForecastingSignal;
import com.scheduleiq.backend.repository.ForecastingSignalRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/api/demand")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class DemandController {

    private final ForecastingSignalRepository forecastingSignalRepository;

    @GetMapping
    public ResponseEntity<List<ForecastingSignal>> getDemandSignals(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime start,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime end) {
        
        List<ForecastingSignal> signals = forecastingSignalRepository.findByTimestampBetweenOrderByTimestampAsc(start, end);
        return ResponseEntity.ok(signals);
    }
}
