# Sensitivity Analysis & Monte Carlo Simulation — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add two new backend-computed tools — Sensitivity Analysis (tornado chart) and Monte Carlo Simulation (CDF + stats) — each supporting Break-even and EOQ models.

**Architecture:** Two new Next.js pages (`/sensitivity`, `/montecarlo`) each delegate all computation to Spring Boot via `POST` requests. Backend services reuse existing `BreakevenService` and `EoqService` — no duplicate calculation logic. Frontend renders SVG charts from the API response.

**Tech Stack:** Java 21 · Spring Boot 3.3 · Jakarta Bean Validation · JUnit 5 · AssertJ · Next.js 14 (App Router) · TypeScript · React 18 · SVG

## Global Constraints

- Java package root: `com.marketingquantitative`
- All Java DTOs are `record` types; services are `@Service` with `@Transactional(readOnly = true)`
- All numeric frontend outputs use `toFixed(2)`
- Inline validation errors use the existing `FieldError` component (`components/shared/FieldError.tsx`)
- No Flyway migrations — these are stateless compute endpoints
- No external libraries: use `java.util.Random` for Monte Carlo sampling
- `@NotNull`, `@Positive`, `@Min`, `@Max` for all Bean Validation constraints
- Frontend components: `"use client"` where event handlers or hooks are used; 2-space indent; `const` arrow functions; strict TypeScript

---

## File Map

### New backend files

```
src/main/java/com/marketingquantitative/
  shared/
    ModelType.java                    — enum BREAKEVEN, EOQ
    OutputMetric.java                 — enum BREAKEVEN_QUANTITY, EOQ_QUANTITY
    DistributionType.java             — enum NORMAL, UNIFORM, TRIANGULAR
    InputDistribution.java            — record for Monte Carlo per-input distribution spec

  sensitivity/
    BaseInput.java                    — record { Double base } — one entry per sensitivity input
    SensitivityBar.java               — record { String parameter, double lowValue, double highValue, double lowInput, double highInput }
    SensitivityRequest.java           — @Valid DTO: model, outputMetric, variationPercent, inputs map
    SensitivityResponse.java          — record { double baseline, List<SensitivityBar> bars }
    SensitivityService.java           — varies inputs one-at-a-time, delegates to existing services, sorts bars
    SensitivityController.java        — POST /api/sensitivity/calculate

  montecarlo/
    CdfPoint.java                     — record { double x, double cumulativeProbability }
    MonteCarloRequest.java            — @Valid DTO: model, outputMetric, iterations, inputs map
    MonteCarloResponse.java           — record { double mean, stdDev, p10, p50, p90, int validSamples, List<CdfPoint> cdfPoints }
    MonteCarloService.java            — runs N iterations, samples distributions, builds CDF
    MonteCarloController.java         — POST /api/montecarlo/simulate

src/test/java/com/marketingquantitative/service/
  SensitivityServiceTest.java
  MonteCarloServiceTest.java
```

### New frontend files

```
frontend/src/
  lib/
    sensitivity.ts                    — TypeScript request/response types
    montecarlo.ts                     — TypeScript request/response types
  components/
    shared/
      ModelPicker.tsx                 — Break-even / EOQ toggle (used by both tools)
    sensitivity/
      SensitivityClient.tsx           — form + fetch + SVG tornado chart
    montecarlo/
      MonteCarloClient.tsx            — form + fetch + SVG CDF chart + stats panel
  app/
    sensitivity/
      page.tsx                        — thin server component
    montecarlo/
      page.tsx                        — thin server component
```

### Modified frontend files

```
frontend/src/app/page.tsx             — add two new tool cards to the nav grid
```

---

## Task 1: Backend shared types

**Files:**
- Create: `src/main/java/com/marketingquantitative/shared/ModelType.java`
- Create: `src/main/java/com/marketingquantitative/shared/OutputMetric.java`
- Create: `src/main/java/com/marketingquantitative/shared/DistributionType.java`
- Create: `src/main/java/com/marketingquantitative/shared/InputDistribution.java`

**Interfaces:**
- Produces: `ModelType` (BREAKEVEN, EOQ), `OutputMetric` (BREAKEVEN_QUANTITY, EOQ_QUANTITY), `DistributionType` (NORMAL, UNIFORM, TRIANGULAR), `InputDistribution` record — consumed by Tasks 2–5.

- [ ] **Step 1: Create ModelType.java**

```java
package com.marketingquantitative.shared;

public enum ModelType {
    BREAKEVEN,
    EOQ
}
```

- [ ] **Step 2: Create OutputMetric.java**

```java
package com.marketingquantitative.shared;

public enum OutputMetric {
    BREAKEVEN_QUANTITY,
    EOQ_QUANTITY
}
```

- [ ] **Step 3: Create DistributionType.java**

```java
package com.marketingquantitative.shared;

public enum DistributionType {
    NORMAL,
    UNIFORM,
    TRIANGULAR
}
```

- [ ] **Step 4: Create InputDistribution.java**

All fields are nullable; the service validates required fields at runtime based on `distribution`.

```java
package com.marketingquantitative.shared;

import jakarta.validation.constraints.NotNull;

public record InputDistribution(
    @NotNull DistributionType distribution,
    Double mean,
    Double stdDev,
    Double min,
    Double max,
    Double mode
) {}
```

- [ ] **Step 5: Compile check**

```bash
mvn compile -q
```

Expected: BUILD SUCCESS with no errors.

- [ ] **Step 6: Commit**

```bash
git add src/main/java/com/marketingquantitative/shared/
git commit -m "feat: add shared enums and InputDistribution for sensitivity/montecarlo"
```

---

## Task 2: SensitivityService (TDD)

**Files:**
- Create: `src/main/java/com/marketingquantitative/sensitivity/BaseInput.java`
- Create: `src/main/java/com/marketingquantitative/sensitivity/SensitivityBar.java`
- Create: `src/main/java/com/marketingquantitative/sensitivity/SensitivityResponse.java`
- Create: `src/main/java/com/marketingquantitative/sensitivity/SensitivityService.java`
- Create: `src/test/java/com/marketingquantitative/service/SensitivityServiceTest.java`

**Interfaces:**
- Consumes: `ModelType`, `OutputMetric`, `BreakevenService.calculate(BreakevenRequest)`, `EoqService.calculate(EoqRequest)`
- Produces: `SensitivityService.calculate(SensitivityRequest) → SensitivityResponse`

- [ ] **Step 1: Create the supporting records**

`BaseInput.java`:
```java
package com.marketingquantitative.sensitivity;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

public record BaseInput(
    @NotNull @Positive Double base
) {}
```

`SensitivityBar.java`:
```java
package com.marketingquantitative.sensitivity;

public record SensitivityBar(
    String parameter,
    double lowValue,
    double highValue,
    double lowInput,
    double highInput
) {}
```

`SensitivityResponse.java`:
```java
package com.marketingquantitative.sensitivity;

import java.util.List;

public record SensitivityResponse(
    double baseline,
    List<SensitivityBar> bars
) {}
```

- [ ] **Step 2: Create a stub SensitivityService (so tests compile)**

```java
package com.marketingquantitative.sensitivity;

import com.marketingquantitative.service.BreakevenService;
import com.marketingquantitative.service.EoqService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class SensitivityService {
    private final BreakevenService breakevenService;
    private final EoqService eoqService;

    SensitivityService(BreakevenService breakevenService, EoqService eoqService) {
        this.breakevenService = breakevenService;
        this.eoqService = eoqService;
    }

    @Transactional(readOnly = true)
    public SensitivityResponse calculate(SensitivityRequest request) {
        throw new UnsupportedOperationException("not yet implemented");
    }
}
```

Also create the stub `SensitivityRequest.java` (needed for the service to compile):
```java
package com.marketingquantitative.sensitivity;

import com.marketingquantitative.shared.ModelType;
import com.marketingquantitative.shared.OutputMetric;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.Map;

public record SensitivityRequest(
    @NotNull ModelType model,
    @NotNull OutputMetric outputMetric,
    @NotNull @Min(1) @Max(99) Integer variationPercent,
    @NotNull @Size(min = 1) Map<String, @Valid BaseInput> inputs
) {}
```

- [ ] **Step 3: Write the failing tests**

```java
package com.marketingquantitative.service;

import com.marketingquantitative.sensitivity.BaseInput;
import com.marketingquantitative.sensitivity.SensitivityRequest;
import com.marketingquantitative.sensitivity.SensitivityResponse;
import com.marketingquantitative.sensitivity.SensitivityService;
import com.marketingquantitative.service.BreakevenService;
import com.marketingquantitative.service.EoqService;
import com.marketingquantitative.shared.ModelType;
import com.marketingquantitative.shared.OutputMetric;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Spy;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.within;

@ExtendWith(MockitoExtension.class)
class SensitivityServiceTest {

    @Spy
    private BreakevenService breakevenService;

    @Spy
    private EoqService eoqService;

    @InjectMocks
    private SensitivityService service;

    // TC-SA-01: bars sorted by impact descending
    @Test
    void breakeven_barsAreSortedByImpactDescending() {
        // CF=10000, CVu=5, Price=15, baseline BEQ = 1000
        // variationPercent=20 => Price varies most (elastic), CF varies proportionally
        var request = new SensitivityRequest(
            ModelType.BREAKEVEN,
            OutputMetric.BREAKEVEN_QUANTITY,
            20,
            Map.of(
                "cf",    new BaseInput(10000.0),
                "cvu",   new BaseInput(5.0),
                "price", new BaseInput(15.0)
            )
        );

        SensitivityResponse result = service.calculate(request);

        assertThat(result.bars()).isNotEmpty();
        for (int i = 0; i < result.bars().size() - 1; i++) {
            double impactI = result.bars().get(i).highValue() - result.bars().get(i).lowValue();
            double impactNext = result.bars().get(i + 1).highValue() - result.bars().get(i + 1).lowValue();
            assertThat(impactI).isGreaterThanOrEqualTo(impactNext);
        }
    }

    // TC-SA-02: baseline equals direct service call
    @Test
    void breakeven_baselineMatchesDirectServiceCall() {
        var request = new SensitivityRequest(
            ModelType.BREAKEVEN,
            OutputMetric.BREAKEVEN_QUANTITY,
            20,
            Map.of(
                "cf",    new BaseInput(10000.0),
                "cvu",   new BaseInput(5.0),
                "price", new BaseInput(15.0)
            )
        );

        SensitivityResponse result = service.calculate(request);

        // CF=10000, CVu=5, Price=15 → BEQ = 10000/(15-5) = 1000
        assertThat(result.baseline()).isCloseTo(1000.0, within(0.001));
    }

    // TC-SA-03: low/high inputs are symmetric around base
    @Test
    void breakeven_lowAndHighInputsAreSymmetricAroundBase() {
        var request = new SensitivityRequest(
            ModelType.BREAKEVEN,
            OutputMetric.BREAKEVEN_QUANTITY,
            20,
            Map.of(
                "cf",    new BaseInput(10000.0),
                "cvu",   new BaseInput(5.0),
                "price", new BaseInput(15.0)
            )
        );

        SensitivityResponse result = service.calculate(request);

        result.bars().forEach(bar -> {
            // find which base value this parameter uses
            double base = switch (bar.parameter()) {
                case "cf"    -> 10000.0;
                case "cvu"   -> 5.0;
                case "price" -> 15.0;
                default -> throw new AssertionError("unexpected param: " + bar.parameter());
            };
            assertThat(bar.lowInput()).isCloseTo(base * 0.80, within(0.001));
            assertThat(bar.highInput()).isCloseTo(base * 1.20, within(0.001));
        });
    }

    // TC-SA-04: EOQ model works
    @Test
    void eoq_baselineMatchesDirectServiceCall() {
        // D=1000, S=50, C=10, I=0.2 → EOQ = sqrt(2*1000*50/(0.2*10)) = sqrt(50000) ≈ 223.607
        var request = new SensitivityRequest(
            ModelType.EOQ,
            OutputMetric.EOQ_QUANTITY,
            10,
            Map.of(
                "demand",       new BaseInput(1000.0),
                "orderingCost", new BaseInput(50.0),
                "unitCost",     new BaseInput(10.0),
                "holdingRate",  new BaseInput(0.2)
            )
        );

        SensitivityResponse result = service.calculate(request);

        assertThat(result.baseline()).isCloseTo(223.607, within(0.01));
    }

    // TC-SA-05: three bars returned for three inputs
    @Test
    void breakeven_returnsOneBarPerInput() {
        var request = new SensitivityRequest(
            ModelType.BREAKEVEN,
            OutputMetric.BREAKEVEN_QUANTITY,
            20,
            Map.of(
                "cf",    new BaseInput(10000.0),
                "cvu",   new BaseInput(5.0),
                "price", new BaseInput(15.0)
            )
        );

        SensitivityResponse result = service.calculate(request);

        assertThat(result.bars()).hasSize(3);
    }
}
```

- [ ] **Step 4: Run tests — verify they fail**

```bash
mvn test -pl . -Dtest=SensitivityServiceTest -q
```

Expected: FAILURE — `UnsupportedOperationException: not yet implemented`

- [ ] **Step 5: Implement SensitivityService**

```java
package com.marketingquantitative.sensitivity;

import com.marketingquantitative.dto.BreakevenRequest;
import com.marketingquantitative.dto.EoqRequest;
import com.marketingquantitative.service.BreakevenService;
import com.marketingquantitative.service.EoqService;
import com.marketingquantitative.shared.ModelType;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.*;

@Service
public class SensitivityService {
    private final BreakevenService breakevenService;
    private final EoqService eoqService;

    SensitivityService(BreakevenService breakevenService, EoqService eoqService) {
        this.breakevenService = breakevenService;
        this.eoqService = eoqService;
    }

    @Transactional(readOnly = true)
    public SensitivityResponse calculate(SensitivityRequest request) {
        Map<String, Double> baseValues = extractBaseValues(request.inputs());
        validateKeys(request.model(), baseValues);

        double baseline = evaluateModel(request.model(), baseValues);
        double factor = request.variationPercent() / 100.0;

        List<SensitivityBar> bars = new ArrayList<>();
        for (String param : baseValues.keySet()) {
            double base = baseValues.get(param);
            double lowInput  = base * (1 - factor);
            double highInput = base * (1 + factor);

            Map<String, Double> lowMap  = new HashMap<>(baseValues);
            Map<String, Double> highMap = new HashMap<>(baseValues);
            lowMap.put(param, lowInput);
            highMap.put(param, highInput);

            double lowValue  = evaluateModel(request.model(), lowMap);
            double highValue = evaluateModel(request.model(), highMap);

            bars.add(new SensitivityBar(param, lowValue, highValue, lowInput, highInput));
        }

        bars.sort(Comparator.comparingDouble(b -> -(b.highValue() - b.lowValue())));
        return new SensitivityResponse(baseline, bars);
    }

    private Map<String, Double> extractBaseValues(Map<String, BaseInput> inputs) {
        Map<String, Double> result = new LinkedHashMap<>();
        inputs.forEach((k, v) -> result.put(k, v.base()));
        return result;
    }

    private void validateKeys(ModelType model, Map<String, Double> inputs) {
        Set<String> required = switch (model) {
            case BREAKEVEN -> Set.of("cf", "cvu", "price");
            case EOQ       -> Set.of("demand", "orderingCost", "unitCost", "holdingRate");
        };
        Set<String> unknown = new HashSet<>(inputs.keySet());
        unknown.removeAll(required);
        if (!unknown.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unknown input keys: " + unknown);
        }
        Set<String> missing = new HashSet<>(required);
        missing.removeAll(inputs.keySet());
        if (!missing.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Missing required inputs: " + missing);
        }
    }

    private double evaluateModel(ModelType model, Map<String, Double> inputs) {
        return switch (model) {
            case BREAKEVEN -> breakevenService.calculate(
                new BreakevenRequest(inputs.get("cf"), inputs.get("cvu"), inputs.get("price"))
            ).breakEvenQty();
            case EOQ -> eoqService.calculate(
                new EoqRequest(inputs.get("demand"), inputs.get("orderingCost"),
                               inputs.get("unitCost"), inputs.get("holdingRate"))
            ).eoq();
        };
    }
}
```

- [ ] **Step 6: Run tests — verify they pass**

```bash
mvn test -pl . -Dtest=SensitivityServiceTest -q
```

Expected: BUILD SUCCESS, 5 tests passed.

- [ ] **Step 7: Commit**

```bash
git add src/main/java/com/marketingquantitative/sensitivity/ \
        src/test/java/com/marketingquantitative/service/SensitivityServiceTest.java
git commit -m "feat: add SensitivityService with tornado bar calculation (TDD)"
```

---

## Task 3: SensitivityController

**Files:**
- Create: `src/main/java/com/marketingquantitative/sensitivity/SensitivityController.java`

**Interfaces:**
- Consumes: `SensitivityService.calculate(SensitivityRequest) → SensitivityResponse`
- Produces: `POST /api/sensitivity/calculate` → `200 SensitivityResponse`

- [ ] **Step 1: Create SensitivityController**

```java
package com.marketingquantitative.sensitivity;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@Tag(name = "Sensitivity", description = "Tornado chart — one-at-a-time input variation")
@RestController
@RequestMapping("/api/sensitivity")
public class SensitivityController {

    private final SensitivityService service;

    SensitivityController(SensitivityService service) {
        this.service = service;
    }

    @Operation(summary = "Calculate sensitivity tornado bars")
    @PostMapping("/calculate")
    public ResponseEntity<SensitivityResponse> calculate(@Valid @RequestBody SensitivityRequest request) {
        return ResponseEntity.ok(service.calculate(request));
    }
}
```

- [ ] **Step 2: Compile and verify Spring context loads**

```bash
mvn compile -q && mvn test -pl . -Dtest=MarketingQuantitativeApplicationTests -q
```

Expected: BUILD SUCCESS.

- [ ] **Step 3: Manual smoke test (requires backend running)**

Start the backend with `mvn spring-boot:run`, then:
```bash
curl -s -X POST http://localhost:8080/api/sensitivity/calculate \
  -H "Content-Type: application/json" \
  -d '{
    "model": "BREAKEVEN",
    "outputMetric": "BREAKEVEN_QUANTITY",
    "variationPercent": 20,
    "inputs": {
      "cf":    {"base": 10000},
      "cvu":   {"base": 5},
      "price": {"base": 15}
    }
  }' | jq .
```

Expected: JSON with `baseline: 1000.0` and `bars` array with 3 elements, sorted by `highValue - lowValue` descending.

- [ ] **Step 4: Commit**

```bash
git add src/main/java/com/marketingquantitative/sensitivity/SensitivityController.java
git commit -m "feat: add SensitivityController POST /api/sensitivity/calculate"
```

---

## Task 4: MonteCarloService (TDD)

**Files:**
- Create: `src/main/java/com/marketingquantitative/montecarlo/CdfPoint.java`
- Create: `src/main/java/com/marketingquantitative/montecarlo/MonteCarloResponse.java`
- Create: `src/main/java/com/marketingquantitative/montecarlo/MonteCarloRequest.java`
- Create: `src/main/java/com/marketingquantitative/montecarlo/MonteCarloService.java`
- Create: `src/test/java/com/marketingquantitative/service/MonteCarloServiceTest.java`

**Interfaces:**
- Consumes: `ModelType`, `InputDistribution`, `DistributionType`, `BreakevenService`, `EoqService`
- Produces: `MonteCarloService.simulate(MonteCarloRequest) → MonteCarloResponse`

- [ ] **Step 1: Create the supporting records**

`CdfPoint.java`:
```java
package com.marketingquantitative.montecarlo;

public record CdfPoint(
    double x,
    double cumulativeProbability
) {}
```

`MonteCarloResponse.java`:
```java
package com.marketingquantitative.montecarlo;

import java.util.List;

public record MonteCarloResponse(
    double mean,
    double stdDev,
    double p10,
    double p50,
    double p90,
    int validSamples,
    List<CdfPoint> cdfPoints
) {}
```

`MonteCarloRequest.java`:
```java
package com.marketingquantitative.montecarlo;

import com.marketingquantitative.shared.InputDistribution;
import com.marketingquantitative.shared.ModelType;
import com.marketingquantitative.shared.OutputMetric;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.Map;

public record MonteCarloRequest(
    @NotNull ModelType model,
    @NotNull OutputMetric outputMetric,
    @NotNull @Min(1) @Max(100000) Integer iterations,
    @NotNull @Size(min = 1) Map<String, @Valid InputDistribution> inputs
) {}
```

- [ ] **Step 2: Create a stub MonteCarloService (so tests compile)**

```java
package com.marketingquantitative.montecarlo;

import com.marketingquantitative.service.BreakevenService;
import com.marketingquantitative.service.EoqService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class MonteCarloService {
    private final BreakevenService breakevenService;
    private final EoqService eoqService;

    MonteCarloService(BreakevenService breakevenService, EoqService eoqService) {
        this.breakevenService = breakevenService;
        this.eoqService = eoqService;
    }

    @Transactional(readOnly = true)
    public MonteCarloResponse simulate(MonteCarloRequest request) {
        throw new UnsupportedOperationException("not yet implemented");
    }
}
```

- [ ] **Step 3: Write the failing tests**

```java
package com.marketingquantitative.service;

import com.marketingquantitative.montecarlo.MonteCarloRequest;
import com.marketingquantitative.montecarlo.MonteCarloResponse;
import com.marketingquantitative.montecarlo.MonteCarloService;
import com.marketingquantitative.service.BreakevenService;
import com.marketingquantitative.service.EoqService;
import com.marketingquantitative.shared.DistributionType;
import com.marketingquantitative.shared.InputDistribution;
import com.marketingquantitative.shared.ModelType;
import com.marketingquantitative.shared.OutputMetric;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Spy;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.server.ResponseStatusException;

import java.util.Map;

import static org.assertj.core.api.Assertions.*;

@ExtendWith(MockitoExtension.class)
class MonteCarloServiceTest {

    @Spy
    private BreakevenService breakevenService;

    @Spy
    private EoqService eoqService;

    @InjectMocks
    private MonteCarloService service;

    private static InputDistribution fixed(double value) {
        // UNIFORM with min==max returns value every time — useful for deterministic tests
        return new InputDistribution(DistributionType.UNIFORM, null, null, value, value, null);
    }

    // TC-MC-01: P10 < P50 < P90
    @Test
    void breakeven_percentileOrdering() {
        var request = new MonteCarloRequest(
            ModelType.BREAKEVEN, OutputMetric.BREAKEVEN_QUANTITY, 1000,
            Map.of(
                "cf",    new InputDistribution(DistributionType.UNIFORM, null, null, 8000.0, 12000.0, null),
                "cvu",   fixed(5.0),
                "price", fixed(15.0)
            )
        );

        MonteCarloResponse result = service.simulate(request);

        assertThat(result.p10()).isLessThan(result.p50());
        assertThat(result.p50()).isLessThan(result.p90());
    }

    // TC-MC-02: UNIFORM[0, 100] converges to mean ≈ 50
    @Test
    void eoq_uniformMeanConvergesToMidpoint() {
        // D uniform[500, 1500], others fixed → mean EOQ should be near sqrt(2*1000*50/(0.2*10)) = 223.6
        var request = new MonteCarloRequest(
            ModelType.EOQ, OutputMetric.EOQ_QUANTITY, 10000,
            Map.of(
                "demand",       new InputDistribution(DistributionType.UNIFORM, null, null, 500.0, 1500.0, null),
                "orderingCost", fixed(50.0),
                "unitCost",     fixed(10.0),
                "holdingRate",  fixed(0.2)
            )
        );

        MonteCarloResponse result = service.simulate(request);

        // EOQ scales as sqrt(D), so mean EOQ with D in [500,1500] is not exactly 223.6, but should be reasonable
        assertThat(result.mean()).isGreaterThan(100.0).isLessThan(400.0);
    }

    // TC-MC-03: CDF starts at ~0 and ends at ~1
    @Test
    void breakeven_cdfBoundsAreZeroAndOne() {
        var request = new MonteCarloRequest(
            ModelType.BREAKEVEN, OutputMetric.BREAKEVEN_QUANTITY, 500,
            Map.of(
                "cf",    new InputDistribution(DistributionType.NORMAL, 10000.0, 1000.0, null, null, null),
                "cvu",   fixed(5.0),
                "price", fixed(15.0)
            )
        );

        MonteCarloResponse result = service.simulate(request);

        assertThat(result.cdfPoints()).isNotEmpty();
        assertThat(result.cdfPoints().get(0).cumulativeProbability()).isCloseTo(0.0, within(0.02));
        assertThat(result.cdfPoints().get(result.cdfPoints().size() - 1).cumulativeProbability())
            .isCloseTo(1.0, within(0.02));
    }

    // TC-MC-04: iteration count drives valid samples
    @Test
    void breakeven_validSamplesEqualsIterationsWhenAllValid() {
        var request = new MonteCarloRequest(
            ModelType.BREAKEVEN, OutputMetric.BREAKEVEN_QUANTITY, 200,
            Map.of(
                "cf",    fixed(10000.0),
                "cvu",   fixed(5.0),
                "price", fixed(15.0)
            )
        );

        MonteCarloResponse result = service.simulate(request);

        assertThat(result.validSamples()).isEqualTo(200);
    }

    // TC-MC-05: TRIANGULAR min <= mode <= max validated
    @Test
    void invalidTriangular_modeAboveMax_throws400() {
        var request = new MonteCarloRequest(
            ModelType.BREAKEVEN, OutputMetric.BREAKEVEN_QUANTITY, 100,
            Map.of(
                "cf",    new InputDistribution(DistributionType.TRIANGULAR, null, null, 8000.0, 12000.0, 15000.0),
                "cvu",   fixed(5.0),
                "price", fixed(15.0)
            )
        );

        assertThatThrownBy(() -> service.simulate(request))
            .isInstanceOf(ResponseStatusException.class)
            .hasMessageContaining("mode must be");
    }
}
```

- [ ] **Step 4: Run tests — verify they fail**

```bash
mvn test -pl . -Dtest=MonteCarloServiceTest -q
```

Expected: FAILURE — `UnsupportedOperationException: not yet implemented`

- [ ] **Step 5: Implement MonteCarloService**

```java
package com.marketingquantitative.montecarlo;

import com.marketingquantitative.dto.BreakevenRequest;
import com.marketingquantitative.dto.EoqRequest;
import com.marketingquantitative.service.BreakevenService;
import com.marketingquantitative.service.EoqService;
import com.marketingquantitative.shared.DistributionType;
import com.marketingquantitative.shared.InputDistribution;
import com.marketingquantitative.shared.ModelType;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.*;

@Service
public class MonteCarloService {
    private static final int MAX_ATTEMPTS_MULTIPLIER = 10;
    private static final int CDF_POINTS = 200;

    private final BreakevenService breakevenService;
    private final EoqService eoqService;
    private final Random random = new Random();

    MonteCarloService(BreakevenService breakevenService, EoqService eoqService) {
        this.breakevenService = breakevenService;
        this.eoqService = eoqService;
    }

    @Transactional(readOnly = true)
    public MonteCarloResponse simulate(MonteCarloRequest request) {
        validateModelKeys(request.model(), request.inputs());
        validateDistributionParams(request.inputs());

        int target = request.iterations();
        double[] results = new double[target];
        int valid = 0;
        int attempts = 0;
        int maxAttempts = target * MAX_ATTEMPTS_MULTIPLIER;

        while (valid < target && attempts < maxAttempts) {
            attempts++;
            try {
                Map<String, Double> sampled = sampleInputs(request.inputs());
                results[valid] = evaluateModel(request.model(), sampled);
                valid++;
            } catch (RuntimeException ignored) {
                // invalid sample (e.g. price < cvu after sampling); skip
            }
        }

        if (valid == 0) {
            throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY,
                "No valid samples generated — check distribution parameters");
        }

        double[] trimmed = Arrays.copyOf(results, valid);
        Arrays.sort(trimmed);

        double mean = Arrays.stream(trimmed).average().orElse(0);
        double variance = Arrays.stream(trimmed).map(v -> (v - mean) * (v - mean)).average().orElse(0);
        double stdDev = Math.sqrt(variance);
        double p10 = percentile(trimmed, 0.10);
        double p50 = percentile(trimmed, 0.50);
        double p90 = percentile(trimmed, 0.90);
        List<CdfPoint> cdfPoints = buildCdfPoints(trimmed);

        return new MonteCarloResponse(mean, stdDev, p10, p50, p90, valid, cdfPoints);
    }

    private double sample(InputDistribution dist) {
        return switch (dist.distribution()) {
            case NORMAL     -> dist.mean() + dist.stdDev() * random.nextGaussian();
            case UNIFORM    -> dist.min() + random.nextDouble() * (dist.max() - dist.min());
            case TRIANGULAR -> sampleTriangular(dist.min(), dist.max(), dist.mode());
        };
    }

    private double sampleTriangular(double min, double max, double mode) {
        double u = random.nextDouble();
        double fc = (mode - min) / (max - min);
        if (u < fc) {
            return min + Math.sqrt(u * (max - min) * (mode - min));
        } else {
            return max - Math.sqrt((1 - u) * (max - min) * (max - mode));
        }
    }

    private Map<String, Double> sampleInputs(Map<String, InputDistribution> inputs) {
        Map<String, Double> result = new HashMap<>();
        inputs.forEach((k, dist) -> result.put(k, sample(dist)));
        return result;
    }

    private double evaluateModel(ModelType model, Map<String, Double> inputs) {
        return switch (model) {
            case BREAKEVEN -> breakevenService.calculate(
                new BreakevenRequest(inputs.get("cf"), inputs.get("cvu"), inputs.get("price"))
            ).breakEvenQty();
            case EOQ -> eoqService.calculate(
                new EoqRequest(inputs.get("demand"), inputs.get("orderingCost"),
                               inputs.get("unitCost"), inputs.get("holdingRate"))
            ).eoq();
        };
    }

    private double percentile(double[] sorted, double p) {
        int idx = (int) Math.ceil(p * sorted.length) - 1;
        return sorted[Math.max(0, Math.min(sorted.length - 1, idx))];
    }

    private List<CdfPoint> buildCdfPoints(double[] sorted) {
        List<CdfPoint> points = new ArrayList<>();
        int n = sorted.length;
        for (int i = 0; i < CDF_POINTS; i++) {
            int idx = (int) Math.round((double) i / (CDF_POINTS - 1) * (n - 1));
            double x = sorted[idx];
            double prob = (double) (idx + 1) / n;
            points.add(new CdfPoint(x, prob));
        }
        return points;
    }

    private void validateModelKeys(ModelType model, Map<String, InputDistribution> inputs) {
        Set<String> required = switch (model) {
            case BREAKEVEN -> Set.of("cf", "cvu", "price");
            case EOQ       -> Set.of("demand", "orderingCost", "unitCost", "holdingRate");
        };
        Set<String> unknown = new HashSet<>(inputs.keySet());
        unknown.removeAll(required);
        if (!unknown.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unknown input keys: " + unknown);
        }
        Set<String> missing = new HashSet<>(required);
        missing.removeAll(inputs.keySet());
        if (!missing.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Missing required inputs: " + missing);
        }
    }

    private void validateDistributionParams(Map<String, InputDistribution> inputs) {
        inputs.forEach((key, dist) -> {
            switch (dist.distribution()) {
                case NORMAL -> {
                    if (dist.mean() == null || dist.stdDev() == null || dist.stdDev() <= 0) {
                        throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                            "NORMAL distribution for '" + key + "' requires mean and stdDev > 0");
                    }
                }
                case UNIFORM -> {
                    if (dist.min() == null || dist.max() == null || dist.min() >= dist.max()) {
                        throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                            "UNIFORM distribution for '" + key + "' requires min < max");
                    }
                }
                case TRIANGULAR -> {
                    if (dist.min() == null || dist.max() == null || dist.mode() == null
                            || dist.mode() < dist.min() || dist.mode() > dist.max()) {
                        throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                            "mode must be between min and max for TRIANGULAR distribution '" + key + "'");
                    }
                }
            }
        });
    }
}
```

- [ ] **Step 6: Run tests — verify they pass**

```bash
mvn test -pl . -Dtest=MonteCarloServiceTest -q
```

Expected: BUILD SUCCESS, 5 tests passed.

- [ ] **Step 7: Commit**

```bash
git add src/main/java/com/marketingquantitative/montecarlo/ \
        src/test/java/com/marketingquantitative/service/MonteCarloServiceTest.java
git commit -m "feat: add MonteCarloService with sampling and CDF calculation (TDD)"
```

---

## Task 5: MonteCarloController

**Files:**
- Create: `src/main/java/com/marketingquantitative/montecarlo/MonteCarloController.java`

**Interfaces:**
- Consumes: `MonteCarloService.simulate(MonteCarloRequest) → MonteCarloResponse`
- Produces: `POST /api/montecarlo/simulate` → `200 MonteCarloResponse`

- [ ] **Step 1: Create MonteCarloController**

```java
package com.marketingquantitative.montecarlo;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@Tag(name = "Monte Carlo", description = "Monte Carlo simulation — probabilistic output distribution")
@RestController
@RequestMapping("/api/montecarlo")
public class MonteCarloController {

    private final MonteCarloService service;

    MonteCarloController(MonteCarloService service) {
        this.service = service;
    }

    @Operation(summary = "Run Monte Carlo simulation")
    @PostMapping("/simulate")
    public ResponseEntity<MonteCarloResponse> simulate(@Valid @RequestBody MonteCarloRequest request) {
        return ResponseEntity.ok(service.simulate(request));
    }
}
```

- [ ] **Step 2: Compile and verify Spring context loads**

```bash
mvn compile -q && mvn test -pl . -Dtest=MarketingQuantitativeApplicationTests -q
```

Expected: BUILD SUCCESS.

- [ ] **Step 3: Manual smoke test (requires backend running)**

```bash
curl -s -X POST http://localhost:8080/api/montecarlo/simulate \
  -H "Content-Type: application/json" \
  -d '{
    "model": "BREAKEVEN",
    "outputMetric": "BREAKEVEN_QUANTITY",
    "iterations": 1000,
    "inputs": {
      "cf":    {"distribution":"UNIFORM","min":8000,"max":12000},
      "cvu":   {"distribution":"UNIFORM","min":4,"max":6},
      "price": {"distribution":"NORMAL","mean":15,"stdDev":1}
    }
  }' | jq '{mean, p10, p50, p90, validSamples, cdfCount: (.cdfPoints | length)}'
```

Expected: JSON with `validSamples: 1000`, `cdfCount: 200`, and `p10 < p50 < p90`.

- [ ] **Step 4: Commit**

```bash
git add src/main/java/com/marketingquantitative/montecarlo/MonteCarloController.java
git commit -m "feat: add MonteCarloController POST /api/montecarlo/simulate"
```

---

## Task 6: Frontend shared types + ModelPicker

**Files:**
- Create: `frontend/src/lib/sensitivity.ts`
- Create: `frontend/src/lib/montecarlo.ts`
- Create: `frontend/src/components/shared/ModelPicker.tsx`

**Interfaces:**
- Produces: `ModelType`, `SensitivityRequest`, `SensitivityResponse`, `MonteCarloRequest`, `MonteCarloResponse`, `ModelPicker` component — consumed by Tasks 7 and 8.

- [ ] **Step 1: Create sensitivity.ts**

```typescript
export type ModelType = 'BREAKEVEN' | 'EOQ';
export type OutputMetric = 'BREAKEVEN_QUANTITY' | 'EOQ_QUANTITY';

export interface BaseInput {
  base: number;
}

export interface SensitivityRequest {
  model: ModelType;
  outputMetric: OutputMetric;
  variationPercent: number;
  inputs: Record<string, BaseInput>;
}

export interface SensitivityBar {
  parameter: string;
  lowValue: number;
  highValue: number;
  lowInput: number;
  highInput: number;
}

export interface SensitivityResponse {
  baseline: number;
  bars: SensitivityBar[];
}

export const MODEL_OUTPUT_METRIC: Record<ModelType, OutputMetric> = {
  BREAKEVEN: 'BREAKEVEN_QUANTITY',
  EOQ: 'EOQ_QUANTITY',
};

export interface ParamMeta {
  key: string;
  label: string;
  unit: string;
  defaultBase: string;
}

export const BREAKEVEN_PARAMS: ParamMeta[] = [
  { key: 'cf',    label: 'Fixed Costs (CF)',              unit: '$',        defaultBase: '10000' },
  { key: 'cvu',   label: 'Variable Cost per Unit (CVu)',  unit: '$ / unit', defaultBase: '5'     },
  { key: 'price', label: 'Selling Price per Unit (P)',    unit: '$ / unit', defaultBase: '15'    },
];

export const EOQ_PARAMS: ParamMeta[] = [
  { key: 'demand',       label: 'Annual Demand (D)',        unit: 'units / yr', defaultBase: '1000' },
  { key: 'orderingCost', label: 'Ordering Cost (S)',         unit: '$ / order',  defaultBase: '50'   },
  { key: 'unitCost',     label: 'Unit Cost (C)',             unit: '$ / unit',   defaultBase: '10'   },
  { key: 'holdingRate',  label: 'Holding Cost Rate (I)',     unit: '% / yr',     defaultBase: '20'   },
];
```

- [ ] **Step 2: Create montecarlo.ts**

```typescript
export type ModelType = 'BREAKEVEN' | 'EOQ';
export type OutputMetric = 'BREAKEVEN_QUANTITY' | 'EOQ_QUANTITY';
export type DistributionType = 'NORMAL' | 'UNIFORM' | 'TRIANGULAR';

export interface InputDistribution {
  distribution: DistributionType;
  mean?: number;
  stdDev?: number;
  min?: number;
  max?: number;
  mode?: number;
}

export interface MonteCarloRequest {
  model: ModelType;
  outputMetric: OutputMetric;
  iterations: number;
  inputs: Record<string, InputDistribution>;
}

export interface CdfPoint {
  x: number;
  cumulativeProbability: number;
}

export interface MonteCarloResponse {
  mean: number;
  stdDev: number;
  p10: number;
  p50: number;
  p90: number;
  validSamples: number;
  cdfPoints: CdfPoint[];
}

export const MODEL_OUTPUT_METRIC: Record<ModelType, OutputMetric> = {
  BREAKEVEN: 'BREAKEVEN_QUANTITY',
  EOQ: 'EOQ_QUANTITY',
};

export interface ParamMeta {
  key: string;
  label: string;
  unit: string;
}

export const BREAKEVEN_PARAMS: ParamMeta[] = [
  { key: 'cf',    label: 'Fixed Costs (CF)',             unit: '$'        },
  { key: 'cvu',   label: 'Variable Cost per Unit (CVu)', unit: '$ / unit' },
  { key: 'price', label: 'Selling Price per Unit (P)',   unit: '$ / unit' },
];

export const EOQ_PARAMS: ParamMeta[] = [
  { key: 'demand',       label: 'Annual Demand (D)',     unit: 'units / yr' },
  { key: 'orderingCost', label: 'Ordering Cost (S)',      unit: '$ / order'  },
  { key: 'unitCost',     label: 'Unit Cost (C)',          unit: '$ / unit'   },
  { key: 'holdingRate',  label: 'Holding Cost Rate (I)', unit: '% / yr'     },
];
```

- [ ] **Step 3: Create ModelPicker.tsx**

```tsx
'use client';

interface Props {
  value: 'BREAKEVEN' | 'EOQ';
  onChange: (model: 'BREAKEVEN' | 'EOQ') => void;
}

const OPTIONS: { value: 'BREAKEVEN' | 'EOQ'; label: string }[] = [
  { value: 'BREAKEVEN', label: 'Break-even' },
  { value: 'EOQ',       label: 'EOQ'        },
];

export function ModelPicker({ value, onChange }: Props) {
  return (
    <div style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-6)' }}>
      {OPTIONS.map(opt => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          style={{
            padding: 'var(--space-2) var(--space-4)',
            borderRadius: 'var(--radius-md)',
            border: '2px solid',
            borderColor: value === opt.value ? 'var(--color-primary-600)' : 'var(--color-neutral-300)',
            background: value === opt.value ? 'var(--color-primary-50)' : 'transparent',
            color: value === opt.value ? 'var(--color-primary-700)' : 'var(--color-neutral-700)',
            fontWeight: value === opt.value ? 'var(--font-semibold)' : 'var(--font-normal)',
            cursor: 'pointer',
            fontSize: 'var(--text-sm)',
          }}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 4: Type-check**

```bash
cd frontend && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/lib/sensitivity.ts frontend/src/lib/montecarlo.ts \
        frontend/src/components/shared/ModelPicker.tsx
git commit -m "feat: add frontend types and ModelPicker component"
```

---

## Task 7: Sensitivity Analysis page

**Files:**
- Create: `frontend/src/components/sensitivity/SensitivityClient.tsx`
- Create: `frontend/src/app/sensitivity/page.tsx`
- Modify: `frontend/src/app/page.tsx`

**Interfaces:**
- Consumes: `SensitivityRequest`, `SensitivityResponse`, `ModelPicker`, `FieldError`, `POST /api/sensitivity/calculate`
- Produces: `/sensitivity` page with form, tornado chart SVG, and nav card

- [ ] **Step 1: Create the SensitivityClient component**

```tsx
'use client';

import { useState } from 'react';
import { ModelPicker } from '@/components/shared/ModelPicker';
import { FieldError } from '@/components/shared/FieldError';
import {
  type ModelType,
  type SensitivityResponse,
  BREAKEVEN_PARAMS,
  EOQ_PARAMS,
  MODEL_OUTPUT_METRIC,
  type ParamMeta,
} from '@/lib/sensitivity';

type FormState = Record<string, string>;
type Errors = Record<string, string>;

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost:8080';

function getParams(model: ModelType): ParamMeta[] {
  return model === 'BREAKEVEN' ? BREAKEVEN_PARAMS : EOQ_PARAMS;
}

function buildDefaultForm(params: ParamMeta[]): FormState {
  return Object.fromEntries(params.map(p => [p.key, p.defaultBase]));
}

function TornadoChart({ result, baseline }: { result: SensitivityResponse; baseline: number }) {
  const LABEL_W = 160;
  const CHART_W = 380;
  const ROW_H = 44;
  const PAD = 20;
  const HEIGHT = result.bars.length * ROW_H + PAD * 2;

  const allValues = result.bars.flatMap(b => [b.lowValue, b.highValue, baseline]);
  const minVal = Math.min(...allValues);
  const maxVal = Math.max(...allValues);
  const range = maxVal - minVal || 1;

  const toX = (v: number) => LABEL_W + ((v - minVal) / range) * CHART_W;
  const baseX = toX(baseline);

  return (
    <svg width={LABEL_W + CHART_W + PAD} height={HEIGHT} style={{ overflow: 'visible', display: 'block' }}>
      {/* axis line */}
      <line x1={baseX} y1={PAD} x2={baseX} y2={HEIGHT - PAD}
            stroke="var(--color-neutral-400)" strokeWidth={1} strokeDasharray="4 2" />

      {result.bars.map((bar, i) => {
        const y = PAD + i * ROW_H + ROW_H * 0.2;
        const barH = ROW_H * 0.6;
        const x1 = toX(Math.min(bar.lowValue, bar.highValue));
        const x2 = toX(Math.max(bar.lowValue, bar.highValue));
        return (
          <g key={bar.parameter}>
            <text x={LABEL_W - 8} y={y + barH / 2 + 4}
                  textAnchor="end" fontSize={12} fill="var(--color-neutral-700)">
              {bar.parameter}
            </text>
            <rect x={x1} y={y} width={x2 - x1} height={barH}
                  fill="var(--color-primary-400)" rx={2} opacity={0.85} />
            <text x={x1 - 4} y={y + barH / 2 + 4}
                  textAnchor="end" fontSize={10} fill="var(--color-neutral-500)">
              {bar.lowValue.toFixed(2)}
            </text>
            <text x={x2 + 4} y={y + barH / 2 + 4}
                  textAnchor="start" fontSize={10} fill="var(--color-neutral-500)">
              {bar.highValue.toFixed(2)}
            </text>
          </g>
        );
      })}

      {/* baseline label */}
      <text x={baseX} y={HEIGHT - 4} textAnchor="middle" fontSize={11}
            fill="var(--color-neutral-500)">
        baseline: {baseline.toFixed(2)}
      </text>
    </svg>
  );
}

export default function SensitivityClient() {
  const [model, setModel] = useState<ModelType>('BREAKEVEN');
  const [form, setForm] = useState<FormState>(() => buildDefaultForm(BREAKEVEN_PARAMS));
  const [variation, setVariation] = useState('20');
  const [result, setResult] = useState<SensitivityResponse | null>(null);
  const [errors, setErrors] = useState<Errors>({});
  const [apiError, setApiError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const params = getParams(model);

  const handleModelChange = (m: ModelType) => {
    setModel(m);
    setForm(buildDefaultForm(getParams(m)));
    setResult(null);
    setErrors({});
    setApiError(null);
  };

  const validate = (): Errors => {
    const errs: Errors = {};
    params.forEach(p => {
      const v = form[p.key]?.trim();
      if (!v) { errs[p.key] = 'Required.'; return; }
      if (isNaN(Number(v)) || Number(v) <= 0) errs[p.key] = 'Must be a positive number.';
    });
    const vPct = variation.trim();
    if (!vPct || isNaN(Number(vPct)) || Number(vPct) < 1 || Number(vPct) > 99) {
      errs['variation'] = 'Must be 1–99.';
    }
    return errs;
  };

  const analyse = async () => {
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setErrors({});
    setApiError(null);
    setLoading(true);

    const inputs = Object.fromEntries(params.map(p => [p.key, { base: Number(form[p.key]) }]));

    try {
      const res = await fetch(`${API_BASE}/api/sensitivity/calculate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          outputMetric: MODEL_OUTPUT_METRIC[model],
          variationPercent: Number(variation),
          inputs,
        }),
      });
      if (!res.ok) {
        const msg = await res.text();
        setApiError(`Server error: ${msg}`);
        return;
      }
      setResult(await res.json());
    } catch {
      setApiError('Could not reach backend. Is it running on port 8080?');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 'var(--font-bold)', color: 'var(--color-neutral-900)', marginBottom: 'var(--space-2)' }}>
        Sensitivity Analysis
      </h1>
      <p style={{ color: 'var(--color-neutral-600)', marginBottom: 'var(--space-6)' }}>
        Tornado chart — each input varied ±X% independently; others held at base.
      </p>

      <ModelPicker value={model} onChange={handleModelChange} />

      <div className="card" style={{ marginBottom: 'var(--space-6)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)', marginBottom: 'var(--space-4)' }}>
          {params.map(p => (
            <div key={p.key}>
              <label style={{ display: 'block', fontSize: 'var(--text-sm)', fontWeight: 'var(--font-medium)', color: 'var(--color-neutral-700)', marginBottom: 'var(--space-1)' }}>
                {p.label} <span style={{ color: 'var(--color-neutral-400)' }}>({p.unit})</span>
              </label>
              <input
                type="number"
                value={form[p.key] ?? ''}
                onChange={e => { setForm(f => ({ ...f, [p.key]: e.target.value })); setResult(null); }}
                className="input"
              />
              <FieldError message={errors[p.key]} />
            </div>
          ))}
        </div>

        <div style={{ marginBottom: 'var(--space-4)', maxWidth: 200 }}>
          <label style={{ display: 'block', fontSize: 'var(--text-sm)', fontWeight: 'var(--font-medium)', color: 'var(--color-neutral-700)', marginBottom: 'var(--space-1)' }}>
            Variation (%)
          </label>
          <input
            type="number"
            value={variation}
            onChange={e => { setVariation(e.target.value); setResult(null); }}
            className="input"
          />
          <FieldError message={errors['variation']} />
        </div>

        <button onClick={analyse} disabled={loading} className="btn btn-primary">
          {loading ? 'Analysing…' : 'Analyse'}
        </button>

        {apiError && (
          <p style={{ marginTop: 'var(--space-3)', color: 'var(--color-error-600)', fontSize: 'var(--text-sm)' }}>
            {apiError}
          </p>
        )}
      </div>

      {result && (
        <div className="card">
          <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--font-semibold)', marginBottom: 'var(--space-4)' }}>
            Tornado Chart
          </h2>
          <div style={{ overflowX: 'auto' }}>
            <TornadoChart result={result} baseline={result.baseline} />
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Create page.tsx**

```tsx
import SensitivityClient from '@/components/sensitivity/SensitivityClient';

export default function SensitivityPage() {
  return <SensitivityClient />;
}
```

File path: `frontend/src/app/sensitivity/page.tsx`

- [ ] **Step 3: Add the nav card in page.tsx**

In `frontend/src/app/page.tsx`, add to the `tools` array (after the Decision Tree entry):

```tsx
  {
    href: '/sensitivity',
    title: 'Sensitivity Analysis',
    description: 'Tornado chart showing which inputs drive output most — each varied independently.',
  },
```

- [ ] **Step 4: Type-check**

```bash
cd frontend && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/sensitivity/ \
        frontend/src/app/sensitivity/ \
        frontend/src/app/page.tsx
git commit -m "feat: add Sensitivity Analysis page with tornado chart"
```

---

## Task 8: Monte Carlo Simulation page

**Files:**
- Create: `frontend/src/components/montecarlo/MonteCarloClient.tsx`
- Create: `frontend/src/app/montecarlo/page.tsx`
- Modify: `frontend/src/app/page.tsx`

**Interfaces:**
- Consumes: `MonteCarloRequest`, `MonteCarloResponse`, `ModelPicker`, `FieldError`, `POST /api/montecarlo/simulate`
- Produces: `/montecarlo` page with distribution form, CDF chart, stats panel, and nav card

- [ ] **Step 1: Create MonteCarloClient.tsx**

```tsx
'use client';

import { useState } from 'react';
import { ModelPicker } from '@/components/shared/ModelPicker';
import { FieldError } from '@/components/shared/FieldError';
import {
  type ModelType,
  type DistributionType,
  type InputDistribution,
  type MonteCarloResponse,
  BREAKEVEN_PARAMS,
  EOQ_PARAMS,
  MODEL_OUTPUT_METRIC,
  type ParamMeta,
} from '@/lib/montecarlo';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost:8080';

interface ParamDist {
  distribution: DistributionType;
  mean: string;
  stdDev: string;
  min: string;
  max: string;
  mode: string;
}

type FormState = Record<string, ParamDist>;
type Errors = Record<string, string>;

function emptyDist(): ParamDist {
  return { distribution: 'UNIFORM', mean: '', stdDev: '', min: '', max: '', mode: '' };
}

function buildDefaultForm(params: ParamMeta[]): FormState {
  return Object.fromEntries(params.map(p => [p.key, emptyDist()]));
}

function getParams(model: ModelType): ParamMeta[] {
  return model === 'BREAKEVEN' ? BREAKEVEN_PARAMS : EOQ_PARAMS;
}

function CdfChart({ response }: { response: MonteCarloResponse }) {
  const W = 500, H = 250;
  const M = { top: 20, right: 20, bottom: 40, left: 50 };
  const PW = W - M.left - M.right;
  const PH = H - M.top - M.bottom;

  const xs = response.cdfPoints.map(p => p.x);
  const minX = Math.min(...xs), maxX = Math.max(...xs), rangeX = maxX - minX || 1;
  const toX = (v: number) => M.left + ((v - minX) / rangeX) * PW;
  const toY = (p: number) => M.top + (1 - p) * PH;

  const points = response.cdfPoints.map(p => `${toX(p.x)},${toY(p.cumulativeProbability)}`).join(' ');

  const percentiles = [
    { p: response.p10, label: 'P10', color: 'var(--color-neutral-400)' },
    { p: response.p50, label: 'P50', color: 'var(--color-primary-500)' },
    { p: response.p90, label: 'P90', color: 'var(--color-neutral-400)' },
  ];

  const yTicks = [0, 0.25, 0.5, 0.75, 1.0];
  const xTicks = 5;

  return (
    <svg width={W} height={H} style={{ display: 'block' }}>
      {/* grid */}
      {yTicks.map(t => (
        <g key={t}>
          <line x1={M.left} y1={toY(t)} x2={M.left + PW} y2={toY(t)}
                stroke="var(--color-neutral-200)" strokeWidth={1} />
          <text x={M.left - 6} y={toY(t) + 4} textAnchor="end" fontSize={10}
                fill="var(--color-neutral-500)">{t.toFixed(2)}</text>
        </g>
      ))}
      {Array.from({ length: xTicks }, (_, i) => {
        const v = minX + (i / (xTicks - 1)) * rangeX;
        return (
          <g key={i}>
            <text x={toX(v)} y={M.top + PH + 16} textAnchor="middle" fontSize={10}
                  fill="var(--color-neutral-500)">{v.toFixed(0)}</text>
          </g>
        );
      })}

      {/* percentile lines */}
      {percentiles.map(({ p, label, color }) => (
        <g key={label}>
          <line x1={toX(p)} y1={M.top} x2={toX(p)} y2={M.top + PH}
                stroke={color} strokeWidth={1} strokeDasharray="4 2" />
          <text x={toX(p)} y={M.top - 4} textAnchor="middle" fontSize={10} fill={color}>
            {label}
          </text>
        </g>
      ))}

      {/* CDF polyline */}
      <polyline points={points} fill="none"
                stroke="var(--color-primary-600)" strokeWidth={2} />

      {/* axes */}
      <line x1={M.left} y1={M.top} x2={M.left} y2={M.top + PH}
            stroke="var(--color-neutral-400)" strokeWidth={1} />
      <line x1={M.left} y1={M.top + PH} x2={M.left + PW} y2={M.top + PH}
            stroke="var(--color-neutral-400)" strokeWidth={1} />

      {/* axis labels */}
      <text x={M.left + PW / 2} y={H - 4} textAnchor="middle" fontSize={11}
            fill="var(--color-neutral-600)">Output value</text>
      <text x={12} y={M.top + PH / 2} textAnchor="middle" fontSize={11}
            fill="var(--color-neutral-600)"
            transform={`rotate(-90, 12, ${M.top + PH / 2})`}>Cumulative probability</text>
    </svg>
  );
}

function DistributionFields({ paramKey, dist, onChange, errors }: {
  paramKey: string;
  dist: ParamDist;
  onChange: (key: string, field: keyof ParamDist, value: string) => void;
  errors: Errors;
}) {
  const inputStyle = { width: 90 };
  const fieldClass = 'input';

  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
      <select
        value={dist.distribution}
        onChange={e => onChange(paramKey, 'distribution', e.target.value)}
        className="input"
        style={{ width: 130 }}
      >
        <option value="UNIFORM">Uniform</option>
        <option value="NORMAL">Normal</option>
        <option value="TRIANGULAR">Triangular</option>
      </select>

      {dist.distribution === 'NORMAL' && (
        <>
          <div>
            <input placeholder="Mean" value={dist.mean}
                   onChange={e => onChange(paramKey, 'mean', e.target.value)}
                   className={fieldClass} style={inputStyle} />
            <FieldError message={errors[`${paramKey}.mean`]} />
          </div>
          <div>
            <input placeholder="Std Dev" value={dist.stdDev}
                   onChange={e => onChange(paramKey, 'stdDev', e.target.value)}
                   className={fieldClass} style={inputStyle} />
            <FieldError message={errors[`${paramKey}.stdDev`]} />
          </div>
        </>
      )}

      {dist.distribution === 'UNIFORM' && (
        <>
          <div>
            <input placeholder="Min" value={dist.min}
                   onChange={e => onChange(paramKey, 'min', e.target.value)}
                   className={fieldClass} style={inputStyle} />
            <FieldError message={errors[`${paramKey}.min`]} />
          </div>
          <div>
            <input placeholder="Max" value={dist.max}
                   onChange={e => onChange(paramKey, 'max', e.target.value)}
                   className={fieldClass} style={inputStyle} />
            <FieldError message={errors[`${paramKey}.max`]} />
          </div>
        </>
      )}

      {dist.distribution === 'TRIANGULAR' && (
        <>
          <div>
            <input placeholder="Min" value={dist.min}
                   onChange={e => onChange(paramKey, 'min', e.target.value)}
                   className={fieldClass} style={inputStyle} />
            <FieldError message={errors[`${paramKey}.min`]} />
          </div>
          <div>
            <input placeholder="Mode" value={dist.mode}
                   onChange={e => onChange(paramKey, 'mode', e.target.value)}
                   className={fieldClass} style={inputStyle} />
            <FieldError message={errors[`${paramKey}.mode`]} />
          </div>
          <div>
            <input placeholder="Max" value={dist.max}
                   onChange={e => onChange(paramKey, 'max', e.target.value)}
                   className={fieldClass} style={inputStyle} />
            <FieldError message={errors[`${paramKey}.max`]} />
          </div>
        </>
      )}
    </div>
  );
}

function validateForm(params: ParamMeta[], form: FormState, iterations: string): Errors {
  const errs: Errors = {};
  const n = Number(iterations);
  if (!iterations || isNaN(n) || n < 1 || n > 100000) {
    errs['iterations'] = 'Must be 1–100,000.';
  }

  params.forEach(p => {
    const d = form[p.key];
    if (d.distribution === 'NORMAL') {
      if (!d.mean || isNaN(Number(d.mean))) errs[`${p.key}.mean`] = 'Required number.';
      if (!d.stdDev || isNaN(Number(d.stdDev)) || Number(d.stdDev) <= 0)
        errs[`${p.key}.stdDev`] = 'Required, must be > 0.';
    } else if (d.distribution === 'UNIFORM') {
      if (!d.min || isNaN(Number(d.min))) errs[`${p.key}.min`] = 'Required number.';
      if (!d.max || isNaN(Number(d.max))) errs[`${p.key}.max`] = 'Required number.';
      if (Number(d.min) >= Number(d.max)) errs[`${p.key}.min`] = 'Min must be < Max.';
    } else if (d.distribution === 'TRIANGULAR') {
      if (!d.min || isNaN(Number(d.min))) errs[`${p.key}.min`] = 'Required number.';
      if (!d.mode || isNaN(Number(d.mode))) errs[`${p.key}.mode`] = 'Required number.';
      if (!d.max || isNaN(Number(d.max))) errs[`${p.key}.max`] = 'Required number.';
      if (Number(d.mode) < Number(d.min) || Number(d.mode) > Number(d.max))
        errs[`${p.key}.mode`] = 'Mode must be between Min and Max.';
    }
  });

  return errs;
}

function buildInputDistribution(d: ParamDist): InputDistribution {
  const base: InputDistribution = { distribution: d.distribution };
  if (d.distribution === 'NORMAL') {
    base.mean = Number(d.mean);
    base.stdDev = Number(d.stdDev);
  } else if (d.distribution === 'UNIFORM') {
    base.min = Number(d.min);
    base.max = Number(d.max);
  } else {
    base.min = Number(d.min);
    base.mode = Number(d.mode);
    base.max = Number(d.max);
  }
  return base;
}

export default function MonteCarloClient() {
  const [model, setModel] = useState<ModelType>('BREAKEVEN');
  const [form, setForm] = useState<FormState>(() => buildDefaultForm(BREAKEVEN_PARAMS));
  const [iterations, setIterations] = useState('10000');
  const [result, setResult] = useState<MonteCarloResponse | null>(null);
  const [errors, setErrors] = useState<Errors>({});
  const [apiError, setApiError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const params = getParams(model);

  const handleModelChange = (m: ModelType) => {
    setModel(m);
    setForm(buildDefaultForm(getParams(m)));
    setResult(null);
    setErrors({});
    setApiError(null);
  };

  const updateDist = (key: string, field: keyof ParamDist, value: string) => {
    setForm(f => ({ ...f, [key]: { ...f[key], [field]: value } }));
    setResult(null);
  };

  const simulate = async () => {
    const errs = validateForm(params, form, iterations);
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setErrors({});
    setApiError(null);
    setLoading(true);

    const inputs = Object.fromEntries(
      params.map(p => [p.key, buildInputDistribution(form[p.key])])
    );

    try {
      const res = await fetch(`${API_BASE}/api/montecarlo/simulate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          outputMetric: MODEL_OUTPUT_METRIC[model],
          iterations: Number(iterations),
          inputs,
        }),
      });
      if (!res.ok) {
        const msg = await res.text();
        setApiError(`Server error: ${msg}`);
        return;
      }
      setResult(await res.json());
    } catch {
      setApiError('Could not reach backend. Is it running on port 8080?');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 'var(--font-bold)', color: 'var(--color-neutral-900)', marginBottom: 'var(--space-2)' }}>
        Monte Carlo Simulation
      </h1>
      <p style={{ color: 'var(--color-neutral-600)', marginBottom: 'var(--space-6)' }}>
        Assign probability distributions to each input and simulate thousands of outcomes.
      </p>

      <ModelPicker value={model} onChange={handleModelChange} />

      <div className="card" style={{ marginBottom: 'var(--space-6)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 'var(--space-4)' }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', fontSize: 'var(--text-sm)', color: 'var(--color-neutral-600)', paddingBottom: 'var(--space-2)', width: 200 }}>Parameter</th>
              <th style={{ textAlign: 'left', fontSize: 'var(--text-sm)', color: 'var(--color-neutral-600)', paddingBottom: 'var(--space-2)' }}>Distribution &amp; Parameters</th>
            </tr>
          </thead>
          <tbody>
            {params.map(p => (
              <tr key={p.key} style={{ borderTop: '1px solid var(--color-neutral-200)' }}>
                <td style={{ padding: 'var(--space-3) var(--space-2) var(--space-3) 0', verticalAlign: 'top' }}>
                  <span style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-medium)', color: 'var(--color-neutral-700)' }}>
                    {p.label}
                  </span>
                  <br />
                  <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-neutral-400)' }}>{p.unit}</span>
                </td>
                <td style={{ padding: 'var(--space-3) 0', verticalAlign: 'top' }}>
                  <DistributionFields
                    paramKey={p.key}
                    dist={form[p.key]}
                    onChange={updateDist}
                    errors={errors}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div style={{ marginBottom: 'var(--space-4)', maxWidth: 200 }}>
          <label style={{ display: 'block', fontSize: 'var(--text-sm)', fontWeight: 'var(--font-medium)', color: 'var(--color-neutral-700)', marginBottom: 'var(--space-1)' }}>
            Iterations
          </label>
          <input
            type="number"
            value={iterations}
            onChange={e => { setIterations(e.target.value); setResult(null); }}
            className="input"
          />
          <FieldError message={errors['iterations']} />
        </div>

        <button onClick={simulate} disabled={loading} className="btn btn-primary">
          {loading ? 'Simulating…' : 'Simulate'}
        </button>

        {apiError && (
          <p style={{ marginTop: 'var(--space-3)', color: 'var(--color-error-600)', fontSize: 'var(--text-sm)' }}>
            {apiError}
          </p>
        )}
      </div>

      {result && (
        <>
          <div className="card" style={{ marginBottom: 'var(--space-6)' }}>
            <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--font-semibold)', marginBottom: 'var(--space-4)' }}>
              Cumulative Distribution Function
            </h2>
            <div style={{ overflowX: 'auto' }}>
              <CdfChart response={result} />
            </div>
            <p style={{ marginTop: 'var(--space-2)', fontSize: 'var(--text-xs)', color: 'var(--color-neutral-400)' }}>
              Based on {result.validSamples.toLocaleString()} valid samples
            </p>
          </div>

          <div className="card">
            <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--font-semibold)', marginBottom: 'var(--space-4)' }}>
              Summary Statistics
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 'var(--space-4)' }}>
              {[
                { label: 'Mean',    value: result.mean },
                { label: 'Std Dev', value: result.stdDev },
                { label: 'P10',     value: result.p10 },
                { label: 'P50',     value: result.p50 },
                { label: 'P90',     value: result.p90 },
              ].map(({ label, value }) => (
                <div key={label} style={{ background: 'var(--color-neutral-50)', borderRadius: 'var(--radius-md)', padding: 'var(--space-3)' }}>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-neutral-500)', marginBottom: 'var(--space-1)' }}>{label}</div>
                  <div style={{ fontSize: 'var(--text-xl)', fontWeight: 'var(--font-semibold)', color: 'var(--color-neutral-900)' }}>
                    {value.toFixed(2)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Create page.tsx**

```tsx
import MonteCarloClient from '@/components/montecarlo/MonteCarloClient';

export default function MonteCarloPage() {
  return <MonteCarloClient />;
}
```

File path: `frontend/src/app/montecarlo/page.tsx`

- [ ] **Step 3: Add the nav card in page.tsx**

In `frontend/src/app/page.tsx`, add to the `tools` array (after the Sensitivity Analysis entry):

```tsx
  {
    href: '/montecarlo',
    title: 'Monte Carlo Simulation',
    description: 'Assign probability distributions to inputs and get a CDF of the output.',
  },
```

- [ ] **Step 4: Type-check**

```bash
cd frontend && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Run all backend tests**

```bash
mvn test -q
```

Expected: BUILD SUCCESS, all tests pass.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/components/montecarlo/ \
        frontend/src/app/montecarlo/ \
        frontend/src/app/page.tsx
git commit -m "feat: add Monte Carlo Simulation page with CDF chart and stats panel"
```

---

## Self-Review Notes

**Spec coverage:**
- ✅ Two standalone pages (`/sensitivity`, `/montecarlo`)
- ✅ Both support BREAKEVEN and EOQ via model picker
- ✅ Sensitivity uses tornado chart (horizontal bars sorted by impact)
- ✅ Monte Carlo uses CDF chart + P10/P50/P90 + mean/stdDev
- ✅ Normal, Uniform, Triangular distributions supported
- ✅ Backend-computed via `POST /api/sensitivity/calculate` and `POST /api/montecarlo/simulate`
- ✅ Reuses `BreakevenService` and `EoqService` — no duplicate calculation logic
- ✅ Jakarta Bean Validation on all DTOs
- ✅ No Flyway migrations
- ✅ `toFixed(2)` everywhere
- ✅ `FieldError` used for inline validation
- ✅ Nav updated with two new cards
- ✅ Backend service tests (TDD)

**Type consistency check:**
- `SensitivityService.calculate(SensitivityRequest)` → `SensitivityResponse` ✅ consistent across Tasks 2–3 and 7
- `MonteCarloService.simulate(MonteCarloRequest)` → `MonteCarloResponse` ✅ consistent across Tasks 4–5 and 8
- `ModelType` enum values `BREAKEVEN`/`EOQ` match across Java and TypeScript ✅
- `DistributionType` enum values `NORMAL`/`UNIFORM`/`TRIANGULAR` match across Java and TypeScript ✅
- `InputDistribution` fields (`mean`, `stdDev`, `min`, `max`, `mode`) match between Java record and TypeScript interface ✅
- `SensitivityBar` fields (`parameter`, `lowValue`, `highValue`, `lowInput`, `highInput`) match ✅
- `CdfPoint` fields (`x`, `cumulativeProbability`) match ✅
- `MonteCarloResponse` fields (`mean`, `stdDev`, `p10`, `p50`, `p90`, `validSamples`, `cdfPoints`) match ✅
