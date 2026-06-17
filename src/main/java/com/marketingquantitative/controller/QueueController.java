package com.marketingquantitative.controller;

import com.marketingquantitative.dto.QueueRequest;
import com.marketingquantitative.dto.QueueResponse;
import com.marketingquantitative.service.QueueService;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@Tag(name = "Queue", description = "M/M/s queueing theory — utilisation, Lq, L, Wq, W")
@RestController
@RequestMapping("/api/queue")
public class QueueController {

    private final QueueService service;

    QueueController(QueueService service) {
        this.service = service;
    }

    @PostMapping("/calculate")
    public ResponseEntity<QueueResponse> calculate(@Valid @RequestBody QueueRequest request) {
        return ResponseEntity.ok(service.calculate(request));
    }
}
