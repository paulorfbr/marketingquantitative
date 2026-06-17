package com.marketingquantitative.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

public record QueueSaveRequest(
    @NotBlank String name,
    @NotNull @Positive Double arrivalRate,
    @NotNull @Positive Double serviceRate,
    @NotNull @Min(1) Integer servers
) {}
