# Milestone 8 — Sensitivity Analysis & Monte Carlo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add two standalone tools — Sensitivity Analysis (tornado chart) and Monte Carlo Simulation (CDF chart) — each supporting EOQ and Break-even models with full session persistence.

**Architecture:** Two dedicated backend services (`SensitivityService`, `MonteCarloService`) inject and delegate to the existing `EoqService`/`BreakevenService`. Session persistence follows the Milestone 7 pattern (entity → repository → session service → controller). Two new Next.js pages render SVG charts from backend-computed results.

**Tech Stack:** Java 21, Spring Boot 3.3, Jakarta Bean Validation, JUnit 5 + AssertJ + Mockito, Next.js 14 App Router, TypeScript strict, Playwright E2E.

## Global Constraints

- Java 21 records for all DTOs; standard JPA classes (not records) for entities
- `@Transactional` on all service methods; `@Transactional(readOnly = true)` for reads
- Jakarta Bean Validation on all `@RequestBody` DTOs; `@Valid` in controller params
- All monetary/numeric frontend output: `toFixed(2)`
- `"use client"` only when event handlers or hooks are used
- Backend run: `mvn spring-boot:run` (port 8080); Frontend run: `cd frontend && npm run dev` (port 3000)
- Backend tests: `mvn test` from project root
- E2E tests: `cd frontend && npx playwright test`
- Shared enums already committed: `ModelType` (EOQ, BREAKEVEN), `DistributionType` (NORMAL, UNIFORM, TRIANGULAR), `InputDistribution` record, `OutputMetric`
- Valid input keys — EOQ: `{demand, orderingCost, unitCost, holdingRate}`; BREAKEVEN: `{fixedCosts, variableCostPerUnit, pricePerUnit}`

---

## File Map

**Create (backend):**
- `src/main/java/com/marketingquantitative/dto/ParameterSensitivity.java`
- `src/main/java/com/marketingquantitative/dto/SensitivityRequest.java`
- `src/main/java/com/marketingquantitative/dto/SensitivityResponse.java`
- `src/main/java/com/marketingquantitative/service/SensitivityService.java`
- `src/main/java/com/marketingquantitative/dto/MonteCarloRequest.java`
- `src/main/java/com/marketingquantitative/dto/MonteCarloResponse.java`
- `src/main/java/com/marketingquantitative/service/MonteCarloService.java`
- `src/main/java/com/marketingquantitative/controller/SensitivityController.java`
- `src/main/java/com/marketingquantitative/controller/MonteCarloController.java`
- `src/main/resources/db/migration/V202606191__sensitivity_montecarlo_sessions.sql`
- `src/main/java/com/marketingquantitative/entity/SensitivitySession.java`
- `src/main/java/com/marketingquantitative/entity/MonteCarloSession.java`
- `src/main/java/com/marketingquantitative/repository/SensitivitySessionRepository.java`
- `src/main/java/com/marketingquantitative/repository/MonteCarloSessionRepository.java`
- `src/main/java/com/marketingquantitative/dto/SensitivitySaveRequest.java`
- `src/main/java/com/marketingquantitative/dto/SensitivitySessionSummary.java`
- `src/main/java/com/marketingquantitative/dto/SensitivitySessionResponse.java`
- `src/main/java/com/marketingquantitative/service/SensitivitySessionService.java`
- `src/main/java/com/marketingquantitative/dto/MonteCarloSaveRequest.java`
- `src/main/java/com/marketingquantitative/dto/MonteCarloSessionSummary.java`
- `src/main/java/com/marketingquantitative/dto/MonteCarloSessionResponse.java`
- `src/main/java/com/marketingquantitative/service/MonteCarloSessionService.java`

**Create (tests):**
- `src/test/java/com/marketingquantitative/service/SensitivityServiceTest.java`
- `src/test/java/com/marketingquantitative/service/SensitivitySessionServiceTest.java`
- `src/test/java/com/marketingquantitative/controller/SensitivityControllerTest.java`
- `src/test/java/com/marketingquantitative/service/MonteCarloServiceTest.java`
- `src/test/java/com/marketingquantitative/service/MonteCarloSessionServiceTest.java`
- `src/test/java/com/marketingquantitative/controller/MonteCarloControllerTest.java`

**Create (frontend):**
- `frontend/src/app/sensitivity/page.tsx`
- `frontend/src/components/sensitivity/SensitivityClient.tsx`
- `frontend/src/app/montecarlo/page.tsx`
- `frontend/src/components/montecarlo/MonteCarloClient.tsx`
- `frontend/tests/e2e/sensitivity.spec.ts`
- `frontend/tests/e2e/montecarlo.spec.ts`

**Modify:**
- `frontend/src/components/Navigation.tsx` (add two nav entries)

---

## Task 1: Sensitivity Calculation Backend

**Files:**
- Create: `src/main/java/com/marketingquantitative/dto/ParameterSensitivity.java`
- Create: `src/main/java/com/marketingquantitative/dto/SensitivityRequest.java`
- Create: `src/main/java/com/marketingquantitative/dto/SensitivityResponse.java`
- Create: `src/main/java/com/marketingquantitative/service/SensitivityService.java`
- Create: `src/main/java/com/marketingquantitative/controller/SensitivityController.java`
- Create: `src/test/java/com/marketingquantitative/service/SensitivityServiceTest.java`
- Create: `src/test/java/com/marketingquantitative/controller/SensitivityControllerTest.java`

**Interfaces:**
- Consumes: `EoqService.calculate(EoqRequest)→EoqResponse`, `BreakevenService.calculate(BreakevenRequest)→BreakevenResponse`, `ModelType`, `EoqRequest`, `BreakevenRequest`
- Produces: `POST /api/sensitivity/calculate → SensitivityResponse`

- [ ] **Step 1: Write the failing service test**

```java
// src/test/java/com/marketingquantitative/service/SensitivityServiceTest.java
package com.marketingquantitative.service;

import com.marketingquantitative.dto.*;
import com.marketingquantitative.shared.ModelType;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.server.ResponseStatusException;

import java.util.Map;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class SensitivityServiceTest {

    @Mock EoqService eoqService;
    @Mock BreakevenService breakevenService;
    @InjectMocks SensitivityService service;

    // TC-08-S01: EOQ model, swing 20% — demand should have highest impact
    @Test
    void eoqModel_sortsByImpactDescending() {
        when(eoqService.calculate(any())).thenAnswer(inv -> {
            EoqRequest r = inv.getArgument(0);
            double eoq = Math.sqrt((2 * r.demand() * r.orderingCost()) / (r.holdingRate() * r.unitCost()));
            return new EoqResponse(eoq, 0, 0, 0);
        });

        var req = new SensitivityRequest(
            ModelType.EOQ,
            Map.of("demand", 1000.0, "orderingCost", 50.0, "unitCost", 10.0, "holdingRate", 0.2),
            20.0
        );
        SensitivityResponse resp = service.calculate(req);

        assertThat(resp.parameters()).hasSize(4);
        // each subsequent parameter has impact <= previous
        for (int i = 1; i < resp.parameters().size(); i++) {
            assertThat(resp.parameters().get(i).impact())
                .isLessThanOrEqualTo(resp.parameters().get(i - 1).impact());
        }
    }

    // TC-08-S02: swing = 0 → impact is 0 for all parameters
    @Test
    void zeroSwing_zeroImpactForAllParams() {
        when(eoqService.calculate(any())).thenReturn(new EoqResponse(100.0, 0, 0, 0));

        var req = new SensitivityRequest(
            ModelType.EOQ,
            Map.of("demand", 1000.0, "orderingCost", 50.0, "unitCost", 10.0, "holdingRate", 0.2),
            0.0001 // near zero but positive (positive constraint)
        );
        SensitivityResponse resp = service.calculate(req);

        resp.parameters().forEach(p -> assertThat(p.impact()).isLessThan(0.01));
    }

    // TC-08-S03: wrong keys for model → 400
    @Test
    void wrongKeys_throws400() {
        var req = new SensitivityRequest(
            ModelType.EOQ,
            Map.of("fixedCosts", 1000.0, "variableCostPerUnit", 5.0, "pricePerUnit", 10.0),
            20.0
        );
        assertThatThrownBy(() -> service.calculate(req))
            .isInstanceOf(ResponseStatusException.class);
    }

    // TC-08-S04: breakeven model returns breakEvenQty as output
    @Test
    void breakevenModel_usesBreakevenService() {
        when(breakevenService.calculate(any())).thenReturn(
            new BreakevenResponse(500.0, 5000.0, 10.0, 0.5)
        );

        var req = new SensitivityRequest(
            ModelType.BREAKEVEN,
            Map.of("fixedCosts", 5000.0, "variableCostPerUnit", 10.0, "pricePerUnit", 20.0),
            20.0
        );
        SensitivityResponse resp = service.calculate(req);

        assertThat(resp.baseOutput()).isEqualTo(500.0);
        verify(breakevenService, atLeastOnce()).calculate(any());
    }
}
```

- [ ] **Step 2: Run test — expect compile failure**

```bash
mvn test -pl . -Dtest=SensitivityServiceTest 2>&1 | head -30
```

Expected: compile error — `SensitivityService`, `SensitivityRequest`, `SensitivityResponse`, `ParameterSensitivity` not found.

- [ ] **Step 3: Create DTOs**

```java
// src/main/java/com/marketingquantitative/dto/ParameterSensitivity.java
package com.marketingquantitative.dto;

public record ParameterSensitivity(
    String paramKey,
    double lowValue,
    double highValue,
    Double lowOutput,   // null if computation failed (e.g. invalid swung value)
    Double highOutput,
    double impact
) {}
```

```java
// src/main/java/com/marketingquantitative/dto/SensitivityRequest.java
package com.marketingquantitative.dto;

import com.marketingquantitative.shared.ModelType;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import java.util.Map;

public record SensitivityRequest(
    @NotNull ModelType model,
    @NotEmpty Map<String, Double> baseInputs,
    @NotNull @Positive Double swingPercent
) {}
```

```java
// src/main/java/com/marketingquantitative/dto/SensitivityResponse.java
package com.marketingquantitative.dto;

import java.util.List;

public record SensitivityResponse(
    double baseOutput,
    List<ParameterSensitivity> parameters
) {}
```

- [ ] **Step 4: Create SensitivityService**

```java
// src/main/java/com/marketingquantitative/service/SensitivityService.java
package com.marketingquantitative.service;

import com.marketingquantitative.dto.*;
import com.marketingquantitative.shared.ModelType;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
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

    @Transactional(readOnly = true)
    public SensitivityResponse calculate(SensitivityRequest request) {
        Set<String> valid = VALID_KEYS.get(request.model());
        if (!valid.equals(request.baseInputs().keySet())) {
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
```

- [ ] **Step 5: Run service tests — expect PASS**

```bash
mvn test -Dtest=SensitivityServiceTest
```

Expected: `Tests run: 4, Failures: 0, Errors: 0`

- [ ] **Step 6: Write the failing controller test**

```java
// src/test/java/com/marketingquantitative/controller/SensitivityControllerTest.java
package com.marketingquantitative.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.marketingquantitative.service.SensitivityService;
import com.marketingquantitative.service.SensitivitySessionService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(SensitivityController.class)
class SensitivityControllerTest {

    @Autowired MockMvc mvc;
    @Autowired ObjectMapper mapper;
    @MockBean SensitivityService sensitivityService;
    @MockBean SensitivitySessionService sensitivitySessionService;

    @Test
    void calculate_missingModel_returns400() throws Exception {
        String body = """
            {"baseInputs":{"demand":1000},"swingPercent":20.0}
            """;
        mvc.perform(post("/api/sensitivity/calculate")
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
            .andExpect(status().isBadRequest());
    }

    @Test
    void calculate_negativeSwing_returns400() throws Exception {
        String body = """
            {"model":"EOQ","baseInputs":{"demand":1000,"orderingCost":50,"unitCost":10,"holdingRate":0.2},"swingPercent":-5.0}
            """;
        mvc.perform(post("/api/sensitivity/calculate")
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
            .andExpect(status().isBadRequest());
    }
}
```

- [ ] **Step 7: Create SensitivityController**

```java
// src/main/java/com/marketingquantitative/controller/SensitivityController.java
package com.marketingquantitative.controller;

import com.marketingquantitative.dto.*;
import com.marketingquantitative.service.SensitivityService;
import com.marketingquantitative.service.SensitivitySessionService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Tag(name = "Sensitivity", description = "Sensitivity Analysis — tornado chart")
@RestController
@RequestMapping("/api/sensitivity")
public class SensitivityController {

    private final SensitivityService service;
    private final SensitivitySessionService sessionService;

    SensitivityController(SensitivityService service, SensitivitySessionService sessionService) {
        this.service = service;
        this.sessionService = sessionService;
    }

    @Operation(summary = "Run sensitivity analysis (stateless)")
    @PostMapping("/calculate")
    public ResponseEntity<SensitivityResponse> calculate(@Valid @RequestBody SensitivityRequest request) {
        return ResponseEntity.ok(service.calculate(request));
    }

    @Operation(summary = "Calculate and save a sensitivity session")
    @PostMapping("/sessions")
    public ResponseEntity<SensitivitySessionResponse> saveSession(@Valid @RequestBody SensitivitySaveRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(sessionService.saveSession(request));
    }

    @Operation(summary = "List the 20 most recent sensitivity sessions")
    @GetMapping("/sessions")
    public ResponseEntity<List<SensitivitySessionSummary>> listSessions() {
        return ResponseEntity.ok(sessionService.listSessions());
    }

    @Operation(summary = "Get a sensitivity session by ID")
    @GetMapping("/sessions/{id}")
    public ResponseEntity<SensitivitySessionResponse> getSession(@PathVariable Long id) {
        return ResponseEntity.ok(sessionService.getSession(id));
    }
}
```

Note: `SensitivitySessionService`, `SensitivitySaveRequest`, `SensitivitySessionSummary`, `SensitivitySessionResponse` are stubs until Task 2. Create minimal stubs now to make the controller compile:

```java
// Temporary stub — will be fully implemented in Task 2
// src/main/java/com/marketingquantitative/service/SensitivitySessionService.java
package com.marketingquantitative.service;
import com.marketingquantitative.dto.*;
import org.springframework.stereotype.Service;
import java.util.List;
@Service
public class SensitivitySessionService {
    public SensitivitySessionResponse saveSession(SensitivitySaveRequest r) { throw new UnsupportedOperationException(); }
    public List<SensitivitySessionSummary> listSessions() { return List.of(); }
    public SensitivitySessionResponse getSession(Long id) { throw new UnsupportedOperationException(); }
}
```

```java
// src/main/java/com/marketingquantitative/dto/SensitivitySaveRequest.java
package com.marketingquantitative.dto;
import com.marketingquantitative.shared.ModelType;
import jakarta.validation.constraints.*;
import java.util.Map;
public record SensitivitySaveRequest(@NotBlank String name, @NotNull ModelType model,
    @NotEmpty Map<String, Double> baseInputs, @NotNull @Positive Double swingPercent) {}
```

```java
// src/main/java/com/marketingquantitative/dto/SensitivitySessionSummary.java
package com.marketingquantitative.dto;
import com.marketingquantitative.shared.ModelType;
import java.time.Instant;
public record SensitivitySessionSummary(Long id, String name, ModelType model, double swingPercent, Instant createdAt) {}
```

```java
// src/main/java/com/marketingquantitative/dto/SensitivitySessionResponse.java
package com.marketingquantitative.dto;
import com.marketingquantitative.shared.ModelType;
import java.time.Instant;
import java.util.Map;
public record SensitivitySessionResponse(Long id, String name, ModelType model,
    Map<String, Double> baseInputs, double swingPercent, SensitivityResponse results, Instant createdAt) {}
```

- [ ] **Step 8: Run all sensitivity tests — expect PASS**

```bash
mvn test -Dtest=SensitivityServiceTest,SensitivityControllerTest
```

Expected: `Tests run: 6, Failures: 0, Errors: 0`

- [ ] **Step 9: Commit**

```bash
git add src/main/java/com/marketingquantitative/dto/ParameterSensitivity.java \
        src/main/java/com/marketingquantitative/dto/SensitivityRequest.java \
        src/main/java/com/marketingquantitative/dto/SensitivityResponse.java \
        src/main/java/com/marketingquantitative/dto/SensitivitySaveRequest.java \
        src/main/java/com/marketingquantitative/dto/SensitivitySessionSummary.java \
        src/main/java/com/marketingquantitative/dto/SensitivitySessionResponse.java \
        src/main/java/com/marketingquantitative/service/SensitivityService.java \
        src/main/java/com/marketingquantitative/service/SensitivitySessionService.java \
        src/main/java/com/marketingquantitative/controller/SensitivityController.java \
        src/test/java/com/marketingquantitative/service/SensitivityServiceTest.java \
        src/test/java/com/marketingquantitative/controller/SensitivityControllerTest.java
git commit -m "feat: add SensitivityService + SensitivityController (calculate endpoint)"
```

---

## Task 2: Sensitivity Session Persistence

**Files:**
- Create: `src/main/resources/db/migration/V202606191__sensitivity_montecarlo_sessions.sql`
- Create: `src/main/java/com/marketingquantitative/entity/SensitivitySession.java`
- Create: `src/main/java/com/marketingquantitative/repository/SensitivitySessionRepository.java`
- Modify: `src/main/java/com/marketingquantitative/service/SensitivitySessionService.java` (replace stub)
- Create: `src/test/java/com/marketingquantitative/service/SensitivitySessionServiceTest.java`

**Interfaces:**
- Consumes: `SensitivityService.calculate(SensitivityRequest)→SensitivityResponse`
- Produces: `POST /api/sensitivity/sessions`, `GET /api/sensitivity/sessions`, `GET /api/sensitivity/sessions/{id}`

- [ ] **Step 1: Write the failing session service test**

```java
// src/test/java/com/marketingquantitative/service/SensitivitySessionServiceTest.java
package com.marketingquantitative.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.marketingquantitative.dto.*;
import com.marketingquantitative.entity.SensitivitySession;
import com.marketingquantitative.repository.SensitivitySessionRepository;
import com.marketingquantitative.shared.ModelType;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Spy;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class SensitivitySessionServiceTest {

    @Mock SensitivityService sensitivityService;
    @Mock SensitivitySessionRepository repository;
    @Spy  ObjectMapper objectMapper;
    @InjectMocks SensitivitySessionService service;

    // TC-08-SS01: save calculates and persists
    @Test
    void saveSession_calculatesAndPersists() {
        var params = List.of(new ParameterSensitivity("demand", 800.0, 1200.0, 200.0, 250.0, 50.0));
        when(sensitivityService.calculate(any())).thenReturn(new SensitivityResponse(223.61, params));
        when(repository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        var req = new SensitivitySaveRequest("Test", ModelType.EOQ,
            Map.of("demand", 1000.0, "orderingCost", 50.0, "unitCost", 10.0, "holdingRate", 0.2),
            20.0);
        SensitivitySessionResponse resp = service.saveSession(req);

        assertThat(resp.name()).isEqualTo("Test");
        assertThat(resp.model()).isEqualTo(ModelType.EOQ);
        assertThat(resp.results().baseOutput()).isEqualTo(223.61);
        verify(repository).save(any());
    }

    // TC-08-SS02: listSessions returns summaries
    @Test
    void listSessions_returnsSummaries() throws Exception {
        var s = new SensitivitySession("A", "EOQ",
            new ObjectMapper().writeValueAsString(Map.of("demand", 1000.0)),
            20.0, new ObjectMapper().writeValueAsString(new SensitivityResponse(100.0, List.of())));
        when(repository.findTop20ByOrderByCreatedAtDesc()).thenReturn(List.of(s));

        List<SensitivitySessionSummary> list = service.listSessions();
        assertThat(list).hasSize(1);
        assertThat(list.get(0).name()).isEqualTo("A");
    }

    // TC-08-SS03: getSession unknown id throws 404
    @Test
    void getSession_unknownId_throws404() {
        when(repository.findById(99L)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> service.getSession(99L))
            .isInstanceOf(ResponseStatusException.class)
            .hasMessageContaining("99");
    }
}
```

- [ ] **Step 2: Run test — expect compile failure** (entity + repo not yet created)

```bash
mvn test -Dtest=SensitivitySessionServiceTest 2>&1 | head -20
```

- [ ] **Step 3: Create Flyway migration (both tables in one file)**

```sql
-- src/main/resources/db/migration/V202606191__sensitivity_montecarlo_sessions.sql
create table sensitivity_session (
  id            bigserial    primary key,
  name          varchar(255) not null,
  model         varchar(50)  not null,
  base_inputs   text         not null,
  swing_percent numeric      not null check (swing_percent > 0),
  results       text         not null,
  created_at    timestamptz  not null default now()
);

create table montecarlo_session (
  id          bigserial    primary key,
  name        varchar(255) not null,
  model       varchar(50)  not null,
  inputs      text         not null,
  iterations  int          not null check (iterations >= 1),
  results     text         not null,
  created_at  timestamptz  not null default now()
);
```

- [ ] **Step 4: Create SensitivitySession entity**

```java
// src/main/java/com/marketingquantitative/entity/SensitivitySession.java
package com.marketingquantitative.entity;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "sensitivity_session")
public class SensitivitySession {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)                         private String name;
    @Column(nullable = false)                         private String model;
    @Column(nullable = false, columnDefinition = "text") private String baseInputsJson;
    @Column(nullable = false)                         private Double swingPercent;
    @Column(nullable = false, columnDefinition = "text") private String resultsJson;
    @Column(nullable = false, updatable = false)      private Instant createdAt;

    protected SensitivitySession() {}

    public SensitivitySession(String name, String model, String baseInputsJson,
                               double swingPercent, String resultsJson) {
        this.name = name; this.model = model;
        this.baseInputsJson = baseInputsJson;
        this.swingPercent = swingPercent;
        this.resultsJson = resultsJson;
    }

    @PrePersist void onPersist() { createdAt = Instant.now(); }

    public Long getId()            { return id; }
    public String getName()        { return name; }
    public String getModel()       { return model; }
    public String getBaseInputsJson() { return baseInputsJson; }
    public Double getSwingPercent(){ return swingPercent; }
    public String getResultsJson() { return resultsJson; }
    public Instant getCreatedAt()  { return createdAt; }
}
```

- [ ] **Step 5: Create SensitivitySessionRepository**

```java
// src/main/java/com/marketingquantitative/repository/SensitivitySessionRepository.java
package com.marketingquantitative.repository;

import com.marketingquantitative.entity.SensitivitySession;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface SensitivitySessionRepository extends JpaRepository<SensitivitySession, Long> {
    List<SensitivitySession> findTop20ByOrderByCreatedAtDesc();
}
```

- [ ] **Step 6: Replace SensitivitySessionService stub with full implementation**

```java
// src/main/java/com/marketingquantitative/service/SensitivitySessionService.java
package com.marketingquantitative.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.marketingquantitative.dto.*;
import com.marketingquantitative.entity.SensitivitySession;
import com.marketingquantitative.repository.SensitivitySessionRepository;
import com.marketingquantitative.shared.ModelType;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Map;

@Service
public class SensitivitySessionService {

    private final SensitivityService sensitivityService;
    private final SensitivitySessionRepository repository;
    private final ObjectMapper objectMapper;

    SensitivitySessionService(SensitivityService sensitivityService,
                               SensitivitySessionRepository repository,
                               ObjectMapper objectMapper) {
        this.sensitivityService = sensitivityService;
        this.repository = repository;
        this.objectMapper = objectMapper;
    }

    @Transactional
    public SensitivitySessionResponse saveSession(SensitivitySaveRequest request) {
        SensitivityResponse result = sensitivityService.calculate(
            new SensitivityRequest(request.model(), request.baseInputs(), request.swingPercent())
        );
        try {
            SensitivitySession session = new SensitivitySession(
                request.name(),
                request.model().name(),
                objectMapper.writeValueAsString(request.baseInputs()),
                request.swingPercent(),
                objectMapper.writeValueAsString(result)
            );
            return toResponse(repository.save(session));
        } catch (Exception e) {
            throw new RuntimeException("Failed to serialize session", e);
        }
    }

    @Transactional(readOnly = true)
    public List<SensitivitySessionSummary> listSessions() {
        return repository.findTop20ByOrderByCreatedAtDesc().stream()
            .map(s -> new SensitivitySessionSummary(
                s.getId(), s.getName(), ModelType.valueOf(s.getModel()),
                s.getSwingPercent(), s.getCreatedAt()))
            .toList();
    }

    @Transactional(readOnly = true)
    public SensitivitySessionResponse getSession(Long id) {
        return repository.findById(id)
            .map(this::toResponse)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "session not found: " + id));
    }

    private SensitivitySessionResponse toResponse(SensitivitySession s) {
        try {
            Map<String, Double> baseInputs = objectMapper.readValue(
                s.getBaseInputsJson(), new TypeReference<>() {});
            SensitivityResponse results = objectMapper.readValue(
                s.getResultsJson(), SensitivityResponse.class);
            return new SensitivitySessionResponse(
                s.getId(), s.getName(), ModelType.valueOf(s.getModel()),
                baseInputs, s.getSwingPercent(), results, s.getCreatedAt());
        } catch (Exception e) {
            throw new RuntimeException("Failed to deserialize session", e);
        }
    }
}
```

- [ ] **Step 7: Run session service tests — expect PASS**

```bash
mvn test -Dtest=SensitivitySessionServiceTest
```

Expected: `Tests run: 3, Failures: 0, Errors: 0`

- [ ] **Step 8: Run full test suite**

```bash
mvn test
```

Expected: all tests pass.

- [ ] **Step 9: Commit**

```bash
git add src/main/resources/db/migration/V202606191__sensitivity_montecarlo_sessions.sql \
        src/main/java/com/marketingquantitative/entity/SensitivitySession.java \
        src/main/java/com/marketingquantitative/repository/SensitivitySessionRepository.java \
        src/main/java/com/marketingquantitative/service/SensitivitySessionService.java \
        src/test/java/com/marketingquantitative/service/SensitivitySessionServiceTest.java
git commit -m "feat: add sensitivity session persistence (Flyway + entity + service)"
```

---

## Task 3: Monte Carlo Calculation Backend

**Files:**
- Create: `src/main/java/com/marketingquantitative/dto/MonteCarloRequest.java`
- Create: `src/main/java/com/marketingquantitative/dto/MonteCarloResponse.java`
- Create: `src/main/java/com/marketingquantitative/service/MonteCarloService.java`
- Create: `src/main/java/com/marketingquantitative/controller/MonteCarloController.java`
- Create: `src/test/java/com/marketingquantitative/service/MonteCarloServiceTest.java`
- Create: `src/test/java/com/marketingquantitative/controller/MonteCarloControllerTest.java`

**Interfaces:**
- Consumes: `EoqService`, `BreakevenService`, `InputDistribution`, `DistributionType`, `ModelType`
- Produces: `POST /api/montecarlo/simulate → MonteCarloResponse` (200 CDF points + stats)

- [ ] **Step 1: Write the failing service test**

```java
// src/test/java/com/marketingquantitative/service/MonteCarloServiceTest.java
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
```

- [ ] **Step 2: Run test — expect compile failure**

```bash
mvn test -Dtest=MonteCarloServiceTest 2>&1 | head -20
```

- [ ] **Step 3: Create DTOs**

```java
// src/main/java/com/marketingquantitative/dto/MonteCarloRequest.java
package com.marketingquantitative.dto;

import com.marketingquantitative.shared.InputDistribution;
import com.marketingquantitative.shared.ModelType;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.util.Map;

public record MonteCarloRequest(
    @NotNull ModelType model,
    @NotEmpty Map<String, @Valid InputDistribution> inputs,
    @Min(1) @Max(100000) int iterations
) {}
```

```java
// src/main/java/com/marketingquantitative/dto/MonteCarloResponse.java
package com.marketingquantitative.dto;

public record MonteCarloResponse(
    double[] cdfValues,
    double mean,
    double stdDev,
    double p5,
    double p25,
    double p50,
    double p75,
    double p95
) {}
```

- [ ] **Step 4: Create MonteCarloService**

```java
// src/main/java/com/marketingquantitative/service/MonteCarloService.java
package com.marketingquantitative.service;

import com.marketingquantitative.dto.*;
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

    @Transactional(readOnly = true)
    public MonteCarloResponse simulate(MonteCarloRequest request) {
        Set<String> valid = VALID_KEYS.get(request.model());
        if (!valid.equals(request.inputs().keySet())) {
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
```

- [ ] **Step 5: Run service tests — expect PASS**

```bash
mvn test -Dtest=MonteCarloServiceTest
```

Expected: `Tests run: 4, Failures: 0, Errors: 0`

- [ ] **Step 6: Write controller test**

```java
// src/test/java/com/marketingquantitative/controller/MonteCarloControllerTest.java
package com.marketingquantitative.controller;

import com.marketingquantitative.service.MonteCarloService;
import com.marketingquantitative.service.MonteCarloSessionService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(MonteCarloController.class)
class MonteCarloControllerTest {

    @Autowired MockMvc mvc;
    @MockBean MonteCarloService monteCarloService;
    @MockBean MonteCarloSessionService monteCarloSessionService;

    @Test
    void simulate_missingModel_returns400() throws Exception {
        mvc.perform(post("/api/montecarlo/simulate")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"inputs":{},"iterations":100}
                    """))
            .andExpect(status().isBadRequest());
    }

    @Test
    void simulate_iterationsExceedsMax_returns400() throws Exception {
        mvc.perform(post("/api/montecarlo/simulate")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"model":"EOQ","inputs":{},"iterations":200000}
                    """))
            .andExpect(status().isBadRequest());
    }
}
```

- [ ] **Step 7: Create MonteCarloController with stubs for session DTOs**

```java
// src/main/java/com/marketingquantitative/controller/MonteCarloController.java
package com.marketingquantitative.controller;

import com.marketingquantitative.dto.*;
import com.marketingquantitative.service.MonteCarloService;
import com.marketingquantitative.service.MonteCarloSessionService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Tag(name = "Monte Carlo", description = "Monte Carlo Simulation — CDF")
@RestController
@RequestMapping("/api/montecarlo")
public class MonteCarloController {

    private final MonteCarloService service;
    private final MonteCarloSessionService sessionService;

    MonteCarloController(MonteCarloService service, MonteCarloSessionService sessionService) {
        this.service = service;
        this.sessionService = sessionService;
    }

    @Operation(summary = "Run Monte Carlo simulation (stateless)")
    @PostMapping("/simulate")
    public ResponseEntity<MonteCarloResponse> simulate(@Valid @RequestBody MonteCarloRequest request) {
        return ResponseEntity.ok(service.simulate(request));
    }

    @Operation(summary = "Simulate and save a Monte Carlo session")
    @PostMapping("/sessions")
    public ResponseEntity<MonteCarloSessionResponse> saveSession(@Valid @RequestBody MonteCarloSaveRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(sessionService.saveSession(request));
    }

    @Operation(summary = "List the 20 most recent Monte Carlo sessions")
    @GetMapping("/sessions")
    public ResponseEntity<List<MonteCarloSessionSummary>> listSessions() {
        return ResponseEntity.ok(sessionService.listSessions());
    }

    @Operation(summary = "Get a Monte Carlo session by ID")
    @GetMapping("/sessions/{id}")
    public ResponseEntity<MonteCarloSessionResponse> getSession(@PathVariable Long id) {
        return ResponseEntity.ok(sessionService.getSession(id));
    }
}
```

Create stubs (will be replaced in Task 4):

```java
// src/main/java/com/marketingquantitative/service/MonteCarloSessionService.java
package com.marketingquantitative.service;
import com.marketingquantitative.dto.*;
import org.springframework.stereotype.Service;
import java.util.List;
@Service
public class MonteCarloSessionService {
    public MonteCarloSessionResponse saveSession(MonteCarloSaveRequest r) { throw new UnsupportedOperationException(); }
    public List<MonteCarloSessionSummary> listSessions() { return List.of(); }
    public MonteCarloSessionResponse getSession(Long id) { throw new UnsupportedOperationException(); }
}
```

```java
// src/main/java/com/marketingquantitative/dto/MonteCarloSaveRequest.java
package com.marketingquantitative.dto;
import com.marketingquantitative.shared.InputDistribution;
import com.marketingquantitative.shared.ModelType;
import jakarta.validation.constraints.*;
import java.util.Map;
public record MonteCarloSaveRequest(@NotBlank String name, @NotNull ModelType model,
    @NotEmpty Map<String, InputDistribution> inputs, @Min(1) @Max(100000) int iterations) {}
```

```java
// src/main/java/com/marketingquantitative/dto/MonteCarloSessionSummary.java
package com.marketingquantitative.dto;
import com.marketingquantitative.shared.ModelType;
import java.time.Instant;
public record MonteCarloSessionSummary(Long id, String name, ModelType model, int iterations, Instant createdAt) {}
```

```java
// src/main/java/com/marketingquantitative/dto/MonteCarloSessionResponse.java
package com.marketingquantitative.dto;
import com.marketingquantitative.shared.InputDistribution;
import com.marketingquantitative.shared.ModelType;
import java.time.Instant;
import java.util.Map;
public record MonteCarloSessionResponse(Long id, String name, ModelType model,
    Map<String, InputDistribution> inputs, int iterations, MonteCarloResponse results, Instant createdAt) {}
```

- [ ] **Step 8: Run all tests**

```bash
mvn test -Dtest=MonteCarloServiceTest,MonteCarloControllerTest
```

Expected: `Tests run: 6, Failures: 0, Errors: 0`

- [ ] **Step 9: Commit**

```bash
git add src/main/java/com/marketingquantitative/dto/MonteCarloRequest.java \
        src/main/java/com/marketingquantitative/dto/MonteCarloResponse.java \
        src/main/java/com/marketingquantitative/dto/MonteCarloSaveRequest.java \
        src/main/java/com/marketingquantitative/dto/MonteCarloSessionSummary.java \
        src/main/java/com/marketingquantitative/dto/MonteCarloSessionResponse.java \
        src/main/java/com/marketingquantitative/service/MonteCarloService.java \
        src/main/java/com/marketingquantitative/service/MonteCarloSessionService.java \
        src/main/java/com/marketingquantitative/controller/MonteCarloController.java \
        src/test/java/com/marketingquantitative/service/MonteCarloServiceTest.java \
        src/test/java/com/marketingquantitative/controller/MonteCarloControllerTest.java
git commit -m "feat: add MonteCarloService + MonteCarloController (simulate endpoint)"
```

---

## Task 4: Monte Carlo Session Persistence

**Files:**
- Create: `src/main/java/com/marketingquantitative/entity/MonteCarloSession.java`
- Create: `src/main/java/com/marketingquantitative/repository/MonteCarloSessionRepository.java`
- Modify: `src/main/java/com/marketingquantitative/service/MonteCarloSessionService.java`
- Create: `src/test/java/com/marketingquantitative/service/MonteCarloSessionServiceTest.java`

**Interfaces:**
- Consumes: `MonteCarloService.simulate(MonteCarloRequest)→MonteCarloResponse`
- Produces: `POST /api/montecarlo/sessions`, `GET /api/montecarlo/sessions`, `GET /api/montecarlo/sessions/{id}`

- [ ] **Step 1: Write the failing session service test**

```java
// src/test/java/com/marketingquantitative/service/MonteCarloSessionServiceTest.java
package com.marketingquantitative.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.marketingquantitative.dto.*;
import com.marketingquantitative.entity.MonteCarloSession;
import com.marketingquantitative.repository.MonteCarloSessionRepository;
import com.marketingquantitative.shared.DistributionType;
import com.marketingquantitative.shared.InputDistribution;
import com.marketingquantitative.shared.ModelType;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Spy;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class MonteCarloSessionServiceTest {

    @Mock MonteCarloService monteCarloService;
    @Mock MonteCarloSessionRepository repository;
    @Spy  ObjectMapper objectMapper;
    @InjectMocks MonteCarloSessionService service;

    // TC-08-MC-S01: save calculates and persists
    @Test
    void saveSession_calculatesAndPersists() {
        when(monteCarloService.simulate(any())).thenReturn(
            new MonteCarloResponse(new double[]{100.0, 200.0}, 150.0, 50.0, 110.0, 130.0, 150.0, 170.0, 190.0)
        );
        when(repository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        var dist = new InputDistribution(DistributionType.UNIFORM, null, null, 800.0, 1200.0, null);
        var req = new MonteCarloSaveRequest("Test", ModelType.EOQ,
            Map.of("demand", dist, "orderingCost", dist, "unitCost", dist, "holdingRate", dist), 1000);
        MonteCarloSessionResponse resp = service.saveSession(req);

        assertThat(resp.name()).isEqualTo("Test");
        assertThat(resp.results().mean()).isEqualTo(150.0);
        verify(repository).save(any());
    }

    // TC-08-MC-S02: listSessions returns summaries
    @Test
    void listSessions_returnsSummaries() throws Exception {
        var om = new ObjectMapper();
        var s = new MonteCarloSession("A", "EOQ",
            om.writeValueAsString(Map.of()),
            500,
            om.writeValueAsString(new MonteCarloResponse(new double[0], 0, 0, 0, 0, 0, 0, 0)));
        when(repository.findTop20ByOrderByCreatedAtDesc()).thenReturn(List.of(s));

        assertThat(service.listSessions()).hasSize(1);
    }

    // TC-08-MC-S03: getSession unknown id throws 404
    @Test
    void getSession_unknownId_throws404() {
        when(repository.findById(99L)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> service.getSession(99L))
            .isInstanceOf(ResponseStatusException.class);
    }
}
```

- [ ] **Step 2: Create MonteCarloSession entity**

```java
// src/main/java/com/marketingquantitative/entity/MonteCarloSession.java
package com.marketingquantitative.entity;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "montecarlo_session")
public class MonteCarloSession {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)                            private String name;
    @Column(nullable = false)                            private String model;
    @Column(nullable = false, columnDefinition = "text") private String inputsJson;
    @Column(nullable = false)                            private Integer iterations;
    @Column(nullable = false, columnDefinition = "text") private String resultsJson;
    @Column(nullable = false, updatable = false)         private Instant createdAt;

    protected MonteCarloSession() {}

    public MonteCarloSession(String name, String model, String inputsJson,
                              int iterations, String resultsJson) {
        this.name = name; this.model = model;
        this.inputsJson = inputsJson;
        this.iterations = iterations;
        this.resultsJson = resultsJson;
    }

    @PrePersist void onPersist() { createdAt = Instant.now(); }

    public Long getId()          { return id; }
    public String getName()      { return name; }
    public String getModel()     { return model; }
    public String getInputsJson(){ return inputsJson; }
    public Integer getIterations(){ return iterations; }
    public String getResultsJson(){ return resultsJson; }
    public Instant getCreatedAt(){ return createdAt; }
}
```

- [ ] **Step 3: Create MonteCarloSessionRepository**

```java
// src/main/java/com/marketingquantitative/repository/MonteCarloSessionRepository.java
package com.marketingquantitative.repository;

import com.marketingquantitative.entity.MonteCarloSession;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface MonteCarloSessionRepository extends JpaRepository<MonteCarloSession, Long> {
    List<MonteCarloSession> findTop20ByOrderByCreatedAtDesc();
}
```

- [ ] **Step 4: Replace MonteCarloSessionService stub with full implementation**

```java
// src/main/java/com/marketingquantitative/service/MonteCarloSessionService.java
package com.marketingquantitative.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.marketingquantitative.dto.*;
import com.marketingquantitative.entity.MonteCarloSession;
import com.marketingquantitative.repository.MonteCarloSessionRepository;
import com.marketingquantitative.shared.InputDistribution;
import com.marketingquantitative.shared.ModelType;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Map;

@Service
public class MonteCarloSessionService {

    private final MonteCarloService monteCarloService;
    private final MonteCarloSessionRepository repository;
    private final ObjectMapper objectMapper;

    MonteCarloSessionService(MonteCarloService monteCarloService,
                              MonteCarloSessionRepository repository,
                              ObjectMapper objectMapper) {
        this.monteCarloService = monteCarloService;
        this.repository = repository;
        this.objectMapper = objectMapper;
    }

    @Transactional
    public MonteCarloSessionResponse saveSession(MonteCarloSaveRequest request) {
        MonteCarloResponse result = monteCarloService.simulate(
            new MonteCarloRequest(request.model(), request.inputs(), request.iterations())
        );
        try {
            MonteCarloSession session = new MonteCarloSession(
                request.name(),
                request.model().name(),
                objectMapper.writeValueAsString(request.inputs()),
                request.iterations(),
                objectMapper.writeValueAsString(result)
            );
            return toResponse(repository.save(session));
        } catch (Exception e) {
            throw new RuntimeException("Failed to serialize session", e);
        }
    }

    @Transactional(readOnly = true)
    public List<MonteCarloSessionSummary> listSessions() {
        return repository.findTop20ByOrderByCreatedAtDesc().stream()
            .map(s -> new MonteCarloSessionSummary(
                s.getId(), s.getName(), ModelType.valueOf(s.getModel()),
                s.getIterations(), s.getCreatedAt()))
            .toList();
    }

    @Transactional(readOnly = true)
    public MonteCarloSessionResponse getSession(Long id) {
        return repository.findById(id)
            .map(this::toResponse)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "session not found: " + id));
    }

    private MonteCarloSessionResponse toResponse(MonteCarloSession s) {
        try {
            Map<String, InputDistribution> inputs = objectMapper.readValue(
                s.getInputsJson(), new TypeReference<>() {});
            MonteCarloResponse results = objectMapper.readValue(
                s.getResultsJson(), MonteCarloResponse.class);
            return new MonteCarloSessionResponse(
                s.getId(), s.getName(), ModelType.valueOf(s.getModel()),
                inputs, s.getIterations(), results, s.getCreatedAt());
        } catch (Exception e) {
            throw new RuntimeException("Failed to deserialize session", e);
        }
    }
}
```

- [ ] **Step 5: Run session service tests**

```bash
mvn test -Dtest=MonteCarloSessionServiceTest
```

Expected: `Tests run: 3, Failures: 0, Errors: 0`

- [ ] **Step 6: Run full test suite**

```bash
mvn test
```

Expected: all tests pass.

- [ ] **Step 7: Commit**

```bash
git add src/main/java/com/marketingquantitative/entity/MonteCarloSession.java \
        src/main/java/com/marketingquantitative/repository/MonteCarloSessionRepository.java \
        src/main/java/com/marketingquantitative/service/MonteCarloSessionService.java \
        src/test/java/com/marketingquantitative/service/MonteCarloSessionServiceTest.java
git commit -m "feat: add Monte Carlo session persistence (entity + service)"
```

---

## Task 5: /sensitivity Frontend Page

**Files:**
- Create: `frontend/src/app/sensitivity/page.tsx`
- Create: `frontend/src/components/sensitivity/SensitivityClient.tsx`
- Modify: `frontend/src/components/Navigation.tsx`

**Interfaces:**
- Consumes: `POST /api/sensitivity/calculate`, `POST /api/sensitivity/sessions`, `GET /api/sensitivity/sessions`, `GET /api/sensitivity/sessions/{id}`
- Produces: `/sensitivity` page with tornado chart and session history

- [ ] **Step 1: Create the page wrapper**

```tsx
// frontend/src/app/sensitivity/page.tsx
import SensitivityClient from '@/components/sensitivity/SensitivityClient';

export default function SensitivityPage() {
  return <SensitivityClient />;
}
```

- [ ] **Step 2: Create SensitivityClient**

```tsx
// frontend/src/components/sensitivity/SensitivityClient.tsx
'use client';

import { useState } from 'react';
import { SessionHistory, type SessionRow } from '@/components/shared/SessionHistory';

type ModelType = 'EOQ' | 'BREAKEVEN';

const EOQ_FIELDS = ['demand', 'orderingCost', 'unitCost', 'holdingRate'] as const;
const BE_FIELDS  = ['fixedCosts', 'variableCostPerUnit', 'pricePerUnit'] as const;

const FIELD_LABELS: Record<string, string> = {
  demand: 'Annual Demand (D)',
  orderingCost: 'Ordering Cost (S)',
  unitCost: 'Unit Cost (C)',
  holdingRate: 'Holding Rate (I)',
  fixedCosts: 'Fixed Costs (CF)',
  variableCostPerUnit: 'Variable Cost/Unit (CVu)',
  pricePerUnit: 'Price/Unit (P)',
};

interface ParameterSensitivity {
  paramKey: string;
  lowValue: number;
  highValue: number;
  lowOutput: number | null;
  highOutput: number | null;
  impact: number;
}

interface SensitivityResult {
  baseOutput: number;
  parameters: ParameterSensitivity[];
}

export default function SensitivityClient() {
  const [model, setModel] = useState<ModelType>('EOQ');
  const [inputs, setInputs] = useState<Record<string, string>>({});
  const [swing, setSwing] = useState('20');
  const [result, setResult] = useState<SensitivityResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sessionName, setSessionName] = useState('');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [historyKey, setHistoryKey] = useState(0);

  const fields = model === 'EOQ' ? EOQ_FIELDS : BE_FIELDS;

  const updateInput = (key: string, value: string) => {
    setInputs(prev => ({ ...prev, [key]: value }));
    setResult(null);
    setError(null);
  };

  const buildBaseInputs = (): Record<string, number> | null => {
    const out: Record<string, number> = {};
    for (const f of fields) {
      const v = Number(inputs[f]);
      if (!inputs[f] || isNaN(v) || v <= 0) return null;
      out[f] = v;
    }
    return out;
  };

  const calculate = async () => {
    setError(null);
    const baseInputs = buildBaseInputs();
    const swingNum = Number(swing);
    if (!baseInputs) { setError('All inputs must be positive numbers.'); return; }
    if (!swing || isNaN(swingNum) || swingNum <= 0) { setError('Swing % must be a positive number.'); return; }

    setLoading(true);
    try {
      const res = await fetch('/api/sensitivity/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, baseInputs, swingPercent: swingNum }),
      });
      if (!res.ok) {
        const msg = await res.text();
        setError(`Calculation failed: ${msg}`);
        return;
      }
      setResult(await res.json());
    } catch {
      setError('Could not reach the backend. Is the server running?');
    } finally {
      setLoading(false);
    }
  };

  const clear = () => { setInputs({}); setResult(null); setError(null); setSaveStatus('idle'); };

  const saveSession = async () => {
    if (!result) return;
    const baseInputs = buildBaseInputs();
    if (!baseInputs) return;
    const name = sessionName.trim() || new Date().toLocaleString();
    setSaveStatus('saving');
    try {
      const res = await fetch('/api/sensitivity/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, model, baseInputs, swingPercent: Number(swing) }),
      });
      if (!res.ok) throw new Error();
      setSaveStatus('saved');
      setHistoryKey(k => k + 1);
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch {
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    }
  };

  const loadSession = async (row: SessionRow) => {
    try {
      const res = await fetch(`/api/sensitivity/sessions/${row.id}`);
      if (!res.ok) return;
      const full = await res.json();
      setModel(full.model as ModelType);
      const strInputs: Record<string, string> = {};
      for (const [k, v] of Object.entries(full.baseInputs as Record<string, number>)) {
        strInputs[k] = String(v);
      }
      setInputs(strInputs);
      setSwing(String(full.swingPercent));
      setResult(full.results);
      setError(null);
    } catch { /* silent */ }
  };

  const HISTORY_COLUMNS = [
    { key: 'model', label: 'Model' },
    { key: 'swingPercent', label: 'Swing %' },
  ];

  return (
    <div>
      <div style={{ marginBottom: 'var(--space-6)' }}>
        <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 'var(--font-bold)', marginBottom: 'var(--space-2)' }}>
          Sensitivity Analysis
        </h1>
        <p style={{ color: 'var(--color-neutral-600)', fontSize: 'var(--text-sm)' }}>
          Vary each input ±swing% to see which parameter has the greatest impact on the output.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-6)', alignItems: 'start' }}>

        {/* Inputs card */}
        <div className="card">
          <h2 style={{ fontSize: 'var(--text-base)', fontWeight: 'var(--font-semibold)', marginBottom: 'var(--space-4)' }}>
            Inputs
          </h2>

          {/* Model selector */}
          <div style={{ marginBottom: 'var(--space-4)' }}>
            <label style={{ display: 'block', fontSize: 'var(--text-sm)', fontWeight: 'var(--font-medium)', marginBottom: 'var(--space-1)' }}>
              Model
            </label>
            <select
              value={model}
              onChange={e => { setModel(e.target.value as ModelType); setInputs({}); setResult(null); }}
              style={{ width: '100%' }}
            >
              <option value="EOQ">Economic Order Quantity (EOQ)</option>
              <option value="BREAKEVEN">Break-even Analysis</option>
            </select>
          </div>

          {/* Parameter inputs */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            {fields.map(field => (
              <div key={field}>
                <label style={{ display: 'block', fontSize: 'var(--text-sm)', fontWeight: 'var(--font-medium)', marginBottom: 'var(--space-1)' }}>
                  {FIELD_LABELS[field]}
                </label>
                <input
                  type="number"
                  value={inputs[field] ?? ''}
                  onChange={e => updateInput(field, e.target.value)}
                  min="0" step="any" placeholder="0"
                />
              </div>
            ))}

            {/* Swing % */}
            <div>
              <label style={{ display: 'block', fontSize: 'var(--text-sm)', fontWeight: 'var(--font-medium)', marginBottom: 'var(--space-1)' }}>
                Swing Percentage (±%)
              </label>
              <input
                type="number"
                value={swing}
                onChange={e => { setSwing(e.target.value); setResult(null); }}
                min="0.01" step="1" placeholder="20"
              />
            </div>
          </div>

          {error && <p className="field-error" style={{ marginTop: 'var(--space-3)' }}>{error}</p>}

          <div style={{ display: 'flex', gap: 'var(--space-3)', marginTop: 'var(--space-4)' }}>
            <button onClick={calculate} className="btn btn-primary" disabled={loading}>
              {loading ? 'Calculating…' : 'Calculate'}
            </button>
            <button onClick={clear} className="btn btn-secondary">Clear</button>
          </div>
        </div>

        {/* Results card */}
        <div className="card" style={{ opacity: result ? 1 : 0.4, transition: 'opacity var(--transition-base)' }}>
          <h2 style={{ fontSize: 'var(--text-base)', fontWeight: 'var(--font-semibold)', marginBottom: 'var(--space-4)' }}>
            Results
          </h2>
          {result ? (
            <>
              <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-neutral-600)', marginBottom: 'var(--space-3)' }}>
                Base output: <strong>{result.baseOutput.toFixed(2)}</strong>
              </p>
              <table className="result-table" style={{ marginBottom: 'var(--space-4)' }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left' }}>Parameter</th>
                    <th>Low output</th>
                    <th>High output</th>
                    <th>Impact</th>
                  </tr>
                </thead>
                <tbody>
                  {result.parameters.map(p => (
                    <tr key={p.paramKey}>
                      <td style={{ textAlign: 'left' }}>{p.paramKey}</td>
                      <td>{p.lowOutput != null ? p.lowOutput.toFixed(2) : 'N/A'}</td>
                      <td>{p.highOutput != null ? p.highOutput.toFixed(2) : 'N/A'}</td>
                      <td style={{ fontWeight: 'var(--font-semibold)' }}>{p.impact.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          ) : (
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-neutral-400)' }}>
              Fill in all inputs and click Calculate.
            </p>
          )}
        </div>
      </div>

      {/* Tornado chart */}
      {result && result.parameters.length > 0 && (
        <div className="card" style={{ marginTop: 'var(--space-6)' }}>
          <h2 style={{ fontSize: 'var(--text-base)', fontWeight: 'var(--font-semibold)', marginBottom: 'var(--space-4)' }}>
            Tornado Chart
          </h2>
          <TornadoChart baseOutput={result.baseOutput} parameters={result.parameters} />
        </div>
      )}

      {/* Save session */}
      {result && (
        <div className="card" style={{ marginTop: 'var(--space-6)' }}>
          <h2 style={{ fontSize: 'var(--text-base)', fontWeight: 'var(--font-semibold)', marginBottom: 'var(--space-3)' }}>
            Save Session
          </h2>
          <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'center' }}>
            <input
              type="text"
              value={sessionName}
              onChange={e => setSessionName(e.target.value)}
              placeholder="Session name (optional)"
              style={{ flex: 1 }}
            />
            <button onClick={saveSession} className="btn btn-primary"
              disabled={saveStatus === 'saving'} style={{ whiteSpace: 'nowrap' }}>
              {saveStatus === 'saving' ? 'Saving…' : saveStatus === 'saved' ? 'Saved ✓' : 'Save'}
            </button>
          </div>
          {saveStatus === 'error' && (
            <p className="field-error" style={{ marginTop: 'var(--space-2)' }}>
              Could not reach the backend.
            </p>
          )}
        </div>
      )}

      <SessionHistory
        apiPath="/api/sensitivity/sessions"
        refreshKey={historyKey}
        columns={HISTORY_COLUMNS}
        onLoad={loadSession}
      />
    </div>
  );
}

function TornadoChart({ baseOutput, parameters }: {
  baseOutput: number;
  parameters: ParameterSensitivity[];
}) {
  const SVG_W = 520, ROW_H = 44, LABEL_W = 140, PAD = 16;
  const chartW = SVG_W - LABEL_W - PAD;
  const H = parameters.length * ROW_H + 60;

  const validParams = parameters.filter(p => p.lowOutput != null && p.highOutput != null);
  if (validParams.length === 0) return null;

  const allOut = validParams.flatMap(p => [p.lowOutput!, p.highOutput!, baseOutput]);
  const minOut = Math.min(...allOut);
  const maxOut = Math.max(...allOut);
  const span = maxOut - minOut || 1;
  const toX = (v: number) => LABEL_W + ((v - minOut) / span) * chartW;
  const baseX = toX(baseOutput);

  return (
    <svg viewBox={`0 0 ${SVG_W} ${H}`} style={{ width: '100%', maxWidth: SVG_W, overflow: 'visible' }}>
      {/* Base line */}
      <line x1={baseX} y1={24} x2={baseX} y2={H - 24}
        stroke="#94a3b8" strokeDasharray="4,2" strokeWidth={1.5} />
      <text x={baseX} y={H - 6} textAnchor="middle" fontSize="10" fill="#94a3b8">
        base: {baseOutput.toFixed(2)}
      </text>

      {parameters.map((p, i) => {
        if (p.lowOutput == null || p.highOutput == null) return null;
        const y = 28 + i * ROW_H;
        const x1 = Math.min(toX(p.lowOutput), toX(p.highOutput));
        const x2 = Math.max(toX(p.lowOutput), toX(p.highOutput));
        const barW = Math.max(x2 - x1, 2);
        return (
          <g key={p.paramKey}>
            <text x={LABEL_W - 6} y={y + ROW_H / 2 + 4} textAnchor="end"
              fontSize="11" fill="#374151">{p.paramKey}</text>
            {/* Base bar (grey background) */}
            <rect x={x1} y={y + 8} width={barW} height={ROW_H - 16} rx={2}
              fill="#6366f1" opacity={0.2} />
            {/* Below-base portion (red) */}
            {toX(p.lowOutput) < baseX && (
              <rect x={toX(p.lowOutput)} y={y + 8}
                width={Math.min(baseX, toX(p.highOutput)) - toX(p.lowOutput)}
                height={ROW_H - 16} rx={2} fill="#ef4444" opacity={0.75} />
            )}
            {/* Above-base portion (indigo) */}
            {toX(p.highOutput) > baseX && (
              <rect x={Math.max(baseX, toX(p.lowOutput))} y={y + 8}
                width={toX(p.highOutput) - Math.max(baseX, toX(p.lowOutput))}
                height={ROW_H - 16} rx={2} fill="#6366f1" opacity={0.75} />
            )}
          </g>
        );
      })}
    </svg>
  );
}
```

- [ ] **Step 3: Add /sensitivity to Navigation**

In `frontend/src/components/Navigation.tsx`, add to the `tools` array after `/decision-tree`:

```tsx
{ href: '/sensitivity',  label: 'Sensitivity' },
```

- [ ] **Step 4: Start dev server and verify manually**

```bash
# Terminal 1 — backend
mvn spring-boot:run

# Terminal 2 — frontend
cd frontend && npm run dev
```

Open `http://localhost:3000/sensitivity`. Verify:
1. Page loads with model selector and input fields
2. Selecting BREAKEVEN switches to CF/CVu/P fields
3. Fill EOQ inputs (D=1000, S=50, C=10, I=0.2) with swing 20% → Calculate
4. Tornado chart renders with 4 bars sorted by impact
5. Results table shows lowOutput/highOutput/impact for each parameter

- [ ] **Step 5: Commit**

```bash
git add frontend/src/app/sensitivity/page.tsx \
        frontend/src/components/sensitivity/SensitivityClient.tsx \
        frontend/src/components/Navigation.tsx
git commit -m "feat: add /sensitivity page with tornado chart"
```

---

## Task 6: /montecarlo Frontend Page + Navigation + E2E Tests

**Files:**
- Create: `frontend/src/app/montecarlo/page.tsx`
- Create: `frontend/src/components/montecarlo/MonteCarloClient.tsx`
- Modify: `frontend/src/components/Navigation.tsx` (add /montecarlo)
- Create: `frontend/tests/e2e/sensitivity.spec.ts`
- Create: `frontend/tests/e2e/montecarlo.spec.ts`

**Interfaces:**
- Consumes: `POST /api/montecarlo/simulate`, `POST /api/montecarlo/sessions`, `GET /api/montecarlo/sessions`, `GET /api/montecarlo/sessions/{id}`
- Produces: `/montecarlo` page with CDF chart and session history

- [ ] **Step 1: Create the page wrapper**

```tsx
// frontend/src/app/montecarlo/page.tsx
import MonteCarloClient from '@/components/montecarlo/MonteCarloClient';

export default function MonteCarloPage() {
  return <MonteCarloClient />;
}
```

- [ ] **Step 2: Create MonteCarloClient**

```tsx
// frontend/src/components/montecarlo/MonteCarloClient.tsx
'use client';

import { useState } from 'react';
import { SessionHistory, type SessionRow } from '@/components/shared/SessionHistory';

type ModelType = 'EOQ' | 'BREAKEVEN';
type DistType = 'NORMAL' | 'UNIFORM' | 'TRIANGULAR';

const EOQ_FIELDS = ['demand', 'orderingCost', 'unitCost', 'holdingRate'] as const;
const BE_FIELDS  = ['fixedCosts', 'variableCostPerUnit', 'pricePerUnit'] as const;

const FIELD_LABELS: Record<string, string> = {
  demand: 'Annual Demand (D)',
  orderingCost: 'Ordering Cost (S)',
  unitCost: 'Unit Cost (C)',
  holdingRate: 'Holding Rate (I)',
  fixedCosts: 'Fixed Costs (CF)',
  variableCostPerUnit: 'Variable Cost/Unit (CVu)',
  pricePerUnit: 'Price/Unit (P)',
};

interface DistParams { type: DistType; mean: string; stdDev: string; min: string; max: string; mode: string; }
const emptyDist = (): DistParams => ({ type: 'NORMAL', mean: '', stdDev: '', min: '', max: '', mode: '' });

interface MCResult {
  cdfValues: number[];
  mean: number; stdDev: number;
  p5: number; p25: number; p50: number; p75: number; p95: number;
}

export default function MonteCarloClient() {
  const [model, setModel]       = useState<ModelType>('EOQ');
  const [dists, setDists]       = useState<Record<string, DistParams>>({});
  const [iterations, setIter]   = useState('10000');
  const [result, setResult]     = useState<MCResult | null>(null);
  const [error, setError]       = useState<string | null>(null);
  const [loading, setLoading]   = useState(false);
  const [sessionName, setName]  = useState('');
  const [saveStatus, setSave]   = useState<'idle'|'saving'|'saved'|'error'>('idle');
  const [histKey, setHistKey]   = useState(0);

  const fields = model === 'EOQ' ? EOQ_FIELDS : BE_FIELDS;

  const getDist = (f: string): DistParams => dists[f] ?? emptyDist();
  const updateDist = (f: string, patch: Partial<DistParams>) =>
    setDists(prev => ({ ...prev, [f]: { ...getDist(f), ...patch } }));

  const buildInputs = () => {
    const out: Record<string, object> = {};
    for (const f of fields) {
      const d = getDist(f);
      const num = (s: string) => s === '' ? null : Number(s);
      out[f] = {
        distribution: d.type,
        mean: num(d.mean), stdDev: num(d.stdDev),
        min: num(d.min), max: num(d.max), mode: num(d.mode),
      };
    }
    return out;
  };

  const simulate = async () => {
    setError(null);
    const iter = Number(iterations);
    if (!iterations || isNaN(iter) || iter < 1 || iter > 100000) {
      setError('Iterations must be between 1 and 100,000.'); return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/montecarlo/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, inputs: buildInputs(), iterations: iter }),
      });
      if (!res.ok) { setError(`Simulation failed: ${await res.text()}`); return; }
      setResult(await res.json());
    } catch {
      setError('Could not reach the backend. Is the server running?');
    } finally {
      setLoading(false);
    }
  };

  const clear = () => { setDists({}); setResult(null); setError(null); setSave('idle'); };

  const saveSession = async () => {
    if (!result) return;
    const name = sessionName.trim() || new Date().toLocaleString();
    setSave('saving');
    try {
      const res = await fetch('/api/montecarlo/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, model, inputs: buildInputs(), iterations: Number(iterations) }),
      });
      if (!res.ok) throw new Error();
      setSave('saved'); setHistKey(k => k + 1);
      setTimeout(() => setSave('idle'), 2000);
    } catch { setSave('error'); setTimeout(() => setSave('idle'), 3000); }
  };

  const loadSession = async (row: SessionRow) => {
    try {
      const res = await fetch(`/api/montecarlo/sessions/${row.id}`);
      if (!res.ok) return;
      const full = await res.json();
      setModel(full.model as ModelType);
      setIter(String(full.iterations));
      const newDists: Record<string, DistParams> = {};
      for (const [k, v] of Object.entries(full.inputs as Record<string, Record<string, unknown>>)) {
        newDists[k] = {
          type: v.distribution as DistType,
          mean: v.mean != null ? String(v.mean) : '',
          stdDev: v.stdDev != null ? String(v.stdDev) : '',
          min: v.min != null ? String(v.min) : '',
          max: v.max != null ? String(v.max) : '',
          mode: v.mode != null ? String(v.mode) : '',
        };
      }
      setDists(newDists);
      setResult(full.results);
      setError(null);
    } catch { /* silent */ }
  };

  const HISTORY_COLUMNS = [
    { key: 'model', label: 'Model' },
    { key: 'iterations', label: 'Iterations', format: (v: unknown) => String(v) },
  ];

  return (
    <div>
      <div style={{ marginBottom: 'var(--space-6)' }}>
        <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 'var(--font-bold)', marginBottom: 'var(--space-2)' }}>
          Monte Carlo Simulation
        </h1>
        <p style={{ color: 'var(--color-neutral-600)', fontSize: 'var(--text-sm)' }}>
          Assign a probability distribution to each input and run N simulations to estimate the output distribution.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-6)', alignItems: 'start' }}>

        {/* Inputs card */}
        <div className="card">
          <h2 style={{ fontSize: 'var(--text-base)', fontWeight: 'var(--font-semibold)', marginBottom: 'var(--space-4)' }}>
            Inputs
          </h2>

          {/* Model selector */}
          <div style={{ marginBottom: 'var(--space-4)' }}>
            <label style={{ display: 'block', fontSize: 'var(--text-sm)', fontWeight: 'var(--font-medium)', marginBottom: 'var(--space-1)' }}>
              Model
            </label>
            <select value={model}
              onChange={e => { setModel(e.target.value as ModelType); setDists({}); setResult(null); }}
              style={{ width: '100%' }}>
              <option value="EOQ">Economic Order Quantity (EOQ)</option>
              <option value="BREAKEVEN">Break-even Analysis</option>
            </select>
          </div>

          {/* Per-field distribution inputs */}
          {fields.map(field => {
            const d = getDist(field);
            return (
              <div key={field} style={{ marginBottom: 'var(--space-4)', padding: 'var(--space-3)', background: 'var(--color-neutral-50)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-neutral-200)' }}>
                <p style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-medium)', marginBottom: 'var(--space-2)' }}>
                  {FIELD_LABELS[field]}
                </p>
                <select value={d.type}
                  onChange={e => updateDist(field, { type: e.target.value as DistType })}
                  style={{ width: '100%', marginBottom: 'var(--space-2)' }}>
                  <option value="NORMAL">Normal (mean, std dev)</option>
                  <option value="UNIFORM">Uniform (min, max)</option>
                  <option value="TRIANGULAR">Triangular (min, max, mode)</option>
                </select>
                {d.type === 'NORMAL' && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-2)' }}>
                    <input type="number" placeholder="Mean" value={d.mean}
                      onChange={e => updateDist(field, { mean: e.target.value })} step="any" />
                    <input type="number" placeholder="Std Dev" value={d.stdDev}
                      onChange={e => updateDist(field, { stdDev: e.target.value })} step="any" />
                  </div>
                )}
                {d.type === 'UNIFORM' && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-2)' }}>
                    <input type="number" placeholder="Min" value={d.min}
                      onChange={e => updateDist(field, { min: e.target.value })} step="any" />
                    <input type="number" placeholder="Max" value={d.max}
                      onChange={e => updateDist(field, { max: e.target.value })} step="any" />
                  </div>
                )}
                {d.type === 'TRIANGULAR' && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 'var(--space-2)' }}>
                    <input type="number" placeholder="Min" value={d.min}
                      onChange={e => updateDist(field, { min: e.target.value })} step="any" />
                    <input type="number" placeholder="Max" value={d.max}
                      onChange={e => updateDist(field, { max: e.target.value })} step="any" />
                    <input type="number" placeholder="Mode" value={d.mode}
                      onChange={e => updateDist(field, { mode: e.target.value })} step="any" />
                  </div>
                )}
              </div>
            );
          })}

          {/* Iterations */}
          <div style={{ marginBottom: 'var(--space-4)' }}>
            <label style={{ display: 'block', fontSize: 'var(--text-sm)', fontWeight: 'var(--font-medium)', marginBottom: 'var(--space-1)' }}>
              Iterations (1 – 100,000)
            </label>
            <input type="number" value={iterations}
              onChange={e => { setIter(e.target.value); setResult(null); }}
              min="1" max="100000" step="1000" />
          </div>

          {error && <p className="field-error" style={{ marginTop: 'var(--space-2)' }}>{error}</p>}

          <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
            <button onClick={simulate} className="btn btn-primary" disabled={loading}>
              {loading ? 'Simulating…' : 'Simulate'}
            </button>
            <button onClick={clear} className="btn btn-secondary">Clear</button>
          </div>
        </div>

        {/* Results card */}
        <div className="card" style={{ opacity: result ? 1 : 0.4, transition: 'opacity var(--transition-base)' }}>
          <h2 style={{ fontSize: 'var(--text-base)', fontWeight: 'var(--font-semibold)', marginBottom: 'var(--space-4)' }}>
            Summary Statistics
          </h2>
          {result ? (
            <table className="result-table">
              <tbody>
                <tr><td style={{ textAlign: 'left' }}>Mean</td><td>{result.mean.toFixed(2)}</td></tr>
                <tr><td style={{ textAlign: 'left' }}>Std Dev</td><td>{result.stdDev.toFixed(2)}</td></tr>
                <tr><td style={{ textAlign: 'left' }}>P5</td><td>{result.p5.toFixed(2)}</td></tr>
                <tr><td style={{ textAlign: 'left' }}>P25</td><td>{result.p25.toFixed(2)}</td></tr>
                <tr><td style={{ textAlign: 'left', fontWeight: 'var(--font-semibold)' }}>P50 (Median)</td>
                  <td style={{ fontWeight: 'var(--font-bold)', color: 'var(--color-primary-700)' }}>{result.p50.toFixed(2)}</td></tr>
                <tr><td style={{ textAlign: 'left' }}>P75</td><td>{result.p75.toFixed(2)}</td></tr>
                <tr><td style={{ textAlign: 'left' }}>P95</td><td>{result.p95.toFixed(2)}</td></tr>
              </tbody>
            </table>
          ) : (
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-neutral-400)' }}>
              Fill in distributions and click Simulate.
            </p>
          )}
        </div>
      </div>

      {/* CDF chart */}
      {result && result.cdfValues.length > 0 && (
        <div className="card" style={{ marginTop: 'var(--space-6)' }}>
          <h2 style={{ fontSize: 'var(--text-base)', fontWeight: 'var(--font-semibold)', marginBottom: 'var(--space-4)' }}>
            Cumulative Distribution Function (CDF)
          </h2>
          <CdfChart result={result} />
        </div>
      )}

      {/* Save session */}
      {result && (
        <div className="card" style={{ marginTop: 'var(--space-6)' }}>
          <h2 style={{ fontSize: 'var(--text-base)', fontWeight: 'var(--font-semibold)', marginBottom: 'var(--space-3)' }}>
            Save Session
          </h2>
          <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'center' }}>
            <input type="text" value={sessionName} onChange={e => setName(e.target.value)}
              placeholder="Session name (optional)" style={{ flex: 1 }} />
            <button onClick={saveSession} className="btn btn-primary"
              disabled={saveStatus === 'saving'} style={{ whiteSpace: 'nowrap' }}>
              {saveStatus === 'saving' ? 'Saving…' : saveStatus === 'saved' ? 'Saved ✓' : 'Save'}
            </button>
          </div>
          {saveStatus === 'error' && (
            <p className="field-error" style={{ marginTop: 'var(--space-2)' }}>Could not reach the backend.</p>
          )}
        </div>
      )}

      <SessionHistory
        apiPath="/api/montecarlo/sessions"
        refreshKey={histKey}
        columns={HISTORY_COLUMNS}
        onLoad={loadSession}
      />
    </div>
  );
}

function CdfChart({ result }: { result: MCResult }) {
  const W = 520, H = 280, PAD = { top: 20, right: 20, bottom: 40, left: 50 };
  const chartW = W - PAD.left - PAD.right;
  const chartH = H - PAD.top - PAD.bottom;

  const cdf = result.cdfValues;
  const minX = cdf[0], maxX = cdf[cdf.length - 1];
  const spanX = maxX - minX || 1;

  const toSvgX = (v: number) => PAD.left + ((v - minX) / spanX) * chartW;
  const toSvgY = (p: number) => PAD.top + (1 - p) * chartH; // p=0 → bottom, p=1 → top

  const points = cdf.map((v, i) => `${toSvgX(v)},${toSvgY(i / (cdf.length - 1))}`).join(' ');

  const p5x  = toSvgX(result.p5);
  const p95x = toSvgX(result.p95);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', maxWidth: W }}>
      {/* Axes */}
      <line x1={PAD.left} y1={PAD.top} x2={PAD.left} y2={PAD.top + chartH} stroke="#cbd5e1" />
      <line x1={PAD.left} y1={PAD.top + chartH} x2={PAD.left + chartW} y2={PAD.top + chartH} stroke="#cbd5e1" />

      {/* Y-axis labels */}
      {[0, 0.25, 0.5, 0.75, 1].map(p => (
        <g key={p}>
          <line x1={PAD.left - 4} y1={toSvgY(p)} x2={PAD.left} y2={toSvgY(p)} stroke="#cbd5e1" />
          <text x={PAD.left - 6} y={toSvgY(p) + 4} textAnchor="end" fontSize="10" fill="#94a3b8">
            {(p * 100).toFixed(0)}%
          </text>
        </g>
      ))}

      {/* X-axis labels */}
      <text x={PAD.left} y={H - 6} textAnchor="middle" fontSize="10" fill="#94a3b8">
        {minX.toFixed(1)}
      </text>
      <text x={PAD.left + chartW} y={H - 6} textAnchor="middle" fontSize="10" fill="#94a3b8">
        {maxX.toFixed(1)}
      </text>

      {/* CDF curve */}
      <polyline points={points} fill="none" stroke="#6366f1" strokeWidth={2} />

      {/* P5 reference line */}
      <line x1={p5x} y1={PAD.top} x2={p5x} y2={PAD.top + chartH}
        stroke="#ef4444" strokeDasharray="4,2" strokeWidth={1.5} />
      <text x={p5x} y={PAD.top - 4} textAnchor="middle" fontSize="10" fill="#ef4444">P5</text>

      {/* P95 reference line */}
      <line x1={p95x} y1={PAD.top} x2={p95x} y2={PAD.top + chartH}
        stroke="#f97316" strokeDasharray="4,2" strokeWidth={1.5} />
      <text x={p95x} y={PAD.top - 4} textAnchor="middle" fontSize="10" fill="#f97316">P95</text>
    </svg>
  );
}
```

- [ ] **Step 3: Add /montecarlo to Navigation**

In `frontend/src/components/Navigation.tsx`, add after `/sensitivity`:

```tsx
{ href: '/montecarlo', label: 'Monte Carlo' },
```

- [ ] **Step 4: Start dev server and verify manually**

```bash
# Terminal 1
mvn spring-boot:run
# Terminal 2
cd frontend && npm run dev
```

Open `http://localhost:3000/montecarlo`. Verify:
1. Page loads with model selector, distribution inputs per field, iterations input
2. Switching model switches the visible distribution fields
3. Fill EOQ distributions (all Uniform: demand 800-1200, orderingCost 40-60, unitCost 8-12, holdingRate 0.16-0.24), iterations 5000 → Simulate
4. CDF chart renders with P5/P95 reference lines
5. Summary stats card shows mean, std dev, percentiles

- [ ] **Step 5: Write E2E tests**

```typescript
// frontend/tests/e2e/sensitivity.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Sensitivity Analysis — happy path', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/sensitivity');
  });

  test('page loads with model selector and Calculate button', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /sensitivity analysis/i })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Calculate' })).toBeVisible();
  });

  test('calculates EOQ sensitivity and renders tornado chart', async ({ page }) => {
    // Fill EOQ base inputs
    const inputs = page.locator('input[type="number"]');
    await inputs.nth(0).fill('1000'); // demand
    await inputs.nth(1).fill('50');   // orderingCost
    await inputs.nth(2).fill('10');   // unitCost
    await inputs.nth(3).fill('0.2'); // holdingRate
    // swing % is input index 4, default is already 20

    await page.getByRole('button', { name: 'Calculate' }).click();

    // tornado chart SVG should appear
    await expect(page.locator('svg')).toBeVisible();
    // results table should show 4 rows (one per EOQ parameter)
    await expect(page.locator('tbody tr')).toHaveCount(4);
  });
});
```

```typescript
// frontend/tests/e2e/montecarlo.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Monte Carlo Simulation — happy path', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/montecarlo');
  });

  test('page loads with Simulate button', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /monte carlo/i })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Simulate' })).toBeVisible();
  });

  test('simulates EOQ Monte Carlo and renders CDF chart', async ({ page }) => {
    // All fields default to NORMAL distribution
    // Fill mean/stdDev for each EOQ field (4 fields × 2 inputs = inputs 0-7, then iterations at 8)
    const inputs = page.locator('input[type="number"]');
    await inputs.nth(0).fill('1000'); await inputs.nth(1).fill('50');  // demand mean/std
    await inputs.nth(2).fill('50');   await inputs.nth(3).fill('5');   // orderingCost mean/std
    await inputs.nth(4).fill('10');   await inputs.nth(5).fill('1');   // unitCost mean/std
    await inputs.nth(6).fill('0.2');  await inputs.nth(7).fill('0.02');// holdingRate mean/std

    await page.getByRole('button', { name: 'Simulate' }).click();

    // CDF SVG and summary stats should appear
    await expect(page.locator('svg')).toBeVisible();
    await expect(page.getByText(/P50/)).toBeVisible();
  });
});
```

- [ ] **Step 6: Run E2E tests (requires both servers running)**

```bash
# With both servers running:
cd frontend && npx playwright test tests/e2e/sensitivity.spec.ts tests/e2e/montecarlo.spec.ts
```

Expected: all tests pass (or skip gracefully if backend not available — Playwright will fail the `fetch` tests).

- [ ] **Step 7: Run full backend test suite one final time**

```bash
mvn test
```

Expected: all tests pass.

- [ ] **Step 8: Commit**

```bash
git add frontend/src/app/montecarlo/page.tsx \
        frontend/src/components/montecarlo/MonteCarloClient.tsx \
        frontend/src/components/Navigation.tsx \
        frontend/tests/e2e/sensitivity.spec.ts \
        frontend/tests/e2e/montecarlo.spec.ts
git commit -m "feat: add /montecarlo page with CDF chart and E2E smoke tests"
```
