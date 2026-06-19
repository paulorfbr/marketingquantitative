package com.marketingquantitative.controller;

import com.marketingquantitative.dto.*;
import com.marketingquantitative.service.MonteCarloService;
import com.marketingquantitative.service.MonteCarloSessionService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Tag(name = "Monte Carlo", description = "Monte Carlo Simulation — CDF")
@RestController
@RequestMapping("/api/montecarlo")
public class MonteCarloController {

    private final MonteCarloService service;
    private final MonteCarloSessionService sessionService;

    MonteCarloController(MonteCarloService service, MonteCarloSessionService sessionService) {
        this.service = service;
        this.sessionService = sessionService;
    }

    @Operation(summary = "Run Monte Carlo simulation (stateless)")
    @PostMapping("/simulate")
    public ResponseEntity<MonteCarloResponse> simulate(@Valid @RequestBody MonteCarloRequest request) {
        return ResponseEntity.ok(service.simulate(request));
    }

    @Operation(summary = "Simulate and save a Monte Carlo session")
    @PostMapping("/sessions")
    public ResponseEntity<MonteCarloSessionResponse> saveSession(@Valid @RequestBody MonteCarloSaveRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(sessionService.saveSession(request));
    }

    @Operation(summary = "List the 20 most recent Monte Carlo sessions")
    @GetMapping("/sessions")
    public ResponseEntity<List<MonteCarloSessionSummary>> listSessions() {
        return ResponseEntity.ok(sessionService.listSessions());
    }

    @Operation(summary = "Get a Monte Carlo session by ID")
    @GetMapping("/sessions/{id}")
    public ResponseEntity<MonteCarloSessionResponse> getSession(@PathVariable Long id) {
        return ResponseEntity.ok(sessionService.getSession(id));
    }
}
