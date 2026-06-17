package com.marketingquantitative.dto;

import java.time.Instant;

public record BreakevenSessionSummary(Long id, String name, double breakEvenQty, Instant createdAt) {}
