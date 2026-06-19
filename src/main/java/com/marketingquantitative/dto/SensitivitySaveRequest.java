package com.marketingquantitative.dto;

import com.marketingquantitative.shared.ModelType;
import jakarta.validation.constraints.*;
import java.util.Map;

public record SensitivitySaveRequest(
    @NotBlank String name,
    @NotNull ModelType model,
    @NotEmpty Map<String, Double> baseInputs,
    @NotNull @Positive Double swingPercent
) {}
