package com.scheduleiq.backend.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import lombok.*;

@Entity
@Table(name = "swap_requests")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SwapRequest {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "requester_shift_id", nullable = false)
    private Shift requesterShift;

    // Optional target shift if peer-to-peer shift exchange is requested
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "target_shift_id")
    private Shift targetShift;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "requester_employee_id", nullable = false)
    private Employee requester;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "target_employee_id")
    private Employee targetEmployee;

    @NotBlank
    @Column(nullable = false)
    @Builder.Default
    private String status = "PENDING"; // PENDING, APPROVED, REJECTED
}
