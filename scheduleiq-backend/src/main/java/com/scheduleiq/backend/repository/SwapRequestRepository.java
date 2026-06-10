package com.scheduleiq.backend.repository;

import com.scheduleiq.backend.model.SwapRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface SwapRequestRepository extends JpaRepository<SwapRequest, Long> {
    List<SwapRequest> findByStatus(String status);
    List<SwapRequest> findByRequesterId(Long requesterId);
    List<SwapRequest> findByTargetEmployeeId(Long targetEmployeeId);
}
