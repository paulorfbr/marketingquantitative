package com.marketingquantitative.service;

import com.marketingquantitative.dto.EoqRequest;
import com.marketingquantitative.dto.EoqResponse;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class EoqService {

    @Transactional(readOnly = true)
    public EoqResponse calculate(EoqRequest request) {
        double d = request.demand();
        double s = request.orderingCost();
        double c = request.unitCost();
        double i = request.holdingRate();

        double eoq = Math.sqrt((2 * d * s) / (i * c));
        double ordersPerYear = d / eoq;
        double cycleDays = (eoq / d) * 365;
        double totalAnnualCost = ordersPerYear * s + (eoq / 2) * i * c;

        return new EoqResponse(eoq, ordersPerYear, cycleDays, totalAnnualCost);
    }
}
