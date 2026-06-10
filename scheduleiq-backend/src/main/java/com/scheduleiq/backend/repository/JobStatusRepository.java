package com.scheduleiq.backend.repository;

import com.scheduleiq.backend.model.JobStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface JobStatusRepository extends JpaRepository<JobStatus, String> {
}
