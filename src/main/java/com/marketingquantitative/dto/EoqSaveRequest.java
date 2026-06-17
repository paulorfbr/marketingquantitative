package com.marketingquantitative.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

public record EoqSaveRequest(
    @NotBlank String name,
    @NotNull @Positive Double demand,
    @NotNull @Positive Double orderingCost,
    @NotNull @Positive Double unitCost,
    @NotNull @Positive Double holdingRate
) {}
