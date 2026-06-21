package com.scheduleiq.backend.model;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.*;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;
import java.time.LocalDateTime;

@Entity
@EntityListeners(AuditingEntityListener.class)
@Table(
    name = "employees",
    indexes = {
        // Email is already UNIQUE via @Column but we add a named index for clarity in monitoring
        @Index(name = "idx_employees_email", columnList = "email", unique = true),
        // Role index — used in all roster filtering queries
        @Index(name = "idx_employees_role", columnList = "role")
    }
)
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Employee {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank
    @Column(nullable = false)
    private String name;

    @NotBlank
    @Email
    @Column(unique = true, nullable = false)
    private String email;

    @NotBlank
    @Column(nullable = false)
    @JsonProperty(access = JsonProperty.Access.WRITE_ONLY)
    private String password; // Seeded with BCrypt or basic text for demo auth

    @NotNull
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Role role;

    @NotNull
    @Column(name = "base_hourly_rate", nullable = false)
    private Double baseHourlyRate;

    @NotNull
    @Column(name = "max_hours_per_week", nullable = false)
    private Integer maxHoursPerWeek;

    // Running performance/attendance metric (represented in percent 0.0 - 1.0)
    @Column(name = "reliability_score", nullable = false)
    @Builder.Default
    private Double reliabilityScore = 0.95;

    // Running fairness metrics over past 4 weeks
    @Column(name = "fairness_score", nullable = false)
    @Builder.Default
    private Integer fairnessScore = 100;

    @Column(name = "manager_id")
    private Long managerId;

    @Version // CRITICAL: Protects against concurrent modifications and race conditions!
    private Long version;

    @CreatedDate
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
