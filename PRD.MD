# PRD — Marketing Quantitative v1.0


## 1. Vision

### Presentation

Marketing Quantitative is a browser-based toolkit that puts five standard quantitative marketing methods — payoff matrix analysis, economic order quantity, break-even analysis, M/M/s queueing theory, and decision tree EMV — inside a single, fast, offline-capable web application. The user fills in parameters, clicks Calculate, and sees validated results in under 300 ms, with inline errors adjacent to offending fields and visual output (tables, SVG charts, tree diagrams) on the same screen.

### Value proposition

Marketing analysts, students, and instructors spend disproportionate time translating textbook formulas into error-prone spreadsheets. Marketing Quantitative replaces that translation layer with formula-correct, test-covered implementations that surface results and explanations instantly. Because all calculations run in the browser, the tool works offline and requires zero installation.

### Differentiation

| Differentiator | Description |
|----------------|-------------|
| Offline-first | Calculations execute entirely in `src/lib/` TypeScript functions — no server needed |
| Dual-mode runtime | Identical results whether the Spring Boot backend is running or not; backend adds REST API and optional persistence |
| Visual-first output | Every tool produces not just numbers but a visual artefact (result table, SVG chart, or tree diagram with highlighted optimal path) |
| Academic-grade formulas | Formulas are cited in the UI (e.g., Q* = √(2DS/IC), Q_BE = CF/(P−CVu)) so students can verify derivation |
| Extensible milestone structure | Each tool is isolated in its own route, lib module, and test file — adding a sixth tool does not touch existing code |


---


## 2. Product objectives

| # | Objective | Success metric |
|---|-----------|---------------|
| O-01 | Provide five quantitative tools covering the most common marketing-science methods taught in undergraduate and MBA courses | All five milestones shipped and passing tests |
| O-02 | Achieve sub-300 ms p95 response time for all calculations | TC-06-NF01 load test passes |
| O-03 | Operate with no backend dependency for core calculations | TC-06-NF02: standalone frontend test passes |
| O-04 | Enforce input correctness with inline validation — never show a wrong result silently | NFR-05: all validation errors appear adjacent to the offending field |
| O-05 | Maintain ≥ 80% line coverage on services and ≥ 70% on controllers via JaCoCo, and ≥ 80% line coverage on `src/lib/` via Jest | `mvn verify` and `npm run test:coverage` both pass |


---


## 3. Personas

### P-01 — Marketing student (Ana)
- **Age / role**: 20–25, undergraduate or MBA student in a marketing or operations management course.
- **Context**: Works through problem sets and exam preparation. Knows the theory but is prone to arithmetic mistakes when applying multi-step formulas by hand.
- **Goal**: Enter textbook values, see the correct answer immediately, and verify it against her own workings.
- **Needs**: Clear labels, formula reminders in the UI, inline errors when values are invalid, numeric output with exactly 2 decimal places.

### P-02 — Marketing analyst (Carlos)
- **Age / role**: 25–35, works in a marketing, supply-chain, or operations team.
- **Context**: Makes real pricing, inventory, or service-capacity decisions under time pressure. Comfortable with spreadsheets but wants a faster, less error-prone alternative for routine quantitative work.
- **Goal**: Input real business parameters and get trustworthy results fast, with visual output he can include in a presentation.
- **Needs**: Fast load, offline capability (works on a flight), clear SVG/chart output, no required login.

### P-03 — Marketing professor (Dr. Silva)
- **Age / role**: 35–55, teaches quantitative marketing or OR at a university.
- **Context**: Needs a live demo tool for lectures and a shareable link for students.
- **Goal**: Display worked examples on a projector, show how changing one input shifts the result, share the URL with students.
- **Needs**: Default example values that illustrate the concept immediately, Reset to Example button, visual highlighting of the optimal outcome.


---


## 4. Functional requirements

Authoritative source: `specs/main/requirements.MD`. Summary below.

### FR-01 — Matrix Gains (Payoff Matrix)
The system shall let the user construct a strategy × scenario payoff matrix with editable labels and numeric cells, then compute and display the **maxi-max** (optimistic) criterion (max of row maxima) and the **maxi-min** (pessimistic) criterion (max of row minima), highlighting the optimal strategy for each.

### FR-02 — Economic Order Quantity
Given annual demand D, ordering cost S, unit cost C, and holding rate I, the system shall compute Q* = √(2DS / IC) and derive orders per year (D / Q*), cycle time in days (Q*/D × 365), and total annual cost (ordering + holding). All values displayed to 2 d.p.

### FR-03 — Rentability Point (Break-even Analysis)
Given fixed costs CF, variable cost per unit CVu, and selling price P, the system shall validate P > CVu, compute break-even quantity CF / (P − CVu), break-even revenue, contribution margin, and margin ratio, and display an SVG chart of revenue vs. total cost with the break-even point marked.

### FR-04 — Attention Queue (M/M/s)
Given arrival rate λ, service rate μ, and server count s, the system shall validate s × μ > λ (stability), compute server utilisation ρ = λ/(sμ), P₀, Lq, L, Wq, W via the M/M/s steady-state formulas, and display all metrics.

### FR-05 — Decision Tree
The system shall support a tree editor with decision nodes (□) and chance nodes (○), validate that probabilities on each chance node sum to 1.0, compute EMV via backwards induction, highlight the optimal decision path visually in an SVG diagram, and display the EMV of each node inline.


---


## 5. Business rules

| ID | Rule | Enforced in |
|----|------|-------------|
| BR-01 | Probabilities on a chance node must sum to 1.0 ± 0.001 | Frontend `validateTree()`, `DecisionTreeService.validate()` |
| BR-02 | Selling price P must be strictly greater than variable cost CVu; otherwise contribution margin ≤ 0 and break-even is undefined | Frontend `validateBreakeven()`, `BreakevenService.calculate()` throws 400 |
| BR-03 | Queue stability: total service rate s × μ must exceed arrival rate λ; otherwise steady-state metrics do not exist | Frontend `validateQueue()`, `QueueService.calculate()` throws 400 |
| BR-04 | All numeric outputs must display exactly 2 decimal places (`toFixed(2)`) | NFR-04; enforced by shared `format.ts` (`fmt2`, `fmtUSD`, `fmtPct`) |
| BR-05 | EOQ holding rate is entered as a percentage (e.g. 20 for 20%) and divided by 100 before being passed to `calculateEoq()` | `EoqClient.tsx` input conversion |
| BR-06 | Each chance node's probabilities are validated independently; errors are scoped to the node where the violation occurs | `validateTree()` returns `TreeValidationError[]` with `nodeId` |
| BR-07 | Minimum server count for M/M/s is 1 (integer); fractional or zero values are rejected | `QueueRequest @Min(1)`, `validateQueue()` returns `'invalid_servers'` |
| BR-08 | Database credentials must never be committed; they are read from environment variables `DB_USERNAME` / `DB_PASSWORD` with safe defaults for local dev only | `application.yml` — `${DB_USERNAME:postgres}` pattern |


---


## 6. Non-functional requirements

Authoritative source: `specs/main/requirements.MD` NFR-01 through NFR-07.

| ID | Requirement | Implementation |
|----|-------------|---------------|
| NFR-01 | Calculation results displayed within 300 ms p95 | All calculations are pure in-memory functions; no network call required |
| NFR-02 | Frontend must function standalone with no backend | All five lib modules (`matrix-gains.ts`, `eoq.ts`, `breakeven.ts`, `queue.ts`, `decision-tree.ts`) have zero runtime dependencies and run in the browser |
| NFR-03 | Usable on Chrome, Firefox, Edge, Safari (last 2 major versions) | Next.js 14 targets ES2015+; no non-standard browser APIs used; SVG charts use standard SVG 1.1 |
| NFR-04 | All monetary/numeric outputs use 2 decimal places | `toFixed(2)` in every result render; shared `format.ts` provides `fmt2`, `fmtUSD`, `fmtPct` |
| NFR-05 | Validation errors displayed inline, adjacent to the offending field | Shared `FieldError` component (renders `<p class="field-error" role="alert">`); cross-field errors use `AlertBanner` |
| NFR-06 | Backend validates all request bodies via Jakarta Bean Validation | `@Valid` on every `@RequestBody`; `@NotNull`, `@Positive`, `@PositiveOrZero`, `@Min(1)` on all DTOs |
| NFR-07 | Java 21 and Spring Boot 3.3 | `pom.xml`: parent `spring-boot-starter-parent:3.3.5`, `<java.version>21</java.version>` |


---


## 7. Data model

Most tools are stateless — calculations run in memory, nothing is persisted. The exception is Matrix Gains, which has a Flyway-managed schema.

```
matrix_gains          — session header (id, name, created_at)
  └── matrix_gains_scenario  — column labels (id, matrix_gains_id, label, position)
  └── matrix_gains_strategy  — row labels (id, matrix_gains_id, label, position)
       └── matrix_gains_cell — payoff values (id, strategy_id, scenario_id, value)
```

Constraints: `position >= 0` check on all positional columns; all child tables cascade-delete from their parent.

EOQ, Break-even, Queue, and Decision Tree produce no persisted records in v1.0 — persistence for these tools is deferred to a future milestone.

Full DDL: `src/main/resources/db/migration/V202606152__matrix_gains.sql`.


---


## 8. Architecture

### Frontend

```
frontend/
  src/
    app/           ← Next.js 14 App Router — one folder per tool (server components by default)
    components/
      matrix-gains/    ← MatrixGainsClient.tsx ('use client')
      eoq/             ← EoqClient.tsx
      breakeven/       ← BreakevenClient.tsx
      queue/           ← QueueClient.tsx
      decision-tree/   ← DecisionTreeClient.tsx
      shared/          ← FieldError.tsx, AlertBanner.tsx
    lib/           ← Pure TypeScript calculation modules (framework-agnostic)
      matrix-gains.ts · eoq.ts · breakeven.ts · queue.ts · decision-tree.ts · format.ts
    __tests__/lib/ ← Jest unit tests, one file per lib module
  tests/e2e/       ← Playwright smoke tests, one file per tool
```

**Key conventions**
- `app/*/page.tsx` files are Server Components; they import and render only the `*Client.tsx` component.
- `'use client'` is pushed down to the component level, never hoisted into a page.
- All visual output is rendered as inline SVG — no external chart library.
- Design tokens live in `globals.css` as CSS custom properties (`--color-*`, `--space-*`, `--text-*`).

### Backend

```
src/main/java/com/marketingquantitative/
  config/       ← WebConfig (CORS), OpenApiConfig (Swagger)
  controller/   ← One @RestController per tool, all at /api/{tool}/calculate
  service/      ← Pure @Service classes; @Transactional(readOnly = true)
  dto/          ← Java 21 records for Request and Response; Jakarta Bean Validation on all fields
resources/
  db/migration/ ← Flyway SQL migrations (V{YYYYMMDD}{seq}__description.sql)
  application.yml
```

**Key conventions**
- Cross-field validation (e.g., P > CVu, sμ > λ) is performed in the service layer and reported via `ResponseStatusException(HttpStatus.BAD_REQUEST, message)`.
- No repository or entity classes exist for stateless tools — services compute and return directly.
- Swagger UI: `http://localhost:8080/swagger-ui.html` — auto-generated from springdoc-openapi 2.6.0.
- CORS allows `http://localhost:3000` and `http://localhost:3001` on all `/api/**` endpoints.


---


## 9. API REST

All endpoints are `POST`. All requests and responses are `application/json`. Validation failures return HTTP 400.

| Endpoint | Request fields | Response fields |
|----------|---------------|----------------|
| `POST /api/matrix-gains/calculate` | `strategies[].label`, `strategies[].values[]` | `maxiMax{value, strategyIndices[]}`, `maxiMin{value, strategyIndices[]}` |
| `POST /api/eoq/calculate` | `demand`, `orderingCost`, `unitCost`, `holdingRate` (decimal, not %) | `eoq`, `ordersPerYear`, `cycleDays`, `totalAnnualCost` |
| `POST /api/breakeven/calculate` | `fixedCosts`, `variableCostPerUnit`, `pricePerUnit` | `breakEvenQty`, `breakEvenRevenue`, `contributionMargin`, `marginRatio` |
| `POST /api/queue/calculate` | `arrivalRate`, `serviceRate`, `servers` | `utilization`, `p0`, `lq`, `l`, `wq`, `w` |
| `POST /api/decision-tree/calculate` | `root{id, kind, label, branches[{id, label, probability, terminalValue, child}]}` | `rootEmv`, `nodeEmv{nodeId→double}`, `optimalBranchIds[]` |

Full OpenAPI schema: `GET /api-docs` · Interactive UI: `GET /swagger-ui.html`

Frontend proxies `/api/*` to `http://localhost:8080` via `next.config.ts` rewrites.


---


## 10. Roadmap

| Milestone | Scope | Status |
|-----------|-------|--------|
| M0 — Project Setup | Maven/Spring Boot scaffold + Next.js 14 + design tokens + coverage guardrails | Done |
| M1 — Matrix Gains | Payoff matrix, maxi-max, maxi-min, highlight optimal | Done |
| M2 — EOQ | EOQ formula, orders/year, cycle time, total cost | Done |
| M3 — Break-even | Break-even qty/revenue, contribution margin, SVG cost-revenue chart | Done |
| M4 — Attention Queue | M/M/s steady-state metrics, utilisation bar, stability warning | Done |
| M5 — Decision Tree | Recursive tree builder, EMV backwards induction, SVG diagram, optimal path | Done |
| M6 — Cross-cutting | CORS, Swagger/OpenAPI, shared error components, `toFixed(2)` audit, Playwright E2E | Done |
| M7 — Persistence (future) | Save EOQ/Break-even/Queue sessions to PostgreSQL; session history list | Backlog |
| M8 — Auth (future) | User accounts, per-user session isolation | Backlog |
| M9 — Export (future) | PDF export of results; CSV export of Matrix Gains table | Backlog |
| M10 — Additional tools (future) | Linear Programming (simplex), PERT/CPM, Sensitivity Analysis | Backlog |
