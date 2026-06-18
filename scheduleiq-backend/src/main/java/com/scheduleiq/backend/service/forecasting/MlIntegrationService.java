package com.scheduleiq.backend.service.forecasting;

import com.scheduleiq.backend.model.*;
import com.scheduleiq.backend.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpMethod;
import java.util.Objects;
import java.util.*;
import java.time.LocalDateTime;
import java.time.LocalDate;

@Service
@RequiredArgsConstructor
public class MlIntegrationService {

    private final ShiftRepository shiftRepository;
    private final EmployeeRepository employeeRepository;
    private final LeaveRequestRepository leaveRequestRepository;
    private final ForecastingSignalRepository forecastingSignalRepository;
    private final RestTemplate restTemplate = new RestTemplate();

    @Value("${app.ml-service.url:http://localhost:8000}")
    private String mlServiceUrl;

    @SuppressWarnings("unchecked")
    public List<Map<String, Object>> predictDemand(LocalDateTime start, LocalDateTime end) {
        // Fetch last 30 days of historical data
        LocalDateTime historyEnd = LocalDateTime.now();
        LocalDateTime historyStart = historyEnd.minusDays(30);
        List<ForecastingSignal> history = forecastingSignalRepository.findByTimestampBetweenOrderByTimestampAsc(historyStart, historyEnd);

        if (history.isEmpty()) {
            System.out.println("No history found in database for demand prediction, returning empty predictions");
            return Collections.emptyList();
        }

        try {
            String url = mlServiceUrl + "/predict/demand";
            
            List<Map<String, Object>> historyList = new ArrayList<>();
            for (ForecastingSignal sig : history) {
                historyList.add(Map.of(
                        "timestamp", sig.getTimestamp().toString(),
                        "footfall", sig.getFootfall(),
                        "rain_probability", sig.getRainProbability(),
                        "is_holiday", sig.getIsHoliday()
                ));
            }

            Map<String, Object> reqBody = Map.of("history", historyList);
            HttpEntity<Map<String, Object>> httpEntity = new HttpEntity<>(reqBody);
            
            ResponseEntity<Map<String, Object>> response = restTemplate.exchange(
                    url,
                    HttpMethod.POST,
                    httpEntity,
                    new ParameterizedTypeReference<Map<String, Object>>() {}
            );

            Map<String, Object> body = response.getBody();
            if (response.getStatusCode().is2xxSuccessful() && body != null) {
                return (List<Map<String, Object>>) body.get("predictions");
            }
        } catch (Exception e) {
            System.err.println("Failed calling Python ML demand prediction service: " + e.getMessage());
        }

        // Fallback: generate synthetic forecasting values for the requested start-end range
        List<Map<String, Object>> fallback = new ArrayList<>();
        LocalDateTime cur = start;
        Random rand = new Random(42);
        while (cur.isBefore(end)) {
            int hour = cur.getHour();
            int baseFootfall = 10;
            if (hour >= 9 && hour <= 21) {
                baseFootfall = 45 + rand.nextInt(30);
                if (hour >= 17 && hour <= 20) {
                    baseFootfall += 40;
                }
            }
            int dayOfWeek = cur.getDayOfWeek().getValue();
            if (dayOfWeek >= 5) {
                baseFootfall = (int)(baseFootfall * 1.5);
            }
            fallback.add(Map.of(
                "timestamp", cur.toString(),
                "predicted_footfall", baseFootfall,
                "required_staff", Math.max(1, Math.min(8, (int) Math.ceil(baseFootfall / 15.0)))
            ));
            cur = cur.plusHours(1);
        }
        return fallback;
    }

    public void evaluateNoShowRisks(List<Shift> shifts) {
        for (Shift shift : shifts) {
            if (shift.getEmployee() == null) continue;

            Employee emp = shift.getEmployee();
            boolean isWeekend = shift.getStartTime().getDayOfWeek().getValue() >= 6;
            boolean isNight = shift.getStartTime().getHour() >= 18 || shift.getStartTime().getHour() < 6;

            // Simple mock weather parameter (representing rains)
            double mockRainProb = 0.05;
            if (shift.getStartTime().getMonthValue() == 11) {
                mockRainProb = 0.55; // Monsoons in Chennai!
            }

            try {
                String url = mlServiceUrl + "/predict/noshow";
                Map<String, Object> req = Map.of(
                        "reliability", emp.getReliabilityScore(),
                        "is_weekend", isWeekend,
                        "is_night_shift", isNight,
                        "rain_probability", mockRainProb
                );

                HttpEntity<Map<String, Object>> httpEntity = new HttpEntity<>(Objects.requireNonNull(req));
                ResponseEntity<Map<String, Object>> response = restTemplate.exchange(
                        url,
                        Objects.requireNonNull(HttpMethod.POST),
                        httpEntity,
                        new ParameterizedTypeReference<Map<String, Object>>() {}
                );
                Map<String, Object> body = response.getBody();
                if (response.getStatusCode().is2xxSuccessful() && body != null) {
                    Object val = body.get("no_show_probability");
                    Double risk = val instanceof Number ? ((Number) val).doubleValue() : null;
                    shift.setNoShowRisk(risk);
                    shiftRepository.save(Objects.requireNonNull(shift));
                }
            } catch (Exception e) {
                System.err.println("Failed calling Python ML service: " + e.getMessage());
                // Fallback to static risk scoring logic if ML service is down
                double fallback = (1.0 - emp.getReliabilityScore()) * 0.7;
                shift.setNoShowRisk(fallback);
                shiftRepository.save(shift);
            }
        }
    }

    // Resolves backup workers who satisfy hard constraints (leave requests, overlaps, skills)
    public List<Employee> getBackupWorkersForShift(Long shiftId) {
        Shift shift = shiftRepository.findById(Objects.requireNonNull(shiftId))
                .orElseThrow(() -> new IllegalArgumentException("Invalid Shift ID"));

        List<Employee> allEmployees = employeeRepository.findAll();
        List<Employee> eligibleBackups = new ArrayList<>();

        for (Employee emp : allEmployees) {
            // Cannot back up if already assigned to this shift
            if (shift.getEmployee() != null && shift.getEmployee().getId().equals(emp.getId())) continue;

            // Must match role or have backup compatibility (e.g. Lead Cashier can cover Cashier)
            if (shift.getRole() == Role.CASHIER && emp.getRole() != Role.CASHIER && emp.getRole() != Role.LEAD_CASHIER) continue;
            if (shift.getRole() == Role.STOCKER && emp.getRole() != Role.STOCKER) continue;
            if (shift.getRole() == Role.DELIVERY_BOY && emp.getRole() != Role.DELIVERY_BOY) continue;

            // Must not overlap with any of their currently assigned shifts
            List<Shift> empShifts = shiftRepository.findByEmployeeIdAndStartTimeBetween(
                    emp.getId(), shift.getStartTime().minusHours(12), shift.getEndTime().plusHours(12));
            
            boolean overlaps = false;
            for (Shift s : empShifts) {
                if (shiftsOverlap(s, shift)) {
                    overlaps = true;
                    break;
                }
            }
            if (overlaps) continue;

            // Must not have an approved leave request on the shift date
            List<LeaveRequest> leaves = leaveRequestRepository.findByEmployeeId(emp.getId());
            boolean onLeave = false;
            for (LeaveRequest leave : leaves) {
                if ("APPROVED".equals(leave.getStatus()) && leave.getLeaveDate().equals(shift.getStartTime().toLocalDate())) {
                    onLeave = true;
                    break;
                }
            }
            if (onLeave) continue;

            eligibleBackups.add(emp);
        }

        // Sort backups by their reliability score (highest first)
        eligibleBackups.sort((e1, e2) -> Double.compare(e2.getReliabilityScore(), e1.getReliabilityScore()));
        return eligibleBackups;
    }

    private boolean shiftsOverlap(Shift s1, Shift s2) {
        return s1.getStartTime().isBefore(s2.getEndTime()) && s2.getStartTime().isBefore(s1.getEndTime());
    }
}
