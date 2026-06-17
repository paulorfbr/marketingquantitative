package com.marketingquantitative.service;

import com.marketingquantitative.dto.BreakevenRequest;
import com.marketingquantitative.dto.BreakevenResponse;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class BreakevenService {

    @Transactional(readOnly = true)
    public BreakevenResponse calculate(BreakevenRequest request) {
        if (request.pricePerUnit() <= request.variableCostPerUnit()) {
            throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST, "price must be greater than variable cost");
        }

        double contributionMargin = request.pricePerUnit() - request.variableCostPerUnit();
        double breakEvenQty     = request.fixedCosts() / contributionMargin;
        double breakEvenRevenue = breakEvenQty * request.pricePerUnit();
        double marginRatio      = contributionMargin / request.pricePerUnit();

        return new BreakevenResponse(breakEvenQty, breakEvenRevenue, contributionMargin, marginRatio);
    }
}
