package com.scheduleiq.backend.repository;

import com.scheduleiq.backend.model.Shift;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface ShiftRepository extends JpaRepository<Shift, Long> {
    List<Shift> findByStartTimeBetween(LocalDateTime start, LocalDateTime end);
    List<Shift> findByEmployeeIdAndStartTimeBetween(Long employeeId, LocalDateTime start, LocalDateTime end);
    List<Shift> findByEmployeeIsNullAndStartTimeBetween(LocalDateTime start, LocalDateTime end);
    List<Shift> findByNoShowRiskGreaterThanEqual(Double threshold);
}
