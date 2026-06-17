package com.marketingquantitative.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

public record QueueRequest(
    @NotNull @Positive Double arrivalRate,
    @NotNull @Positive Double serviceRate,
    @NotNull @Min(1)  Integer servers
) {}
