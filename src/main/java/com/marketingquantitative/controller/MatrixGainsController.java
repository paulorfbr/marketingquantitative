package com.marketingquantitative.controller;

import com.marketingquantitative.dto.MatrixGainsRequest;
import com.marketingquantitative.dto.MatrixGainsResponse;
import com.marketingquantitative.service.MatrixGainsService;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@Tag(name = "Matrix Gains", description = "Payoff matrix — maxi-max and maxi-min criteria")
@RestController
@RequestMapping("/api/matrix-gains")
public class MatrixGainsController {

    private final MatrixGainsService service;

    MatrixGainsController(MatrixGainsService service) {
        this.service = service;
    }

    @PostMapping("/calculate")
    public ResponseEntity<MatrixGainsResponse> calculate(@Valid @RequestBody MatrixGainsRequest request) {
        return ResponseEntity.ok(service.calculate(request));
    }
}
