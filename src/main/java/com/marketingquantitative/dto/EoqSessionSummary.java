package com.marketingquantitative.dto;

import java.time.Instant;

public record EoqSessionSummary(Long id, String name, double eoq, Instant createdAt) {}
