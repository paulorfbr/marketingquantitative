package com.marketingquantitative.dto;

import com.marketingquantitative.shared.ModelType;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import java.util.Map;

public record SensitivityRequest(
    @NotNull ModelType model,
    @NotEmpty Map<String, Double> baseInputs,
    @NotNull @Positive Double swingPercent
) {}
