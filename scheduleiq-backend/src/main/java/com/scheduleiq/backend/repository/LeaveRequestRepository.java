package com.scheduleiq.backend.repository;

import com.scheduleiq.backend.model.LeaveRequest;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.time.LocalDate;
import java.util.List;

@Repository
public interface LeaveRequestRepository extends JpaRepository<LeaveRequest, Long> {
    
    @Override
    @EntityGraph(attributePaths = {"employee"})
    List<LeaveRequest> findAll();

    @EntityGraph(attributePaths = {"employee"})
    List<LeaveRequest> findByEmployeeId(Long employeeId);

    @EntityGraph(attributePaths = {"employee"})
    List<LeaveRequest> findByEmployee(com.scheduleiq.backend.model.Employee employee);

    @EntityGraph(attributePaths = {"employee"})
    List<LeaveRequest> findByLeaveDateBetween(LocalDate start, LocalDate end);

    @Override
    @EntityGraph(attributePaths = {"employee"})
    java.util.Optional<LeaveRequest> findById(Long id);
}
