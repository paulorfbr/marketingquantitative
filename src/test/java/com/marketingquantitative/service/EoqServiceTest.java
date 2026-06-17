package com.marketingquantitative.service;

import com.marketingquantitative.dto.EoqRequest;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.within;

@ExtendWith(MockitoExtension.class)
class EoqServiceTest {

    @InjectMocks
    private EoqService service;

    // TC-02-U01: D=1000, S=50, C=10, I=0.2
    // Note: spec stated cycle=81.65 days; correct value is 81.62 (spec had rounding error)
    @Test
    void standardInputs_correctEoqAndDerivedMetrics() {
        var result = service.calculate(new EoqRequest(1000.0, 50.0, 10.0, 0.2));

        assertThat(result.eoq()).isCloseTo(223.61, within(0.01));
        assertThat(result.ordersPerYear()).isCloseTo(4.47, within(0.01));
        assertThat(result.cycleDays()).isCloseTo(81.62, within(0.01));
        assertThat(result.totalAnnualCost()).isCloseTo(447.21, within(0.01));
    }

    // TC-02-U02: D=500, S=100, C=5, I=0.1
    @Test
    void highOrderingCostLowHoldingRate_largerEoq() {
        var result = service.calculate(new EoqRequest(500.0, 100.0, 5.0, 0.1));

        assertThat(result.eoq()).isCloseTo(447.21, within(0.01));
    }

    // TC-02-U03: all inputs = 1 → EOQ = √2
    @Test
    void allOnes_eoqEqualsRootTwo() {
        var result = service.calculate(new EoqRequest(1.0, 1.0, 1.0, 1.0));

        assertThat(result.eoq()).isCloseTo(Math.sqrt(2), within(1e-9));
    }

    @Test
    void totalAnnualCost_equalsOrderingPlusHolding() {
        var req = new EoqRequest(1000.0, 50.0, 10.0, 0.2);
        var result = service.calculate(req);

        double expectedOrdering = result.ordersPerYear() * req.orderingCost();
        double expectedHolding  = (result.eoq() / 2) * req.holdingRate() * req.unitCost();
        assertThat(result.totalAnnualCost()).isCloseTo(expectedOrdering + expectedHolding, within(1e-6));
    }
}
