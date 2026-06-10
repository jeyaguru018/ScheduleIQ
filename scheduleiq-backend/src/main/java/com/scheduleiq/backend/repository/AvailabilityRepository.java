package com.scheduleiq.backend.repository;

import com.scheduleiq.backend.model.Availability;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface AvailabilityRepository extends JpaRepository<Availability, Long> {
    List<Availability> findByEmployeeId(Long employeeId);
}
