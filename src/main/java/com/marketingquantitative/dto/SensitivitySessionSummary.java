package com.marketingquantitative.dto;

import com.marketingquantitative.shared.ModelType;
import java.time.Instant;

public record SensitivitySessionSummary(
    Long id,
    String name,
    ModelType model,
    double swingPercent,
    Instant createdAt
) {}
