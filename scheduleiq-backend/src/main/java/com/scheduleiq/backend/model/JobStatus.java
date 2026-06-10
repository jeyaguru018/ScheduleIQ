package com.scheduleiq.backend.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "job_statuses")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class JobStatus {

    @Id
    private String jobId; // UUID assigned to background task

    @NotNull
    @Column(nullable = false)
    private String status; // PENDING, RUNNING, COMPLETED, FAILED

    @NotNull
    @Column(name = "progress_pct", nullable = false)
    @Builder.Default
    private Integer progressPct = 0; // 0 - 100

    @Column(name = "error_message")
    private String errorMessage;

    @NotNull
    @Column(name = "created_at", nullable = false)
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();
}
