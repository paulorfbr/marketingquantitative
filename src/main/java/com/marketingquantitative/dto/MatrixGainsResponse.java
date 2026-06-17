package com.marketingquantitative.dto;

import java.util.List;

public record MatrixGainsResponse(
    double maxiMaxValue,
    List<Integer> maxiMaxStrategyIndices,
    double maxiMinValue,
    List<Integer> maxiMinStrategyIndices
) {}
