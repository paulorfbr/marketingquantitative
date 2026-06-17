package com.marketingquantitative.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

public record EoqRequest(
    @NotNull @Positive Double demand,
    @NotNull @Positive Double orderingCost,
    @NotNull @Positive Double unitCost,
    @NotNull @Positive Double holdingRate
) {}
