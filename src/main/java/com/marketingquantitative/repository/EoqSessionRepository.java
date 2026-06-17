package com.marketingquantitative.repository;

import com.marketingquantitative.entity.EoqSession;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface EoqSessionRepository extends JpaRepository<EoqSession, Long> {
    List<EoqSession> findTop20ByOrderByCreatedAtDesc();
}
