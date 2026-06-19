package com.marketingquantitative.dto;

import com.marketingquantitative.shared.ModelType;
import java.time.Instant;
import java.util.Map;

public record SensitivitySessionResponse(
    Long id,
    String name,
    ModelType model,
    Map<String, Double> baseInputs,
    double swingPercent,
    SensitivityResponse results,
    Instant createdAt
) {}
