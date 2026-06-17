package com.marketingquantitative.controller;

import com.marketingquantitative.dto.EoqRequest;
import com.marketingquantitative.dto.EoqResponse;
import com.marketingquantitative.service.EoqService;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@Tag(name = "EOQ", description = "Economic Order Quantity — Q* = √(2DS / IC)")
@RestController
@RequestMapping("/api/eoq")
public class EoqController {

    private final EoqService service;

    EoqController(EoqService service) {
        this.service = service;
    }

    @PostMapping("/calculate")
    public ResponseEntity<EoqResponse> calculate(@Valid @RequestBody EoqRequest request) {
        return ResponseEntity.ok(service.calculate(request));
    }
}
