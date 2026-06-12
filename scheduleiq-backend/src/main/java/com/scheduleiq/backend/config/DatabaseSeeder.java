package com.scheduleiq.backend.config;

import com.scheduleiq.backend.model.*;
import com.scheduleiq.backend.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Random;

@Component
@RequiredArgsConstructor
public class DatabaseSeeder implements CommandLineRunner {

    private final EmployeeRepository employeeRepository;
    private final AvailabilityRepository availabilityRepository;
    private final ForecastingSignalRepository forecastingSignalRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    public void run(String... args) throws Exception {
        if (forecastingSignalRepository.count() > 0) {
            System.out.println(">>> Database already seeded. Skipping initial seeding.");
            return;
        }

        System.out.println(">>> Initializing ScheduleIQ Database Seeder (Chennai context)...");

        // --- MOCK EMPLOYEE SEEDING DISABLED ---
        // We will start with a truly clean slate (0 employees).
        /*
        // 1. Seed Core Employees — passwords are BCrypt-hashed for Spring Security compatibility
        String defaultPassword = passwordEncoder.encode("password123");

        Employee manager = Employee.builder()
                .name("Jane Doe")
                .email("jane@company.com")
                .password(defaultPassword)
                .role(Role.MANAGER)
                .baseHourlyRate(250.0) // ₹250/hr
                .maxHoursPerWeek(48)
                .reliabilityScore(1.0)
                .fairnessScore(100)
                .build();

        Employee employee1 = Employee.builder()
                .name("Meena Iyer")
                .email("meena@company.com")
                .password(defaultPassword)
                .role(Role.LEAD_CASHIER)
                .baseHourlyRate(150.0) // ₹150/hr
                .maxHoursPerWeek(40)
                .reliabilityScore(0.98)
                .fairnessScore(87)
                .build();

        Employee employee2 = Employee.builder()
                .name("Vikram Singh")
                .email("vikram@company.com")
                .password(defaultPassword)
                .role(Role.STOCKER)
                .baseHourlyRate(110.0)
                .maxHoursPerWeek(45)
                .reliabilityScore(0.92)
                .fairnessScore(84)
                .build();

        Employee employee3 = Employee.builder()
                .name("Ananya Krishnan")
                .email("ananya@company.com")
                .password(defaultPassword)
                .role(Role.CASHIER)
                .baseHourlyRate(120.0)
                .maxHoursPerWeek(35)
                .reliabilityScore(0.96)
                .fairnessScore(92)
                .build();

        Employee employee4 = Employee.builder()
                .name("Rahul Verma")
                .email("rahul@company.com")
                .password(defaultPassword)
                .role(Role.DELIVERY_BOY)
                .baseHourlyRate(90.0)
                .maxHoursPerWeek(48)
                .reliabilityScore(0.88)
                .fairnessScore(78)
                .build();

        Employee employee5 = Employee.builder()
                .name("Priya Sharma")
                .email("priya@company.com")
                .password(defaultPassword)
                .role(Role.CASHIER)
                .baseHourlyRate(120.0)
                .maxHoursPerWeek(30)
                .reliabilityScore(0.97)
                .fairnessScore(95)
                .build();

        List<Employee> employees = new java.util.ArrayList<>(List.of(manager, employee1, employee2, employee3, employee4, employee5));
        employeeRepository.saveAll(java.util.Objects.requireNonNull(employees));
        System.out.println("Seeded " + employees.size() + " employees.");

        // 2. Seed Availabilities (Recurring weekday preferences)
        List<Availability> availabilities = new ArrayList<>();
        for (Employee emp : employees) {
            if (emp.getRole() == Role.MANAGER) continue;
            // Employees generally prefer working Monday to Friday 9 AM to 6 PM
            for (int day = 1; day <= 5; day++) {
                availabilities.add(Availability.builder()
                        .employee(emp)
                        .dayOfWeek(day)
                        .startTime(LocalTime.of(9, 0))
                        .endTime(LocalTime.of(18, 0))
                        .build());
            }
            // Some also accept weekend shifts
            if (emp.getRole() == Role.STOCKER || emp.getRole() == Role.DELIVERY_BOY) {
                availabilities.add(Availability.builder()
                        .employee(emp)
                        .dayOfWeek(6) // Saturday
                        .startTime(LocalTime.of(10, 0))
                        .endTime(LocalTime.of(22, 0))
                        .build());
            }
        }
        availabilityRepository.saveAll(availabilities);
        System.out.println("Seeded preferred availabilities.");
        */

        // 3. Seed 6-Month Historical Demand Signals (Chennai Monsoon, Surges, Holidays)
        System.out.println("Generating 180 days of hourly footfall signal history (Please wait)...");
        List<ForecastingSignal> signals = new ArrayList<>();
        LocalDateTime startTime = LocalDateTime.now().minusDays(180).withMinute(0).withSecond(0).withNano(0);
        Random rand = new Random(42); // Seed for deterministic output

        // Chennai monsoon happens around Oct - Dec (Nov is peak rain month)
        // Public holidays (Pongal - Jan, Diwali - Nov/Oct, Independence day - Aug)
        for (int hourIndex = 0; hourIndex < 180 * 24; hourIndex++) {
            LocalDateTime currentTime = startTime.plusHours(hourIndex);
            
            // Base hourly profile: retail peak between 10am and 9pm
            int hour = currentTime.getHour();
            int baseFootfall = 10; // quiet night
            if (hour >= 9 && hour <= 21) {
                baseFootfall = 45 + rand.nextInt(30);
                if (hour >= 17 && hour <= 20) {
                    baseFootfall += 40; // Evening rush
                }
            }

            // Weekend multiplier (Fri, Sat, Sun)
            int dayOfWeek = currentTime.getDayOfWeek().getValue();
            if (dayOfWeek >= 5) {
                baseFootfall = (int)(baseFootfall * 1.5);
            }

            // Monsoon seasonality modifier (November has Chennai monsoons: heavy rain drops footfalls)
            double rainProb = 0.05;
            int month = currentTime.getMonthValue();
            if (month == 11 || month == 12) {
                rainProb = 0.60;
                if (rand.nextDouble() < 0.4) {
                    baseFootfall = (int)(baseFootfall * 0.6); // rain reduces store footfall
                }
            }

            // Indian Holiday boosts (Diwali/Pongal/Independence day)
            boolean isHoliday = false;
            if ((month == 11 && currentTime.getDayOfMonth() == 12) || // Diwali mock
                (month == 1 && currentTime.getDayOfMonth() == 15)) { // Pongal mock
                isHoliday = true;
                baseFootfall = (int)(baseFootfall * 2.2); // Massive shopping surge
            }

            signals.add(ForecastingSignal.builder()
                    .timestamp(currentTime)
                    .footfall(baseFootfall)
                    .rainProbability(rainProb)
                    .isHoliday(isHoliday)
                    .build());

            // Save in batches to avoid memory overload
            if (signals.size() >= 1000) {
                forecastingSignalRepository.saveAll(signals);
                signals.clear();
            }
        }
        if (!signals.isEmpty()) {
            forecastingSignalRepository.saveAll(signals);
        }
        System.out.println("Seeded 4,320 hourly demand snapshots successfully!");
    }
}
