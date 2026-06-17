package com.marketingquantitative.dto;

public record BreakevenResponse(
    double breakEvenQty,
    double breakEvenRevenue,
    double contributionMargin,
    double marginRatio
) {}
