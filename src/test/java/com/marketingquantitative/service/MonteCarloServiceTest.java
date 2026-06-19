package com.marketingquantitative.service;

import com.marketingquantitative.dto.*;
import com.marketingquantitative.shared.DistributionType;
import com.marketingquantitative.shared.InputDistribution;
import com.marketingquantitative.shared.ModelType;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Map;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class MonteCarloServiceTest {

    @Mock EoqService eoqService;
    @Mock BreakevenService breakevenService;
    @InjectMocks MonteCarloService service;

    // TC-08-MC01: cdfValues has exactly 200 points
    @Test
    void simulate_returnsTwoHundredCdfPoints() {
        when(eoqService.calculate(any())).thenReturn(new EoqResponse(100.0, 0, 0, 0));

        var req = new MonteCarloRequest(ModelType.EOQ, Map.of(
            "demand",       new InputDistribution(DistributionType.UNIFORM, null, null, 800.0, 1200.0, null),
            "orderingCost", new InputDistribution(DistributionType.UNIFORM, null, null, 40.0, 60.0, null),
            "unitCost",     new InputDistribution(DistributionType.UNIFORM, null, null, 8.0, 12.0, null),
            "holdingRate",  new InputDistribution(DistributionType.UNIFORM, null, null, 0.16, 0.24, null)
        ), 500);

        MonteCarloResponse resp = service.simulate(req);

        assertThat(resp.cdfValues()).hasSize(200);
    }

    // TC-08-MC02: cdfValues is non-decreasing (sorted)
    @Test
    void simulate_cdfValuesNonDecreasing() {
        when(eoqService.calculate(any())).thenAnswer(inv -> {
            EoqRequest r = inv.getArgument(0);
            return new EoqResponse(r.demand() * 0.1, 0, 0, 0);
        });

        var req = new MonteCarloRequest(ModelType.EOQ, Map.of(
            "demand",       new InputDistribution(DistributionType.UNIFORM, null, null, 500.0, 1500.0, null),
            "orderingCost", new InputDistribution(DistributionType.UNIFORM, null, null, 40.0, 60.0, null),
            "unitCost",     new InputDistribution(DistributionType.UNIFORM, null, null, 8.0, 12.0, null),
            "holdingRate",  new InputDistribution(DistributionType.UNIFORM, null, null, 0.1, 0.3, null)
        ), 1000);

        MonteCarloResponse resp = service.simulate(req);

        double[] cdf = resp.cdfValues();
        for (int i = 1; i < cdf.length; i++) {
            assertThat(cdf[i]).isGreaterThanOrEqualTo(cdf[i - 1]);
        }
    }

    // TC-08-MC03: p5 < p50 < p95
    @Test
    void simulate_percentilesOrdered() {
        when(eoqService.calculate(any())).thenAnswer(inv -> {
            EoqRequest r = inv.getArgument(0);
            return new EoqResponse(r.demand(), 0, 0, 0);
        });

        var req = new MonteCarloRequest(ModelType.EOQ, Map.of(
            "demand",       new InputDistribution(DistributionType.UNIFORM, null, null, 100.0, 900.0, null),
            "orderingCost", new InputDistribution(DistributionType.UNIFORM, null, null, 40.0, 60.0, null),
            "unitCost",     new InputDistribution(DistributionType.UNIFORM, null, null, 8.0, 12.0, null),
            "holdingRate",  new InputDistribution(DistributionType.UNIFORM, null, null, 0.1, 0.3, null)
        ), 2000);

        MonteCarloResponse resp = service.simulate(req);

        assertThat(resp.p5()).isLessThan(resp.p50());
        assertThat(resp.p50()).isLessThan(resp.p95());
    }

    // TC-08-MC04: wrong keys → throws
    @Test
    void wrongKeys_throws400() {
        var req = new MonteCarloRequest(ModelType.EOQ, Map.of(
            "fixedCosts", new InputDistribution(DistributionType.UNIFORM, null, null, 100.0, 200.0, null)
        ), 100);
        assertThatThrownBy(() -> service.simulate(req))
            .isInstanceOf(org.springframework.web.server.ResponseStatusException.class);
    }
}
