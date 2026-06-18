# Design: Sensitivity Analysis & Monte Carlo Simulation
**Date:** 2026-06-18
**Status:** Approved

---

## Overview

Two new standalone tools added to the MarketingQuantitative app:

1. **Sensitivity Analysis** (`/sensitivity`) — Tornado chart showing how each input's variation impacts an output metric
2. **Monte Carlo Simulation** (`/montecarlo`) — CDF chart and summary stats from probabilistic simulation of output distribution

Both support **Break-even** and **EOQ** as target models, selected via a shared model picker. Computation is **backend-delegated** (Spring Boot), reusing existing `BreakevenService` and `EoqService` — no duplicate calculation logic.

---

## Architecture

### Pages & Components

| Path | Server component | Client component |
|------|-----------------|-----------------|
| `/sensitivity` | `app/sensitivity/page.tsx` | `components/sensitivity/SensitivityClient.tsx` |
| `/montecarlo` | `app/montecarlo/page.tsx` | `components/montecarlo/MonteCarloClient.tsx` |

**Shared:** `components/shared/ModelPicker.tsx` — Break-even / EOQ toggle, reused by both pages.

Both client components follow the established pattern: `useState` for form/result state, POST to backend, SVG for visualisation, `FieldError` for inline validation, `toFixed(2)` for all numeric output.

---

## Backend API

### POST /api/sensitivity/calculate

**Request:**
```json
{
  "model": "BREAKEVEN" | "EOQ",
  "outputMetric": "BREAKEVEN_QUANTITY" | "EOQ_QUANTITY",
  "variationPercent": 20,
  "inputs": {
    "cf":    { "base": 10000 },
    "cvu":   { "base": 5 },
    "price": { "base": 15 }
  }
}
```

**Response:**
```json
{
  "baseline": 1000.0,
  "bars": [
    {
      "parameter": "price",
      "lowValue": 700.0,
      "highValue": 1500.0,
      "lowInput": 12.0,
      "highInput": 18.0
    }
  ]
}
```

- Bars are sorted by impact magnitude (`highValue - lowValue`) descending — widest bar at top.
- Backend varies one input at a time across `[base × (1 - variationPercent/100), base × (1 + variationPercent/100)]` while holding all others at base.
- Delegates to `EoqService` or `BreakevenService` for each calculation.
- Input keys are model-specific and validated server-side: Break-even expects `cf`, `cvu`, `price`; EOQ expects `demand`, `orderingCost`, `unitCost`, `holdingRate`. Unknown keys are rejected with 400.

---

### POST /api/montecarlo/simulate

**Request:**
```json
{
  "model": "BREAKEVEN" | "EOQ",
  "outputMetric": "BREAKEVEN_QUANTITY" | "EOQ_QUANTITY",
  "iterations": 10000,
  "inputs": {
    "cf":    { "distribution": "NORMAL",      "mean": 10000, "stdDev": 1000 },
    "cvu":   { "distribution": "UNIFORM",     "min": 4,      "max": 6 },
    "price": { "distribution": "TRIANGULAR",  "min": 12,     "max": 18,  "mode": 15 }
  }
}
```

**Response:**
```json
{
  "mean": 1050.0,
  "stdDev": 120.0,
  "p10": 880.0,
  "p50": 1040.0,
  "p90": 1230.0,
  "cdfPoints": [
    { "x": 700.0, "cumulativeProbability": 0.01 },
    { "x": 750.0, "cumulativeProbability": 0.03 }
  ]
}
```

- `cdfPoints`: ~200 evenly-spaced points for smooth SVG curve rendering.
- Default iterations: 10,000. Max: 100,000 (validated server-side).
- Sampling: `java.util.Random` — no external library dependency.
  - **NORMAL**: Box-Muller transform or `Random.nextGaussian()`
  - **UNIFORM**: `min + random * (max - min)`
  - **TRIANGULAR**: inverse CDF method

---

## Backend Structure

```
src/main/java/.../
  sensitivity/
    SensitivityRequest.java       — @Valid DTO
    SensitivityResponse.java      — record { double baseline, List<SensitivityBar> bars }
    SensitivityBar.java           — record { String parameter, double lowValue, double highValue, double lowInput, double highInput }
    SensitivityService.java       — varies inputs, delegates to EoqService/BreakevenService, sorts bars
    SensitivityController.java    — POST /api/sensitivity/calculate

  montecarlo/
    MonteCarloRequest.java        — @Valid DTO
    MonteCarloResponse.java       — record { double mean, stdDev, p10, p50, p90, List<CdfPoint> cdfPoints }
    CdfPoint.java                 — record { double x, double cumulativeProbability }
    MonteCarloService.java        — runs N iterations, builds sorted output array, computes stats + CDF
    MonteCarloController.java     — POST /api/montecarlo/simulate

  shared/
    ModelType.java                — enum: BREAKEVEN, EOQ
    OutputMetric.java             — enum: BREAKEVEN_QUANTITY, EOQ_QUANTITY
    DistributionType.java         — enum: NORMAL, UNIFORM, TRIANGULAR
    InputDistribution.java        — record { DistributionType distribution, Double mean, Double stdDev, Double min, Double max, Double mode }
                                    All fields nullable; service validates required fields per distribution type at runtime
```

**No Flyway migrations** — stateless compute endpoints, no persistence.

**Validation rules (Jakarta Bean Validation):**
- `variationPercent`: 1–99
- `iterations`: 1–100,000
- NORMAL: `stdDev > 0`
- UNIFORM: `min < max`
- TRIANGULAR: `min ≤ mode ≤ max`
- All base values must be positive

Existing `@ControllerAdvice` handles validation errors globally.

---

## Frontend UI

### Sensitivity Analysis (`/sensitivity`)

1. **Model picker** — Break-even / EOQ toggle
2. **Variation %** — single numeric input, default 20, applies to all inputs
3. **Input form** — one row per parameter (label + base value field); parameters change when model changes
4. **"Analyse" button** → POST to `/api/sensitivity/calculate`
5. **SVG Tornado chart** — horizontal bars centered on baseline; left = low-input output, right = high-input output; parameter labels on left axis; sorted top-to-bottom by impact magnitude
6. **Baseline value** displayed above chart

### Monte Carlo Simulation (`/montecarlo`)

1. **Model picker** — Break-even / EOQ toggle
2. **Iteration count** — numeric input, default 10,000
3. **Input form** — one row per parameter with:
   - Distribution type dropdown (Normal / Uniform / Triangular)
   - Contextual parameter fields: Normal → mean + std dev; Uniform → min + max; Triangular → min + mode + max
4. **"Simulate" button** → POST to `/api/montecarlo/simulate`
5. **SVG CDF chart** — x-axis = output value, y-axis = cumulative probability (0–1), smooth step curve
6. **Summary stats panel** — mean, std dev, P10, P50, P90 displayed with `toFixed(2)`

Both pages use `FieldError` for inline validation messages.

---

## Testing

### Backend (JUnit 5)

**SensitivityServiceTest:**
- Bars are sorted by impact descending (widest first)
- Baseline output matches direct service call with base inputs
- Each bar's low/high inputs are symmetric around base value
- Works correctly for both BREAKEVEN and EOQ models

**MonteCarloServiceTest:**
- P10 < P50 < P90 always holds
- UNIFORM[0, 100] mean converges to ~50 within tolerance
- CDF first point has `cumulativeProbability` ≈ 0, last ≈ 1
- Iteration count is respected (output array length = iterations)
- TRIANGULAR validation: `min ≤ mode ≤ max` enforced

### Frontend

- E2E smoke test for each page's happy path (added to Milestone 6 suite)
- No `@/lib/*.ts` unit tests needed — calculation is fully backend-delegated

---

## Out of Scope (this milestone)

- Session save/load for sensitivity or Monte Carlo (can be added as Milestone 9)
- Matrix Gains or Queue models as targets
- 2-way sensitivity (heat map)
- Output metrics beyond primary output (e.g., total cost for EOQ)
