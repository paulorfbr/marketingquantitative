package com.marketingquantitative.dto;

import java.util.Map;
import java.util.Set;

public record DecisionTreeResponse(
    double rootEmv,
    Map<String, Double> nodeEmv,
    Set<String> optimalBranchIds
) {}
