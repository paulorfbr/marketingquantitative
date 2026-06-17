package com.marketingquantitative.service;

import com.marketingquantitative.dto.QueueRequest;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.server.ResponseStatusException;

import static org.assertj.core.api.Assertions.*;

@ExtendWith(MockitoExtension.class)
class QueueServiceTest {

    @InjectMocks
    private QueueService service;

    // TC-04-U01: M/M/1 — λ=2, μ=3, s=1
    @Test
    void mm1_correctAllMetrics() {
        var result = service.calculate(new QueueRequest(2.0, 3.0, 1));

        assertThat(result.utilization()).isCloseTo(0.667, within(0.001));
        assertThat(result.lq()).isCloseTo(1.333, within(0.001));
        assertThat(result.l()).isCloseTo(2.000, within(0.001));
        assertThat(result.wq()).isCloseTo(0.667, within(0.001));
        assertThat(result.w()).isCloseTo(1.000, within(0.001));
    }

    // TC-04-U02: M/M/2 — λ=4, μ=3, s=2 → stable, ρ=0.67
    @Test
    void mm2_stableAndCorrectUtilisation() {
        var result = service.calculate(new QueueRequest(4.0, 3.0, 2));

        assertThat(result.utilization()).isCloseTo(0.667, within(0.001));
    }

    // TC-04-U03: M/M/1 — λ=1, μ=10, s=1 → very light load
    @Test
    void mm1_lowLoad_shortQueue() {
        var result = service.calculate(new QueueRequest(1.0, 10.0, 1));

        assertThat(result.utilization()).isCloseTo(0.10, within(0.001));
        assertThat(result.lq()).isCloseTo(0.011, within(0.001));
    }

    // TC-04-V01: unstable
    @Test
    void unstableSystem_throws400() {
        assertThatThrownBy(() -> service.calculate(new QueueRequest(5.0, 2.0, 2)))
            .isInstanceOf(ResponseStatusException.class)
            .hasMessageContaining("system is unstable");
    }

    // Boundary: exactly at capacity (s×μ = λ) is also unstable
    @Test
    void exactCapacity_throws400() {
        assertThatThrownBy(() -> service.calculate(new QueueRequest(6.0, 3.0, 2)))
            .isInstanceOf(ResponseStatusException.class);
    }

    // Little's Law: L = λ × W  and  Lq = λ × Wq
    @Test
    void littlesLaw_holds() {
        var result = service.calculate(new QueueRequest(2.0, 3.0, 1));

        assertThat(result.l()).isCloseTo(2.0 * result.w(),   within(1e-9));
        assertThat(result.lq()).isCloseTo(2.0 * result.wq(), within(1e-9));
    }

    // P₀ sanity: for M/M/1, P₀ = 1 − ρ
    @Test
    void mm1_p0_equals_oneMinusRho() {
        var result = service.calculate(new QueueRequest(2.0, 3.0, 1));

        assertThat(result.p0()).isCloseTo(1 - result.utilization(), within(1e-9));
    }
}
