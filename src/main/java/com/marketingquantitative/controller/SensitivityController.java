package com.marketingquantitative.controller;

import com.marketingquantitative.dto.*;
import com.marketingquantitative.service.SensitivityService;
import com.marketingquantitative.service.SensitivitySessionService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Tag(name = "Sensitivity", description = "Sensitivity Analysis — tornado chart")
@RestController
@RequestMapping("/api/sensitivity")
public class SensitivityController {

    private final SensitivityService service;
    private final SensitivitySessionService sessionService;

    SensitivityController(SensitivityService service, SensitivitySessionService sessionService) {
        this.service = service;
        this.sessionService = sessionService;
    }

    @Operation(summary = "Run sensitivity analysis (stateless)")
    @PostMapping("/calculate")
    public ResponseEntity<SensitivityResponse> calculate(@Valid @RequestBody SensitivityRequest request) {
        return ResponseEntity.ok(service.calculate(request));
    }

    @Operation(summary = "Calculate and save a sensitivity session")
    @PostMapping("/sessions")
    public ResponseEntity<SensitivitySessionResponse> saveSession(@Valid @RequestBody SensitivitySaveRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(sessionService.saveSession(request));
    }

    @Operation(summary = "List the 20 most recent sensitivity sessions")
    @GetMapping("/sessions")
    public ResponseEntity<List<SensitivitySessionSummary>> listSessions() {
        return ResponseEntity.ok(sessionService.listSessions());
    }

    @Operation(summary = "Get a sensitivity session by ID")
    @GetMapping("/sessions/{id}")
    public ResponseEntity<SensitivitySessionResponse> getSession(@PathVariable Long id) {
        return ResponseEntity.ok(sessionService.getSession(id));
    }
}
