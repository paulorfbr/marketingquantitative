package com.marketingquantitative.controller;

import com.marketingquantitative.dto.DecisionTreeRequest;
import com.marketingquantitative.dto.DecisionTreeResponse;
import com.marketingquantitative.service.DecisionTreeService;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@Tag(name = "Decision Tree", description = "Decision tree EMV via backwards induction")
@RestController
@RequestMapping("/api/decision-tree")
public class DecisionTreeController {

    private final DecisionTreeService service;

    DecisionTreeController(DecisionTreeService service) {
        this.service = service;
    }

    @PostMapping("/calculate")
    public ResponseEntity<DecisionTreeResponse> calculate(@Valid @RequestBody DecisionTreeRequest request) {
        return ResponseEntity.ok(service.calculate(request));
    }
}
