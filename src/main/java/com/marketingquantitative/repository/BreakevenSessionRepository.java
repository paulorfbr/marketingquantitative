package com.marketingquantitative.repository;

import com.marketingquantitative.entity.BreakevenSession;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface BreakevenSessionRepository extends JpaRepository<BreakevenSession, Long> {
    List<BreakevenSession> findTop20ByOrderByCreatedAtDesc();
}
