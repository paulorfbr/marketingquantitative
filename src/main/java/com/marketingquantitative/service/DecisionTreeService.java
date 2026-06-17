package com.marketingquantitative.service;

import com.marketingquantitative.dto.DecisionTreeRequest;
import com.marketingquantitative.dto.DecisionTreeRequest.BranchDto;
import com.marketingquantitative.dto.DecisionTreeRequest.NodeDto;
import com.marketingquantitative.dto.DecisionTreeRequest.NodeKind;
import com.marketingquantitative.dto.DecisionTreeResponse;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.*;

@Service
public class DecisionTreeService {

    @Transactional(readOnly = true)
    public DecisionTreeResponse calculate(DecisionTreeRequest request) {
        validate(request.root());

        Map<String, Double> emvMap = new LinkedHashMap<>();
        computeEmv(request.root(), emvMap);

        Set<String> optimalBranchIds = new LinkedHashSet<>();
        traceOptimal(request.root(), emvMap, optimalBranchIds);

        return new DecisionTreeResponse(emvMap.get(request.root().id()), emvMap, optimalBranchIds);
    }

    // ── Validation ──────────────────────────────────────────────────────────────

    private void validate(NodeDto node) {
        if (node.kind() == NodeKind.chance) {
            double sum = 0;
            for (BranchDto b : node.branches()) {
                if (b.probability() == null || b.probability() < 0 || b.probability() > 1) {
                    throw new ResponseStatusException(
                        HttpStatus.BAD_REQUEST, "probability must be between 0 and 1");
                }
                sum += b.probability();
            }
            if (Math.abs(sum - 1.0) > 0.001) {
                throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST, "probabilities must sum to 1.0");
            }
        }
        for (BranchDto b : node.branches()) {
            if (b.child() == null && b.terminalValue() == null) {
                throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST, "tree must have at least one terminal value");
            }
            if (b.child() != null) {
                validate(b.child());
            }
        }
    }

    // ── EMV computation (bottom-up) ─────────────────────────────────────────────

    private double computeEmv(NodeDto node, Map<String, Double> emvMap) {
        double[] vals = node.branches().stream().mapToDouble(b ->
            b.child() != null
                ? computeEmv(b.child(), emvMap)
                : (b.terminalValue() != null ? b.terminalValue() : 0.0)
        ).toArray();

        double emv;
        if (node.kind() == NodeKind.chance) {
            emv = 0;
            for (int i = 0; i < node.branches().size(); i++) {
                emv += node.branches().get(i).probability() * vals[i];
            }
        } else {
            emv = Arrays.stream(vals).max().orElse(0.0);
        }

        emvMap.put(node.id(), emv);
        return emv;
    }

    // ── Optimal path tracing (top-down) ─────────────────────────────────────────

    private void traceOptimal(NodeDto node, Map<String, Double> emvMap, Set<String> opt) {
        if (node.kind() == NodeKind.decision) {
            String bestId = null;
            double bestVal = Double.NEGATIVE_INFINITY;
            for (BranchDto b : node.branches()) {
                double val = b.child() != null
                    ? emvMap.getOrDefault(b.child().id(), 0.0)
                    : (b.terminalValue() != null ? b.terminalValue() : 0.0);
                if (val > bestVal) { bestVal = val; bestId = b.id(); }
            }
            if (bestId != null) {
                opt.add(bestId);
                final String fid = bestId;
                node.branches().stream()
                    .filter(b -> b.id().equals(fid) && b.child() != null)
                    .findFirst()
                    .ifPresent(b -> traceOptimal(b.child(), emvMap, opt));
            }
        } else {
            for (BranchDto b : node.branches()) {
                opt.add(b.id());
                if (b.child() != null) traceOptimal(b.child(), emvMap, opt);
            }
        }
    }
}
