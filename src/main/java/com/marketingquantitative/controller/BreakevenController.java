package com.marketingquantitative.controller;

import com.marketingquantitative.dto.BreakevenRequest;
import com.marketingquantitative.dto.BreakevenResponse;
import com.marketingquantitative.service.BreakevenService;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@Tag(name = "Break-even", description = "Break-even analysis — Q* = CF / (P − CVu)")
@RestController
@RequestMapping("/api/breakeven")
public class BreakevenController {

    private final BreakevenService service;

    BreakevenController(BreakevenService service) {
        this.service = service;
    }

    @PostMapping("/calculate")
    public ResponseEntity<BreakevenResponse> calculate(@Valid @RequestBody BreakevenRequest request) {
        return ResponseEntity.ok(service.calculate(request));
    }
}
