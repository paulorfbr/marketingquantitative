package com.marketingquantitative.repository;

import com.marketingquantitative.entity.MonteCarloSession;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface MonteCarloSessionRepository extends JpaRepository<MonteCarloSession, Long> {
    List<MonteCarloSession> findTop20ByOrderByCreatedAtDesc();
}
