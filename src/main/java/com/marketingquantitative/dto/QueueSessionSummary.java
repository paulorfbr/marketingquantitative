package com.marketingquantitative.dto;

import java.time.Instant;

public record QueueSessionSummary(Long id, String name, double utilization, Instant createdAt) {}
