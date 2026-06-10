package com.scheduleiq.backend.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.NotBlank;
import lombok.*;
import java.time.LocalDate;

@Entity
@Table(name = "leave_requests")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LeaveRequest {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "employee_id", nullable = false)
    private Employee employee;

    @NotNull
    @Column(name = "leave_date", nullable = false)
    private LocalDate leaveDate;

    @Column(name = "reason")
    private String reason;

    @NotBlank
    @Column(nullable = false)
    @Builder.Default
    private String status = "PENDING"; // APPROVED, PENDING, REJECTED
}
