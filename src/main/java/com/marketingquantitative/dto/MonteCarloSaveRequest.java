package com.marketingquantitative.dto;

import com.marketingquantitative.shared.InputDistribution;
import com.marketingquantitative.shared.ModelType;
import jakarta.validation.constraints.*;
import java.util.Map;

public record MonteCarloSaveRequest(
    @NotBlank String name,
    @NotNull ModelType model,
    @NotEmpty Map<String, InputDistribution> inputs,
    @Min(1) @Max(100000) int iterations
) {}
