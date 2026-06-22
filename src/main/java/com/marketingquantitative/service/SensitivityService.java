package com.marketingquantitative.service;

import com.marketingquantitative.dto.*;
import com.marketingquantitative.shared.ModelType;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.*;

@Service
public class SensitivityService {

    private static final Map<ModelType, Set<String>> VALID_KEYS = Map.of(
        ModelType.EOQ,       Set.of("demand", "orderingCost", "unitCost", "holdingRate"),
        ModelType.BREAKEVEN, Set.of("fixedCosts", "variableCostPerUnit", "pricePerUnit")
    );

    private final EoqService eoqService;
    private final BreakevenService breakevenService;

    SensitivityService(EoqService eoqService, BreakevenService breakevenService) {
        this.eoqService = eoqService;
        this.breakevenService = breakevenService;
    }

    public SensitivityResponse calculate(SensitivityRequest request) {
        Set<String> valid = VALID_KEYS.get(request.model());
        if (valid == null || !valid.equals(request.baseInputs().keySet())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                "baseInputs keys must be exactly " + valid + " for model " + request.model());
        }

        double swing = request.swingPercent() / 100.0;
        double baseOutput = computeOutput(request.model(), request.baseInputs());

        List<ParameterSensitivity> params = request.baseInputs().entrySet().stream()
            .map(e -> {
                String key = e.getKey();
                double base = e.getValue();
                double lowVal  = base * (1 - swing);
                double highVal = base * (1 + swing);

                Map<String, Double> low  = new HashMap<>(request.baseInputs()); low.put(key, lowVal);
                Map<String, Double> high = new HashMap<>(request.baseInputs()); high.put(key, highVal);

                Double lowOut  = tryCompute(request.model(), low);
                Double highOut = tryCompute(request.model(), high);
                double impact  = (lowOut != null && highOut != null) ? Math.abs(highOut - lowOut) : 0.0;

                return new ParameterSensitivity(key, lowVal, highVal, lowOut, highOut, impact);
            })
            .sorted(Comparator.comparingDouble(ParameterSensitivity::impact).reversed())
            .toList();

        return new SensitivityResponse(baseOutput, params);
    }

    private Double tryCompute(ModelType model, Map<String, Double> inputs) {
        try { return computeOutput(model, inputs); } catch (Exception e) { return null; }
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
