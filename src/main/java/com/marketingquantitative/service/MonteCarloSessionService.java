package com.marketingquantitative.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.marketingquantitative.dto.*;
import com.marketingquantitative.entity.MonteCarloSession;
import com.marketingquantitative.repository.MonteCarloSessionRepository;
import com.marketingquantitative.shared.InputDistribution;
import com.marketingquantitative.shared.ModelType;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Map;

@Service
public class MonteCarloSessionService {

    private final MonteCarloService monteCarloService;
    private final MonteCarloSessionRepository repository;
    private final ObjectMapper objectMapper;

    MonteCarloSessionService(MonteCarloService monteCarloService,
                              MonteCarloSessionRepository repository,
                              ObjectMapper objectMapper) {
        this.monteCarloService = monteCarloService;
        this.repository = repository;
        this.objectMapper = objectMapper;
    }

    @Transactional
    public MonteCarloSessionResponse saveSession(MonteCarloSaveRequest request) {
        MonteCarloResponse result = monteCarloService.simulate(
            new MonteCarloRequest(request.model(), request.inputs(), request.iterations())
        );
        try {
            MonteCarloSession session = new MonteCarloSession(
                request.name(),
                request.model().name(),
                objectMapper.writeValueAsString(request.inputs()),
                request.iterations(),
                objectMapper.writeValueAsString(result)
            );
            return toResponse(repository.save(session));
        } catch (Exception e) {
            throw new RuntimeException("Failed to serialize session", e);
        }
    }

    @Transactional(readOnly = true)
    public List<MonteCarloSessionSummary> listSessions() {
        return repository.findTop20ByOrderByCreatedAtDesc().stream()
            .map(s -> new MonteCarloSessionSummary(
                s.getId(), s.getName(), ModelType.valueOf(s.getModel()),
                s.getIterations(), s.getCreatedAt()))
            .toList();
    }

    @Transactional(readOnly = true)
    public MonteCarloSessionResponse getSession(Long id) {
        return repository.findById(id)
            .map(this::toResponse)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "session not found: " + id));
    }

    private MonteCarloSessionResponse toResponse(MonteCarloSession s) {
        try {
            Map<String, InputDistribution> inputs = objectMapper.readValue(
                s.getInputsJson(), new TypeReference<>() {});
            MonteCarloResponse results = objectMapper.readValue(
                s.getResultsJson(), MonteCarloResponse.class);
            return new MonteCarloSessionResponse(
                s.getId(), s.getName(), ModelType.valueOf(s.getModel()),
                inputs, s.getIterations(), results, s.getCreatedAt());
        } catch (Exception e) {
            throw new RuntimeException("Failed to deserialize session", e);
        }
    }
}
