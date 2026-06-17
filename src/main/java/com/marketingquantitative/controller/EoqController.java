package com.marketingquantitative.controller;

import com.marketingquantitative.dto.*;
import com.marketingquantitative.service.EoqService;
import com.marketingquantitative.service.EoqSessionService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Tag(name = "EOQ", description = "Economic Order Quantity — Q* = √(2DS / IC)")
@RestController
@RequestMapping("/api/eoq")
public class EoqController {

    private final EoqService service;
    private final EoqSessionService sessionService;

    EoqController(EoqService service, EoqSessionService sessionService) {
        this.service = service;
        this.sessionService = sessionService;
    }

    @Operation(summary = "Calculate EOQ (stateless)")
    @PostMapping("/calculate")
    public ResponseEntity<EoqResponse> calculate(@Valid @RequestBody EoqRequest request) {
        return ResponseEntity.ok(service.calculate(request));
    }

    @Operation(summary = "Calculate and save an EOQ session")
    @PostMapping("/sessions")
    public ResponseEntity<EoqSessionResponse> saveSession(@Valid @RequestBody EoqSaveRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(sessionService.saveSession(request));
    }

    @Operation(summary = "List the 20 most recent EOQ sessions")
    @GetMapping("/sessions")
    public ResponseEntity<List<EoqSessionSummary>> listSessions() {
        return ResponseEntity.ok(sessionService.listSessions());
    }

    @Operation(summary = "Get a single EOQ session by ID")
    @GetMapping("/sessions/{id}")
    public ResponseEntity<EoqSessionResponse> getSession(@PathVariable Long id) {
        return ResponseEntity.ok(sessionService.getSession(id));
    }
}
