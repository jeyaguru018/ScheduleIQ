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
    private final com.scheduleiq.backend.service.forecasting.MlIntegrationService mlIntegrationService;

    @GetMapping
    public ResponseEntity<List<ForecastingSignal>> getDemandSignals(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime start,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime end) {
        
        List<ForecastingSignal> signals = forecastingSignalRepository.findByTimestampBetweenOrderByTimestampAsc(start, end);
        if (signals.isEmpty() && start.isAfter(LocalDateTime.now().minusDays(1))) {
            List<java.util.Map<String, Object>> predictions = mlIntegrationService.predictDemand(start, end);
            List<ForecastingSignal> predictedSignals = new java.util.ArrayList<>();
            for (java.util.Map<String, Object> pred : predictions) {
                predictedSignals.add(ForecastingSignal.builder()
                        .timestamp(parseDateTime(pred.get("timestamp").toString()))
                        .footfall(((Number) pred.get("predicted_footfall")).intValue())
                        .rainProbability(0.0)
                        .isHoliday(false)
                        .build());
            }
            return ResponseEntity.ok(predictedSignals);
        }
        return ResponseEntity.ok(signals);
    }

    private LocalDateTime parseDateTime(String ts) {
        try {
            if (ts.contains("+")) {
                ts = ts.substring(0, ts.indexOf("+"));
            }
            if (ts.contains("Z")) {
                ts = ts.substring(0, ts.indexOf("Z"));
            }
            return LocalDateTime.parse(ts);
        } catch (Exception e) {
            return LocalDateTime.now();
        }
    }
}
