package com.marketingquantitative.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.PositiveOrZero;

public record BreakevenSaveRequest(
    @NotBlank String name,
    @NotNull @PositiveOrZero Double fixedCosts,
    @NotNull @PositiveOrZero Double variableCostPerUnit,
    @NotNull @Positive Double pricePerUnit
) {}
