package com.scheduleiq.backend.repository;

import com.scheduleiq.backend.model.ForecastingSignal;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface ForecastingSignalRepository extends JpaRepository<ForecastingSignal, Long> {
    List<ForecastingSignal> findByTimestampBetweenOrderByTimestampAsc(LocalDateTime start, LocalDateTime end);
}
