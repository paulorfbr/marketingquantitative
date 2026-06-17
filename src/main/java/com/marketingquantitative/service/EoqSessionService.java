package com.marketingquantitative.service;

import com.marketingquantitative.dto.*;
import com.marketingquantitative.entity.EoqSession;
import com.marketingquantitative.repository.EoqSessionRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@Service
public class EoqSessionService {

    private final EoqService eoqService;
    private final EoqSessionRepository repository;

    EoqSessionService(EoqService eoqService, EoqSessionRepository repository) {
        this.eoqService = eoqService;
        this.repository = repository;
    }

    @Transactional
    public EoqSessionResponse saveSession(EoqSaveRequest request) {
        EoqResponse result = eoqService.calculate(
            new EoqRequest(request.demand(), request.orderingCost(), request.unitCost(), request.holdingRate())
        );
        EoqSession session = new EoqSession(
            request.name(), request.demand(), request.orderingCost(), request.unitCost(),
            request.holdingRate(), result.eoq(), result.ordersPerYear(),
            result.cycleDays(), result.totalAnnualCost()
        );
        return toResponse(repository.save(session));
    }

    @Transactional(readOnly = true)
    public List<EoqSessionSummary> listSessions() {
        return repository.findTop20ByOrderByCreatedAtDesc().stream()
            .map(s -> new EoqSessionSummary(s.getId(), s.getName(), s.getEoq(), s.getCreatedAt()))
            .toList();
    }

    @Transactional(readOnly = true)
    public EoqSessionResponse getSession(Long id) {
        return repository.findById(id)
            .map(this::toResponse)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "session not found: " + id));
    }

    private EoqSessionResponse toResponse(EoqSession s) {
        return new EoqSessionResponse(
            s.getId(), s.getName(), s.getDemand(), s.getOrderingCost(), s.getUnitCost(),
            s.getHoldingRate(), s.getEoq(), s.getOrdersPerYear(),
            s.getCycleDays(), s.getTotalAnnualCost(), s.getCreatedAt()
        );
    }
}
