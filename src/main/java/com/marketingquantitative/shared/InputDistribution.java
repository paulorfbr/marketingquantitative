package com.marketingquantitative.shared;

import jakarta.validation.constraints.NotNull;

public record InputDistribution(
    @NotNull DistributionType distribution,
    Double mean,
    Double stdDev,
    Double min,
    Double max,
    Double mode
) {}
