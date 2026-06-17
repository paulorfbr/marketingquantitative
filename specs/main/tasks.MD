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
