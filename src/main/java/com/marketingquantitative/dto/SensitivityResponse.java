package com.marketingquantitative.dto;

import java.util.List;

public record SensitivityResponse(
    double baseOutput,
    List<ParameterSensitivity> parameters
) {}
