# Tasks — MarketingQuantitative v1.0

## Legend
- **[ ]** To do
- **[~]** In progress
- **[x]** Done

Priority: **P1** = must-have for v1.0 · **P2** = nice-to-have

---

## Milestone 0 — Project Setup

| # | Task | Priority | Layer |
|---|------|----------|-------|
| T-00.1 | [x] Create Maven project with Spring Boot 3.3 and Java 21 | P1 | backend |
| T-00.2 | [x] Configure Flyway and connect to PostgreSQL 15 | P1 | backend |
| T-00.3 | [x] Scaffold Next.js 14 (App Router) with navigation between tools | P1 | frontend |
| T-00.4 | [x] Define shared CSS design tokens (colors, spacing, typography) | P1 | frontend |
| T-00.5 | [x] Set up Maven test runner (JUnit 5) + JaCoCo coverage | P1 | backend |

---

## Milestone 1 — Matrix Gains

| # | Task | Priority | Layer |
|---|------|----------|-------|
| T-01.1 | [x] Build dynamic table UI: add row (strategy) and add column (scenario) | P1 | frontend |
| T-01.2 | [x] Implement inline cell editing for payoff values | P1 | frontend |
| T-01.3 | [x] Implement maxi-max calculation (max of row maxima) | P1 | frontend |
| T-01.4 | [x] Implement maxi-min calculation (max of row minima) | P1 | frontend |
| T-01.5 | [x] Render result row in table with highlighted optimal strategy | P1 | frontend |
| T-01.6 | [x] `POST /api/matrix-gains/calculate` endpoint | P2 | backend |
| T-01.7 | [x] `MatrixGainsRequest` DTO with Bean Validation | P2 | backend |
| T-01.8 | [x] `MatrixGainsService` — maxi-max and maxi-min logic | P2 | backend |
| T-01.9 | [x] Flyway migration: `matrix_gains` + `matrix_gains_cell` tables | P2 | backend |

---

## Milestone 2 — Economic Order Quantity

| # | Task | Priority | Layer |
|---|------|----------|-------|
| T-02.1 | [x] Build input form: D, S, C, I fields with labels and units | P1 | frontend |
| T-02.2 | [x] Implement EOQ formula: √(2DS / IC) | P1 | frontend |
| T-02.3 | [x] Display derived metrics: orders/year, cycle time, total cost | P1 | frontend |
| T-02.4 | [x] Validate all inputs are positive numbers | P1 | frontend |
| T-02.5 | [x] `POST /api/eoq/calculate` endpoint | P2 | backend |
| T-02.6 | [x] `EoqRequest` DTO + `EoqResponse` record | P2 | backend |
| T-02.7 | [x] `EoqService` — pure calculation, no DB | P2 | backend |

---

## Milestone 3 — Rentability Point (Break-even)

| # | Task | Priority | Layer |
|---|------|----------|-------|
| T-03.1 | [x] Build input form: CF, CVu, P fields | P1 | frontend |
| T-03.2 | [x] Validate P > CVu; show inline error if not | P1 | frontend |
| T-03.3 | [x] Calculate break-even quantity and break-even revenue | P1 | frontend |
| T-03.4 | [x] Render cost vs revenue chart (SVG) | P1 | frontend |
| T-03.5 | [x] Mark break-even point on chart | P1 | frontend |
| T-03.6 | [x] `POST /api/breakeven/calculate` endpoint | P2 | backend |
| T-03.7 | [x] `BreakevenService` — pure calculation | P2 | backend |

---

## Milestone 4 — Attention Queue (M/M/s)

| # | Task | Priority | Layer |
|---|------|----------|-------|
| T-04.1 | [x] Build input form: λ, μ, s fields | P1 | frontend |
| T-04.2 | [x] Validate sμ > λ; show warning if queue is unstable | P1 | frontend |
| T-04.3 | [x] Implement M/M/s formulas: ρ, Lq, L, Wq, W | P1 | frontend |
| T-04.4 | [x] Display results panel with all 5 metrics | P1 | frontend |
| T-04.5 | [x] `POST /api/queue/calculate` endpoint | P2 | backend |
| T-04.6 | [x] `QueueRequest` DTO + `QueueResponse` record | P2 | backend |
| T-04.7 | [x] `QueueService` — M/M/s calculation | P2 | backend |

---

## Milestone 5 — Decision Tree

| # | Task | Priority | Layer |
|---|------|----------|-------|
| T-05.1 | [x] Design tree data structure: nodes (decision/chance) + branches | P1 | frontend |
| T-05.2 | [x] Build UI to add decision node, add chance node, add branch | P1 | frontend |
| T-05.3 | [x] Validate probabilities on chance nodes sum to 1.0 | P1 | frontend |
| T-05.4 | [x] Implement backwards induction to compute EMV at each node | P1 | frontend |
| T-05.5 | [x] Render tree visually (SVG) with node labels and branch values | P1 | frontend |
| T-05.6 | [x] Highlight optimal path | P1 | frontend |
| T-05.7 | [x] `POST /api/decision-tree/calculate` endpoint | P2 | backend |
| T-05.8 | [x] `DecisionTreeService` — recursive EMV calculation | P2 | backend |

---

## Milestone 6 — Cross-cutting

| # | Task | Priority | Layer |
|---|------|----------|-------|
| T-06.1 | [x] Global error display component (inline validation messages) | P1 | frontend |
| T-06.2 | [x] Ensure all numeric outputs use `toFixed(2)` | P1 | frontend |
| T-06.3 | [x] CORS configuration on Spring Boot for local frontend dev | P2 | backend |
| T-06.4 | [x] OpenAPI / Swagger UI auto-generation | P2 | backend |
| T-06.5 | [x] E2E smoke test for each tool's happy path | P2 | test |

---

## Milestone 7 — Persistence

| # | Task | Priority | Layer |
|---|------|----------|-------|
| T-07.1 | [x] Flyway migration: eoq_session, breakeven_session, queue_session tables | P1 | backend |
| T-07.2 | [x] JPA entities + Spring Data repositories for all three session types | P1 | backend |
| T-07.3 | [x] EOQ session save / list / get — EoqSessionService + DTOs + controller endpoints | P1 | backend |
| T-07.4 | [x] Break-even session save / list / get — BreakevenSessionService + DTOs + endpoints | P1 | backend |
| T-07.5 | [x] Queue session save / list / get — QueueSessionService + DTOs + endpoints | P1 | backend |
| T-07.6 | [x] Shared SessionHistory frontend component (gracefully hidden when backend offline) | P1 | frontend |
| T-07.7 | [x] EOQ session save UI + history panel with Load button | P1 | frontend |
| T-07.8 | [x] Break-even session save UI + history panel with Load button | P1 | frontend |
| T-07.9 | [x] Queue session save UI + history panel with Load button | P1 | frontend |
| T-07.10 | [x] Backend unit tests for all three session services (TC-07-E01–E04, B01–B04, Q01–Q04) | P1 | test |

---

## Milestone 8 — Sensitivity Analysis & Monte Carlo Simulation

| # | Task | Priority | Layer |
|---|------|----------|-------|
| T-08.1 | [ ] `SensitivityRequest` / `SensitivityResponse` / `ParameterSensitivity` DTOs with Bean Validation | P1 | backend |
| T-08.2 | [ ] `SensitivityService` — vary each param ±swingPercent, call EoqService/BreakevenService, sort by impact | P1 | backend |
| T-08.3 | [ ] `POST /api/sensitivity/calculate` endpoint (`SensitivityController`) | P1 | backend |
| T-08.4 | [ ] `MonteCarloRequest` / `MonteCarloResponse` DTOs with Bean Validation | P1 | backend |
| T-08.5 | [ ] `MonteCarloService` — N-iteration sampling (Normal/Uniform/Triangular), CDF array + summary stats | P1 | backend |
| T-08.6 | [ ] `POST /api/montecarlo/simulate` endpoint (`MonteCarloController`) | P1 | backend |
| T-08.7 | [ ] Flyway migration: `sensitivity_session` + `montecarlo_session` tables | P1 | backend |
| T-08.8 | [ ] JPA entities + Spring Data repositories for both session types | P1 | backend |
| T-08.9 | [ ] `SensitivitySessionService` + DTOs + session endpoints (save / list / get) | P1 | backend |
| T-08.10 | [ ] `MonteCarloSessionService` + DTOs + session endpoints (save / list / get) | P1 | backend |
| T-08.11 | [ ] Unit tests: SensitivityService, MonteCarloService, both session services, controller slice validation | P1 | test |
| T-08.12 | [ ] `/sensitivity` page — model selector, base inputs, swing % field, tornado chart (SVG) | P1 | frontend |
| T-08.13 | [ ] `/montecarlo` page — model selector, distribution inputs per param, iterations field, CDF chart (SVG), stats card | P1 | frontend |
| T-08.14 | [ ] Session save/load UI for both pages (SessionHistory component) | P1 | frontend |
| T-08.15 | [ ] Add `/sensitivity` and `/montecarlo` to `Navigation.tsx` | P1 | frontend |
| T-08.16 | [ ] Playwright E2E smoke tests for `/sensitivity` and `/montecarlo` happy paths | P2 | test |
