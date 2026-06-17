package com.marketingquantitative.dto;

import java.time.Instant;

public record EoqSessionResponse(
    Long id,
    String name,
    double demand,
    double orderingCost,
    double unitCost,
    double holdingRate,
    double eoq,
    double ordersPerYear,
    double cycleDays,
    double totalAnnualCost,
    Instant createdAt
) {}
