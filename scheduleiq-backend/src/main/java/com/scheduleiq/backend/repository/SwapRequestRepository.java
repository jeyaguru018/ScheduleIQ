package com.scheduleiq.backend.repository;

import com.scheduleiq.backend.model.SwapRequest;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface SwapRequestRepository extends JpaRepository<SwapRequest, Long> {
    
    @Override
    @EntityGraph(attributePaths = {"requesterShift", "targetShift", "requester", "targetEmployee"})
    List<SwapRequest> findAll();

    @EntityGraph(attributePaths = {"requesterShift", "targetShift", "requester", "targetEmployee"})
    List<SwapRequest> findByStatus(String status);

    @EntityGraph(attributePaths = {"requesterShift", "targetShift", "requester", "targetEmployee"})
    List<SwapRequest> findByRequesterId(Long requesterId);

    @EntityGraph(attributePaths = {"requesterShift", "targetShift", "requester", "targetEmployee"})
    List<SwapRequest> findByTargetEmployeeId(Long targetEmployeeId);
}
