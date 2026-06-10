package com.scheduleiq.backend.repository;

import com.scheduleiq.backend.model.LeaveRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.time.LocalDate;
import java.util.List;

@Repository
public interface LeaveRequestRepository extends JpaRepository<LeaveRequest, Long> {
    List<LeaveRequest> findByEmployeeId(Long employeeId);
    List<LeaveRequest> findByEmployee(com.scheduleiq.backend.model.Employee employee);
    List<LeaveRequest> findByLeaveDateBetween(LocalDate start, LocalDate end);
}
