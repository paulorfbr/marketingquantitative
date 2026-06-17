package com.marketingquantitative.controller;

import com.marketingquantitative.dto.*;
import com.marketingquantitative.service.BreakevenService;
import com.marketingquantitative.service.BreakevenSessionService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Tag(name = "Break-even", description = "Break-even analysis — Q* = CF / (P − CVu)")
@RestController
@RequestMapping("/api/breakeven")
public class BreakevenController {

    private final BreakevenService service;
    private final BreakevenSessionService sessionService;

    BreakevenController(BreakevenService service, BreakevenSessionService sessionService) {
        this.service = service;
        this.sessionService = sessionService;
    }

    @Operation(summary = "Calculate break-even (stateless)")
    @PostMapping("/calculate")
    public ResponseEntity<BreakevenResponse> calculate(@Valid @RequestBody BreakevenRequest request) {
        return ResponseEntity.ok(service.calculate(request));
    }

    @Operation(summary = "Calculate and save a break-even session")
    @PostMapping("/sessions")
    public ResponseEntity<BreakevenSessionResponse> saveSession(@Valid @RequestBody BreakevenSaveRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(sessionService.saveSession(request));
    }

    @Operation(summary = "List the 20 most recent break-even sessions")
    @GetMapping("/sessions")
    public ResponseEntity<List<BreakevenSessionSummary>> listSessions() {
        return ResponseEntity.ok(sessionService.listSessions());
    }

    @Operation(summary = "Get a single break-even session by ID")
    @GetMapping("/sessions/{id}")
    public ResponseEntity<BreakevenSessionResponse> getSession(@PathVariable Long id) {
        return ResponseEntity.ok(sessionService.getSession(id));
    }
}
