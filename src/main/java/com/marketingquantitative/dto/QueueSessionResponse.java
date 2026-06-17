package com.marketingquantitative.dto;

import java.time.Instant;

public record QueueSessionResponse(
    Long id,
    String name,
    double arrivalRate,
    double serviceRate,
    int servers,
    double utilization,
    double p0,
    double lq,
    double l,
    double wq,
    double w,
    Instant createdAt
) {}
