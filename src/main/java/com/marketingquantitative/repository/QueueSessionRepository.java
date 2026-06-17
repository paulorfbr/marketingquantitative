package com.marketingquantitative.repository;

import com.marketingquantitative.entity.QueueSession;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface QueueSessionRepository extends JpaRepository<QueueSession, Long> {
    List<QueueSession> findTop20ByOrderByCreatedAtDesc();
}
