package com.marketingquantitative.service;

import com.marketingquantitative.dto.BreakevenRequest;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.server.ResponseStatusException;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.assertj.core.api.Assertions.within;

@ExtendWith(MockitoExtension.class)
class BreakevenServiceTest {

    @InjectMocks
    private BreakevenService service;

    // TC-03-U01
    @Test
    void standardInputs_correctQtyAndRevenue() {
        var result = service.calculate(new BreakevenRequest(10000.0, 5.0, 15.0));

        assertThat(result.breakEvenQty()).isCloseTo(1000.0, within(0.001));
        assertThat(result.breakEvenRevenue()).isCloseTo(15000.0, within(0.001));
        assertThat(result.contributionMargin()).isCloseTo(10.0, within(0.001));
    }

    // TC-03-U02 — CF = 0 → immediate break-even
    @Test
    void zeroFixedCosts_breakEvenAtOrigin() {
        var result = service.calculate(new BreakevenRequest(0.0, 5.0, 10.0));

        assertThat(result.breakEvenQty()).isEqualTo(0.0);
        assertThat(result.breakEvenRevenue()).isEqualTo(0.0);
    }

    // TC-03-U03
    @Test
    void lowMargin_higherBreakEvenQty() {
        var result = service.calculate(new BreakevenRequest(5000.0, 8.0, 10.0));

        assertThat(result.breakEvenQty()).isCloseTo(2500.0, within(0.001));
        assertThat(result.breakEvenRevenue()).isCloseTo(25000.0, within(0.001));
    }

    // TC-03-V01 + TC-03-V02 — price not above variable cost
    @Test
    void priceEqualToVariableCost_throws400() {
        assertThatThrownBy(() -> service.calculate(new BreakevenRequest(1000.0, 10.0, 10.0)))
            .isInstanceOf(ResponseStatusException.class)
            .hasMessageContaining("price must be greater than variable cost");
    }

    @Test
    void priceBelowVariableCost_throws400() {
        assertThatThrownBy(() -> service.calculate(new BreakevenRequest(1000.0, 12.0, 10.0)))
            .isInstanceOf(ResponseStatusException.class)
            .hasMessageContaining("price must be greater than variable cost");
    }

    @Test
    void marginRatio_correctFraction() {
        var result = service.calculate(new BreakevenRequest(10000.0, 5.0, 15.0));

        // contributionMargin / price = 10/15 ≈ 0.6667
        assertThat(result.marginRatio()).isCloseTo(10.0 / 15.0, within(1e-9));
    }
}
