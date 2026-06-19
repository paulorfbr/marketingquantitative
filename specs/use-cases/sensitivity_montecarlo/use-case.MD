# Use Case: Sensitivity Analysis & Monte Carlo Simulation

**Milestone:** 8  
**Pages:** `/sensitivity`, `/montecarlo`

---

## Actors
- **Analyst** — a user who wants to understand how uncertainty in model inputs affects the output of an EOQ or Break-even calculation

---

## UC-08-A: Sensitivity Analysis

### Goal
Determine which input parameters have the greatest impact on the model output by varying each one independently.

### Preconditions
- User has chosen a model (EOQ or Breakeven)
- User knows approximate base values for all model inputs

### Main Flow
1. User navigates to `/sensitivity`
2. User selects model (EOQ / Breakeven)
3. User enters base values for all model inputs
4. User optionally adjusts swing percentage (default 20%)
5. User clicks "Calculate"
6. System calls `POST /api/sensitivity/calculate`
7. System returns a tornado chart: horizontal bars sorted by impact magnitude, with the most influential parameter at the top
8. User reads the chart to identify which input drives the most output variance
9. User optionally saves the session with a name
10. User can load a previous session from history

### Business Rules
- Swing % must be positive
- All base input values must satisfy the underlying model's constraints (e.g. P > CVu for Breakeven)
- Parameters are sorted descending by `|highOutput − lowOutput|`

### Output Metric
- EOQ model → EOQ quantity
- Breakeven model → Break-even quantity

---

## UC-08-B: Monte Carlo Simulation

### Goal
Estimate the probability distribution of the model output given uncertainty in all input parameters simultaneously.

### Preconditions
- User has chosen a model (EOQ or Breakeven)
- User can characterize each input as a statistical distribution

### Main Flow
1. User navigates to `/montecarlo`
2. User selects model (EOQ / Breakeven)
3. For each model input, user selects a distribution type and fills its parameters:
   - **Normal**: mean, standard deviation
   - **Uniform**: minimum, maximum
   - **Triangular**: minimum, maximum, mode
4. User sets number of iterations (default 10,000; range 1–100,000)
5. User clicks "Simulate"
6. System calls `POST /api/montecarlo/simulate`
7. System returns a CDF chart (x = output value, y = cumulative probability) with P5/P95 reference lines, plus a summary stats card (mean, std dev, P5, P25, P50, P75, P95)
8. User reads P5/P95 to understand the plausible range of outcomes
9. User optionally saves the session with a name
10. User can load a previous session from history

### Business Rules
- Every input parameter must have a distribution assigned (no fixed parameters)
- Iterations must be between 1 and 100,000
- For Triangular distribution: `min ≤ mode ≤ max`
- For Normal distribution: `stdDev > 0`
- For Uniform distribution: `min < max`

### Output Metric
- EOQ model → EOQ quantity
- Breakeven model → Break-even quantity
