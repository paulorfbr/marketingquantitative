package com.marketingquantitative.service;

import com.marketingquantitative.dto.*;
import com.marketingquantitative.entity.BreakevenSession;
import com.marketingquantitative.repository.BreakevenSessionRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@Service
public class BreakevenSessionService {

    private final BreakevenService breakevenService;
    private final BreakevenSessionRepository repository;

    BreakevenSessionService(BreakevenService breakevenService, BreakevenSessionRepository repository) {
        this.breakevenService = breakevenService;
        this.repository = repository;
    }

    @Transactional
    public BreakevenSessionResponse saveSession(BreakevenSaveRequest request) {
        BreakevenResponse result = breakevenService.calculate(
            new BreakevenRequest(request.fixedCosts(), request.variableCostPerUnit(), request.pricePerUnit())
        );
        BreakevenSession session = new BreakevenSession(
            request.name(), request.fixedCosts(), request.variableCostPerUnit(), request.pricePerUnit(),
            result.breakEvenQty(), result.breakEvenRevenue(),
            result.contributionMargin(), result.marginRatio()
        );
        return toResponse(repository.save(session));
    }

    @Transactional(readOnly = true)
    public List<BreakevenSessionSummary> listSessions() {
        return repository.findTop20ByOrderByCreatedAtDesc().stream()
            .map(s -> new BreakevenSessionSummary(s.getId(), s.getName(), s.getBreakEvenQty(), s.getCreatedAt()))
            .toList();
    }

    @Transactional(readOnly = true)
    public BreakevenSessionResponse getSession(Long id) {
        return repository.findById(id)
            .map(this::toResponse)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "session not found: " + id));
    }

    private BreakevenSessionResponse toResponse(BreakevenSession s) {
        return new BreakevenSessionResponse(
            s.getId(), s.getName(), s.getFixedCosts(), s.getVariableCostPerUnit(), s.getPricePerUnit(),
            s.getBreakEvenQty(), s.getBreakEvenRevenue(), s.getContributionMargin(),
            s.getMarginRatio(), s.getCreatedAt()
        );
    }
}
