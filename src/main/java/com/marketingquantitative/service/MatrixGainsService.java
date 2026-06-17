package com.marketingquantitative.service;

import com.marketingquantitative.dto.MatrixGainsRequest;
import com.marketingquantitative.dto.MatrixGainsResponse;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.stream.IntStream;

@Service
public class MatrixGainsService {

    @Transactional(readOnly = true)
    public MatrixGainsResponse calculate(MatrixGainsRequest request) {
        var strategies = request.strategies();

        List<Double> rowMaxima = new ArrayList<>();
        List<Double> rowMinima = new ArrayList<>();

        for (var strategy : strategies) {
            rowMaxima.add(strategy.values().stream().mapToDouble(Double::doubleValue).max().orElseThrow());
            rowMinima.add(strategy.values().stream().mapToDouble(Double::doubleValue).min().orElseThrow());
        }

        double bestMaxValue = rowMaxima.stream().mapToDouble(Double::doubleValue).max().orElseThrow();
        double bestMinValue = rowMinima.stream().mapToDouble(Double::doubleValue).max().orElseThrow();

        List<Integer> maxiMaxIndices = IntStream.range(0, strategies.size())
                .filter(i -> rowMaxima.get(i) == bestMaxValue)
                .boxed()
                .toList();

        List<Integer> maxiMinIndices = IntStream.range(0, strategies.size())
                .filter(i -> rowMinima.get(i) == bestMinValue)
                .boxed()
                .toList();

        return new MatrixGainsResponse(bestMaxValue, maxiMaxIndices, bestMinValue, maxiMinIndices);
    }
}
