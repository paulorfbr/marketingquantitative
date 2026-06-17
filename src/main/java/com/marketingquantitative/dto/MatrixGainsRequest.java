package com.marketingquantitative.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import java.util.List;

public record MatrixGainsRequest(
    @NotBlank String name,
    @NotEmpty List<@NotBlank String> scenarios,
    @NotEmpty @Valid List<StrategyRequest> strategies
) {
    public record StrategyRequest(
        @NotBlank String label,
        @NotEmpty List<@NotNull Double> values
    ) {}
}
