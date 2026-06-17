package com.marketingquantitative.dto;

import java.time.Instant;

public record BreakevenSessionResponse(
    Long id,
    String name,
    double fixedCosts,
    double variableCostPerUnit,
    double pricePerUnit,
    double breakEvenQty,
    double breakEvenRevenue,
    double contributionMargin,
    double marginRatio,
    Instant createdAt
) {}
