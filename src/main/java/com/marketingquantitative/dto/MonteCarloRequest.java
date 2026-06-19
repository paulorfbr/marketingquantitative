package com.marketingquantitative.dto;

import com.marketingquantitative.shared.InputDistribution;
import com.marketingquantitative.shared.ModelType;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.util.Map;

public record MonteCarloRequest(
    @NotNull ModelType model,
    @NotEmpty Map<String, @Valid InputDistribution> inputs,
    @Min(1) @Max(100000) int iterations
) {}
