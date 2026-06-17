package com.marketingquantitative.service;

import com.marketingquantitative.dto.MatrixGainsRequest;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

@ExtendWith(MockitoExtension.class)
class MatrixGainsServiceTest {

    @InjectMocks
    private MatrixGainsService service;

    @Test
    void threeByThree_correctMaxiMaxAndMaxiMin() {
        var request = new MatrixGainsRequest(
            "test",
            List.of("S1", "S2", "S3"),
            List.of(
                new MatrixGainsRequest.StrategyRequest("A", List.of(4.0, 2.0, 1.0)),
                new MatrixGainsRequest.StrategyRequest("B", List.of(3.0, 5.0, 2.0)),
                new MatrixGainsRequest.StrategyRequest("C", List.of(1.0, 4.0, 6.0))
            )
        );

        var result = service.calculate(request);

        // Row maxima: A=4, B=5, C=6 → maxi-max = C (index 2)
        assertThat(result.maxiMaxValue()).isEqualTo(6.0);
        assertThat(result.maxiMaxStrategyIndices()).containsExactly(2);
        // Row minima: A=1, B=2, C=1 → maxi-min = B (index 1)
        assertThat(result.maxiMinValue()).isEqualTo(2.0);
        assertThat(result.maxiMinStrategyIndices()).containsExactly(1);
    }

    @Test
    void oneByOne_sameValueForBothCriteria() {
        var request = new MatrixGainsRequest(
            "test",
            List.of("S1"),
            List.of(new MatrixGainsRequest.StrategyRequest("A", List.of(7.0)))
        );

        var result = service.calculate(request);

        assertThat(result.maxiMaxValue()).isEqualTo(7.0);
        assertThat(result.maxiMaxStrategyIndices()).containsExactly(0);
        assertThat(result.maxiMinValue()).isEqualTo(7.0);
        assertThat(result.maxiMinStrategyIndices()).containsExactly(0);
    }

    @Test
    void negativeValues_correctWinner() {
        var request = new MatrixGainsRequest(
            "test",
            List.of("S1", "S2"),
            List.of(
                new MatrixGainsRequest.StrategyRequest("A", List.of(-1.0, -2.0)),
                new MatrixGainsRequest.StrategyRequest("B", List.of(-3.0, -4.0))
            )
        );

        var result = service.calculate(request);

        assertThat(result.maxiMaxValue()).isEqualTo(-1.0);
        assertThat(result.maxiMaxStrategyIndices()).containsExactly(0);
        assertThat(result.maxiMinValue()).isEqualTo(-2.0);
        assertThat(result.maxiMinStrategyIndices()).containsExactly(0);
    }

    @Test
    void tiedStrategies_bothReported() {
        var request = new MatrixGainsRequest(
            "test",
            List.of("S1", "S2"),
            List.of(
                new MatrixGainsRequest.StrategyRequest("A", List.of(5.0, 1.0)),
                new MatrixGainsRequest.StrategyRequest("B", List.of(5.0, 2.0))
            )
        );

        var result = service.calculate(request);

        // Row maxima: A=5, B=5 → both tied for maxi-max
        assertThat(result.maxiMaxValue()).isEqualTo(5.0);
        assertThat(result.maxiMaxStrategyIndices()).containsExactly(0, 1);
        // Row minima: A=1, B=2 → B wins
        assertThat(result.maxiMinValue()).isEqualTo(2.0);
        assertThat(result.maxiMinStrategyIndices()).containsExactly(1);
    }
}
