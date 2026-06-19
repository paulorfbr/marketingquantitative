package com.marketingquantitative.dto;

import com.marketingquantitative.shared.ModelType;
import java.time.Instant;

public record MonteCarloSessionSummary(
    Long id,
    String name,
    ModelType model,
    int iterations,
    Instant createdAt
) {}
