package com.marketingquantitative.dto;

public record QueueResponse(
    double utilization,
    double p0,
    double lq,
    double l,
    double wq,
    double w
) {}
