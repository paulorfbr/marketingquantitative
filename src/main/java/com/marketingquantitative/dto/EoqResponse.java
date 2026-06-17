package com.marketingquantitative.dto;

public record EoqResponse(
    double eoq,
    double ordersPerYear,
    double cycleDays,
    double totalAnnualCost
) {}
