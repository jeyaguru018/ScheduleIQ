package com.scheduleiq.backend.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "forecasting_signals")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ForecastingSignal {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotNull
    @Column(name = "timestamp", unique = true, nullable = false)
    private LocalDateTime timestamp;

    @NotNull
    @Column(nullable = false)
    private Integer footfall; // Count of orders or customers in this hour

    @NotNull
    @Column(name = "rain_probability", nullable = false)
    private Double rainProbability; // 0.0 - 1.0 (Chennai monsoon impact signal)

    @NotNull
    @Column(name = "is_holiday", nullable = false)
    private Boolean isHoliday; // Indian public holidays or major festival days
}
