package com.scheduleiq.backend.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;
import java.time.LocalDateTime;

@Entity
@EntityListeners(AuditingEntityListener.class)
@Table(
    name = "shifts",
    indexes = {
        // Composite index: the primary query pattern is always date-range lookups
        @Index(name = "idx_shifts_start_end", columnList = "start_time, end_time"),
        // Single column index for employee-specific shift queries
        @Index(name = "idx_shifts_employee_id", columnList = "employee_id"),
        // Status index for filtering DRAFT/PUBLISHED shifts efficiently
        @Index(name = "idx_shifts_status", columnList = "status")
    }
)
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

    @Column(name = "actual_start_time")
    private LocalDateTime actualStartTime;

    @Column(name = "actual_end_time")
    private LocalDateTime actualEndTime;

    @Column(name = "clock_status")
    private String clockStatus; // null, "CLOCKED_IN", "CLOCKED_OUT"

    @Version // CRITICAL: Guards against double-allocation or race swaps
    private Long version;

    @CreatedDate
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
