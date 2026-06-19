package com.marketingquantitative.dto;

import com.marketingquantitative.shared.InputDistribution;
import com.marketingquantitative.shared.ModelType;
import java.time.Instant;
import java.util.Map;

public record MonteCarloSessionResponse(
    Long id,
    String name,
    ModelType model,
    Map<String, InputDistribution> inputs,
    int iterations,
    MonteCarloResponse results,
    Instant createdAt
) {}
