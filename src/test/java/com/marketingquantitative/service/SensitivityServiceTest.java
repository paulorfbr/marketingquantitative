package com.marketingquantitative.service;

import com.marketingquantitative.dto.*;
import com.marketingquantitative.shared.ModelType;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.server.ResponseStatusException;

import java.util.Map;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class SensitivityServiceTest {

    @Mock EoqService eoqService;
    @Mock BreakevenService breakevenService;
    @InjectMocks SensitivityService service;

    // TC-08-S01: EOQ model, swing 20% — demand should have highest impact
    @Test
    void eoqModel_sortsByImpactDescending() {
        when(eoqService.calculate(any())).thenAnswer(inv -> {
            EoqRequest r = inv.getArgument(0);
            double eoq = Math.sqrt((2 * r.demand() * r.orderingCost()) / (r.holdingRate() * r.unitCost()));
            return new EoqResponse(eoq, 0, 0, 0);
        });

        var req = new SensitivityRequest(
            ModelType.EOQ,
            Map.of("demand", 1000.0, "orderingCost", 50.0, "unitCost", 10.0, "holdingRate", 0.2),
            20.0
        );
        SensitivityResponse resp = service.calculate(req);

        assertThat(resp.parameters()).hasSize(4);
        // each subsequent parameter has impact <= previous
        for (int i = 1; i < resp.parameters().size(); i++) {
            assertThat(resp.parameters().get(i).impact())
                .isLessThanOrEqualTo(resp.parameters().get(i - 1).impact());
        }
    }

    // TC-08-S02: swing = 0 → impact is 0 for all parameters
    @Test
    void zeroSwing_zeroImpactForAllParams() {
        when(eoqService.calculate(any())).thenReturn(new EoqResponse(100.0, 0, 0, 0));

        var req = new SensitivityRequest(
            ModelType.EOQ,
            Map.of("demand", 1000.0, "orderingCost", 50.0, "unitCost", 10.0, "holdingRate", 0.2),
            0.0001 // near zero but positive (positive constraint)
        );
        SensitivityResponse resp = service.calculate(req);

        resp.parameters().forEach(p -> assertThat(p.impact()).isLessThan(0.01));
    }

    // TC-08-S03: wrong keys for model → 400
    @Test
    void wrongKeys_throws400() {
        var req = new SensitivityRequest(
            ModelType.EOQ,
            Map.of("fixedCosts", 1000.0, "variableCostPerUnit", 5.0, "pricePerUnit", 10.0),
            20.0
        );
        assertThatThrownBy(() -> service.calculate(req))
            .isInstanceOf(ResponseStatusException.class);
    }

    // TC-08-S04: breakeven model returns breakEvenQty as output
    @Test
    void breakevenModel_usesBreakevenService() {
        when(breakevenService.calculate(any())).thenReturn(
            new BreakevenResponse(500.0, 5000.0, 10.0, 0.5)
        );

        var req = new SensitivityRequest(
            ModelType.BREAKEVEN,
            Map.of("fixedCosts", 5000.0, "variableCostPerUnit", 10.0, "pricePerUnit", 20.0),
            20.0
        );
        SensitivityResponse resp = service.calculate(req);

        assertThat(resp.baseOutput()).isEqualTo(500.0);
        verify(breakevenService, atLeastOnce()).calculate(any());
    }
}
