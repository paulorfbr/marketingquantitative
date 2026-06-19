package com.marketingquantitative.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.marketingquantitative.dto.*;
import com.marketingquantitative.entity.SensitivitySession;
import com.marketingquantitative.repository.SensitivitySessionRepository;
import com.marketingquantitative.shared.ModelType;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Map;

@Service
public class SensitivitySessionService {

    private final SensitivityService sensitivityService;
    private final SensitivitySessionRepository repository;
    private final ObjectMapper objectMapper;

    SensitivitySessionService(SensitivityService sensitivityService,
                               SensitivitySessionRepository repository,
                               ObjectMapper objectMapper) {
        this.sensitivityService = sensitivityService;
        this.repository = repository;
        this.objectMapper = objectMapper;
    }

    @Transactional
    public SensitivitySessionResponse saveSession(SensitivitySaveRequest request) {
        SensitivityResponse result = sensitivityService.calculate(
            new SensitivityRequest(request.model(), request.baseInputs(), request.swingPercent())
        );
        try {
            SensitivitySession session = new SensitivitySession(
                request.name(),
                request.model().name(),
                objectMapper.writeValueAsString(request.baseInputs()),
                request.swingPercent(),
                objectMapper.writeValueAsString(result)
            );
            return toResponse(repository.save(session));
        } catch (Exception e) {
            throw new RuntimeException("Failed to serialize session", e);
        }
    }

    @Transactional(readOnly = true)
    public List<SensitivitySessionSummary> listSessions() {
        return repository.findTop20ByOrderByCreatedAtDesc().stream()
            .map(s -> new SensitivitySessionSummary(
                s.getId(), s.getName(), ModelType.valueOf(s.getModel()),
                s.getSwingPercent(), s.getCreatedAt()))
            .toList();
    }

    @Transactional(readOnly = true)
    public SensitivitySessionResponse getSession(Long id) {
        return repository.findById(id)
            .map(this::toResponse)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "session not found: " + id));
    }

    private SensitivitySessionResponse toResponse(SensitivitySession s) {
        try {
            Map<String, Double> baseInputs = objectMapper.readValue(
                s.getBaseInputsJson(), new TypeReference<>() {});
            SensitivityResponse results = objectMapper.readValue(
                s.getResultsJson(), SensitivityResponse.class);
            return new SensitivitySessionResponse(
                s.getId(), s.getName(), ModelType.valueOf(s.getModel()),
                baseInputs, s.getSwingPercent(), results, s.getCreatedAt());
        } catch (Exception e) {
            throw new RuntimeException("Failed to deserialize session", e);
        }
    }
}
