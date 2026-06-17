package com.marketingquantitative.controller;

import com.marketingquantitative.dto.*;
import com.marketingquantitative.service.QueueService;
import com.marketingquantitative.service.QueueSessionService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Tag(name = "Queue", description = "M/M/s queueing theory — utilisation, Lq, L, Wq, W")
@RestController
@RequestMapping("/api/queue")
public class QueueController {

    private final QueueService service;
    private final QueueSessionService sessionService;

    QueueController(QueueService service, QueueSessionService sessionService) {
        this.service = service;
        this.sessionService = sessionService;
    }

    @Operation(summary = "Calculate M/M/s metrics (stateless)")
    @PostMapping("/calculate")
    public ResponseEntity<QueueResponse> calculate(@Valid @RequestBody QueueRequest request) {
        return ResponseEntity.ok(service.calculate(request));
    }

    @Operation(summary = "Calculate and save a queue session")
    @PostMapping("/sessions")
    public ResponseEntity<QueueSessionResponse> saveSession(@Valid @RequestBody QueueSaveRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(sessionService.saveSession(request));
    }

    @Operation(summary = "List the 20 most recent queue sessions")
    @GetMapping("/sessions")
    public ResponseEntity<List<QueueSessionSummary>> listSessions() {
        return ResponseEntity.ok(sessionService.listSessions());
    }

    @Operation(summary = "Get a single queue session by ID")
    @GetMapping("/sessions/{id}")
    public ResponseEntity<QueueSessionResponse> getSession(@PathVariable Long id) {
        return ResponseEntity.ok(sessionService.getSession(id));
    }
}
