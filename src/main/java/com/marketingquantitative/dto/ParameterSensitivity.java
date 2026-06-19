package com.marketingquantitative.dto;

public record ParameterSensitivity(
    String paramKey,
    double lowValue,
    double highValue,
    Double lowOutput,   // null if computation failed (e.g. invalid swung value)
    Double highOutput,
    double impact
) {}
