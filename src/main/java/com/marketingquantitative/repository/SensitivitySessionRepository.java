package com.marketingquantitative.repository;

import com.marketingquantitative.entity.SensitivitySession;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface SensitivitySessionRepository extends JpaRepository<SensitivitySession, Long> {
    List<SensitivitySession> findTop20ByOrderByCreatedAtDesc();
}
