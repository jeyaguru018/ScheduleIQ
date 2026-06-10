package com.scheduleiq.backend.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "shifts")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Shift {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Shift can be unassigned/open during optimization solver phases
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "employee_id")
    private Employee employee;

    @NotNull
    @Column(name = "start_time", nullable = false)
    private LocalDateTime startTime;

    @NotNull
    @Column(name = "end_time", nullable = false)
    private LocalDateTime endTime;

    @NotNull
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Role role;

    @NotNull
    @Column(nullable = false)
    @Builder.Default
    private String status = "DRAFT"; // DRAFT, PUBLISHED, WAITING_SWAP

    // Dynamic warning scoring derived from scikit-learn classifier model
    @Column(name = "no_show_risk")
    @Builder.Default
    private Double noShowRisk = 0.0;

    @Version // CRITICAL: Guards against double-allocation or race swaps
    private Long version;
}
