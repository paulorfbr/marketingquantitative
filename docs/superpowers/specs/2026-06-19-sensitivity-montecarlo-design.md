# Design: Sensitivity Analysis & Monte Carlo Simulation (Milestone 8)

**Date:** 2026-06-19  
**Status:** Approved

---

## Overview

Two new standalone pages added to the MarketingQuantitative tool suite:

- `/sensitivity` — Sensitivity Analysis with tornado chart
- `/montecarlo` — Monte Carlo Simulation with CDF chart

Both support two models (EOQ and Break-even) and persist sessions to the database.

---

## Architecture

```
Frontend /sensitivity page
  └─ POST /api/sensitivity/calculate  →  SensitivityController
       └─ SensitivityService  →  EoqService | BreakevenService

Frontend /montecarlo page
  └─ POST /api/montecarlo/simulate    →  MonteCarloController
       └─ MonteCarloService  →  EoqService | BreakevenService
```

Both calculation services are pure (no DB). Persistence is handled by dedicated session services following the Milestone 7 pattern. Shared enums (`ModelType`, `DistributionType`, `InputDistribution`, `OutputMetric`) are already committed and used as-is.

---

## Backend — Sensitivity Analysis

### Request (`SensitivityRequest`)
- `ModelType model` — `@NotNull`
- `Map<String, Double> baseInputs` — keys match model field names (e.g. `demand`, `orderingCost` for EOQ; `fixedCosts`, `variableCostPerUnit`, `pricePerUnit` for Breakeven)
- `double swingPercent` — `@Positive`, default 20.0

### Service Logic (`SensitivityService`)
The service validates that all keys in `baseInputs` (and `inputs` for Monte Carlo) match the expected fields for the chosen model — unknown keys are rejected with `400 Bad Request`. Expected keys: EOQ → `{demand, orderingCost, unitCost, holdingRate}`; Breakeven → `{fixedCosts, variableCostPerUnit, pricePerUnit}`.

For each input key in `baseInputs`:
1. Hold all other inputs at base value
2. Compute model output at `base × (1 − swingPercent/100)` → `lowOutput`
3. Compute model output at `base × (1 + swingPercent/100)` → `highOutput`
4. Delegate to `EoqService.calculate()` or `BreakevenService.calculate()` based on `ModelType`
5. Compute `impact = |highOutput − lowOutput|`

Return list of `ParameterSensitivity` records sorted descending by impact (tornado order) plus `baseOutput`.

### Response (`SensitivityResponse`)
- `double baseOutput`
- `List<ParameterSensitivity> parameters` — sorted by impact descending
  - `String paramKey`
  - `double lowValue`, `double highValue`
  - `double lowOutput`, `double highOutput`
  - `double impact`

### Endpoint
`POST /api/sensitivity/calculate` — stateless, no auth

---

## Backend — Monte Carlo Simulation

### Request (`MonteCarloRequest`)
- `ModelType model` — `@NotNull`
- `Map<String, InputDistribution> inputs` — every parameter must have a distribution (`InputDistribution` record: `DistributionType distribution`, `Double mean`, `Double stdDev`, `Double min`, `Double max`, `Double mode`)
- `int iterations` — `@Min(1) @Max(100000)`, default 10,000

### Service Logic (`MonteCarloService`)
For each of N iterations:
1. Sample one value per input from its distribution:
   - `NORMAL`: `nextGaussian() * stdDev + mean`
   - `UNIFORM`: `min + random * (max − min)`
   - `TRIANGULAR`: inverse-CDF method
2. Build model request, call `EoqService` or `BreakevenService`
3. Collect output value

Sort N results ascending → CDF array. Compute summary stats.

**Performance:** 100k iterations at ~1µs each stays within the 300ms NFR-01 budget.

### Response (`MonteCarloResponse`)
- `double[] cdfValues` — 200 evenly-spaced CDF sample points (downsampled from N iterations; sufficient for a smooth chart, avoids serializing up to 100k doubles)
- `double mean`, `double stdDev`
- `double p5`, `double p25`, `double p50`, `double p75`, `double p95`

### Endpoint
`POST /api/montecarlo/simulate` — stateless, no auth

---

## Persistence

### Flyway migrations
- `sensitivity_session`: `id`, `name`, `model` (varchar), `base_inputs` (jsonb), `swing_percent` (double precision), `results_json` (jsonb), `created_at`
- `montecarlo_session`: `id`, `name`, `model` (varchar), `inputs_json` (jsonb), `iterations` (int), `results_json` (jsonb), `created_at`

### Session services
Each session type gets: JPA entity → `@Repository` → `SessionService` (save / list / get) → controller endpoints:
- `POST /api/sensitivity/sessions`
- `GET /api/sensitivity/sessions`
- `GET /api/sensitivity/sessions/{id}`
- `POST /api/montecarlo/sessions`
- `GET /api/montecarlo/sessions`
- `GET /api/montecarlo/sessions/{id}`

Same REST shape as EOQ/Breakeven/Queue session endpoints.

---

## Frontend

### `/sensitivity` page
- Model selector (EOQ / Breakeven) — switches visible input fields
- Base input fields (same fields as respective tool page)
- Swing % input (default 20, editable)
- "Calculate" button → POST `/api/sensitivity/calculate`
- **Tornado chart (SVG):** horizontal bars sorted by impact; left = low output, right = high output, center line = base. Parameter label on left y-axis.
- Session save/load panel using existing `SessionHistory` component pattern

### `/montecarlo` page
- Model selector (EOQ / Breakeven)
- For each model input: distribution type dropdown (Normal / Uniform / Triangular) + contextual parameter fields:
  - Normal: `mean`, `stdDev`
  - Uniform: `min`, `max`
  - Triangular: `min`, `max`, `mode`
- Iterations input (default 10,000)
- "Simulate" button → POST `/api/montecarlo/simulate`
- **CDF chart (SVG):** x-axis = output value, y-axis = cumulative probability 0→1; vertical reference lines at P5 and P95
- Summary stats card: mean, std dev, P5, P25, P50, P75, P95
- Session save/load panel

Both pages added to `Navigation.tsx`.

---

## Testing

### Backend unit tests (JUnit 5)
- `SensitivityServiceTest`: impact ordering, correct low/high output per model, zero impact when swing = 0
- `MonteCarloServiceTest`: output array length = iterations, mean/stdDev within tolerance for known distributions (seed `Random` for determinism), P5 < P50 < P95 invariant
- `SensitivitySessionServiceTest` / `MonteCarloSessionServiceTest`: save-then-get round-trip, list returns all sessions
- Controller slice tests (`@WebMvcTest`): validation rejects missing fields, iterations out of `[1, 100000]` range

### Frontend E2E (Playwright)
- `/sensitivity` happy path: pick model, fill inputs, calculate, assert tornado chart renders
- `/montecarlo` happy path: pick model, fill distributions, simulate, assert CDF chart renders
