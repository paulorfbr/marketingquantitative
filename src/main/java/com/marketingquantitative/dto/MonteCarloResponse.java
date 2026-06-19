package com.marketingquantitative.dto;

public record MonteCarloResponse(
    double[] cdfValues,
    double mean,
    double stdDev,
    double p5,
    double p25,
    double p50,
    double p75,
    double p95
) {}
