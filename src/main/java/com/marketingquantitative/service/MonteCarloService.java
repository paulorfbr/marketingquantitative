package com.marketingquantitative.service;

import com.marketingquantitative.dto.*;
import com.marketingquantitative.shared.InputDistribution;
import com.marketingquantitative.shared.ModelType;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.*;

@Service
public class MonteCarloService {

    private static final Map<ModelType, Set<String>> VALID_KEYS = Map.of(
        ModelType.EOQ,       Set.of("demand", "orderingCost", "unitCost", "holdingRate"),
        ModelType.BREAKEVEN, Set.of("fixedCosts", "variableCostPerUnit", "pricePerUnit")
    );

    private final EoqService eoqService;
    private final BreakevenService breakevenService;

    MonteCarloService(EoqService eoqService, BreakevenService breakevenService) {
        this.eoqService = eoqService;
        this.breakevenService = breakevenService;
    }

    public MonteCarloResponse simulate(MonteCarloRequest request) {
        Set<String> valid = VALID_KEYS.get(request.model());
        if (valid == null || !valid.equals(request.inputs().keySet())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                "inputs keys must be exactly " + valid + " for model " + request.model());
        }

        Random random = new Random();
        List<Double> results = new ArrayList<>(request.iterations());

        for (int i = 0; i < request.iterations(); i++) {
            Map<String, Double> sampled = new HashMap<>();
            for (var entry : request.inputs().entrySet()) {
                sampled.put(entry.getKey(), sample(entry.getValue(), random));
            }
            try {
                results.add(computeOutput(request.model(), sampled));
            } catch (Exception ignored) {
                // skip iterations with invalid sampled values
            }
        }

        double[] sorted = results.stream().mapToDouble(Double::doubleValue).sorted().toArray();

        double mean = Arrays.stream(sorted).average().orElse(0);
        double variance = Arrays.stream(sorted).map(v -> (v - mean) * (v - mean)).average().orElse(0);

        return new MonteCarloResponse(
            downsample(sorted, 200),
            mean,
            Math.sqrt(variance),
            percentile(sorted, 5),
            percentile(sorted, 25),
            percentile(sorted, 50),
            percentile(sorted, 75),
            percentile(sorted, 95)
        );
    }

    private double sample(InputDistribution dist, Random rng) {
        return switch (dist.distribution()) {
            case NORMAL -> dist.mean() + dist.stdDev() * rng.nextGaussian();
            case UNIFORM -> dist.min() + rng.nextDouble() * (dist.max() - dist.min());
            case TRIANGULAR -> {
                double range = dist.max() - dist.min();
                double fc = (dist.mode() - dist.min()) / range;
                double u = rng.nextDouble();
                if (u < fc) yield dist.min() + Math.sqrt(u * range * (dist.mode() - dist.min()));
                else        yield dist.max() - Math.sqrt((1 - u) * range * (dist.max() - dist.mode()));
            }
        };
    }

    private double[] downsample(double[] sorted, int points) {
        if (sorted.length == 0) return new double[0];
        double[] result = new double[points];
        for (int i = 0; i < points; i++) {
            int idx = (int) Math.round((double) i / (points - 1) * (sorted.length - 1));
            result[i] = sorted[Math.min(idx, sorted.length - 1)];
        }
        return result;
    }

    private double percentile(double[] sorted, int pct) {
        if (sorted.length == 0) return 0;
        int idx = (int) Math.ceil(pct / 100.0 * sorted.length) - 1;
        return sorted[Math.max(0, Math.min(idx, sorted.length - 1))];
    }

    private double computeOutput(ModelType model, Map<String, Double> inputs) {
        return switch (model) {
            case EOQ -> eoqService.calculate(new EoqRequest(
                inputs.get("demand"), inputs.get("orderingCost"),
                inputs.get("unitCost"), inputs.get("holdingRate")
            )).eoq();
            case BREAKEVEN -> breakevenService.calculate(new BreakevenRequest(
                inputs.get("fixedCosts"), inputs.get("variableCostPerUnit"),
                inputs.get("pricePerUnit")
            )).breakEvenQty();
        };
    }
}
