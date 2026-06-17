# Test Plan — MarketingQuantitative v1.0

## Test Approach

| Layer | Tool | Scope |
|-------|------|-------|
| Unit (backend) | JUnit 5 + AssertJ | Service/calculation logic |
| Integration (backend) | Spring Boot Test + `@DataJpaTest` | Repository + DB |
| Contract (backend) | MockMvc / RestAssured | REST endpoint contracts |
| Frontend logic | Jest + React Testing Library | Calculation functions + components |
| E2E | Playwright | Happy paths |

Performance target: **p95 < 300 ms** for all calculation endpoints (NFR-01).

---

## Coverage Guardrails

These thresholds are **build-breaking** — a CI build must not pass if any threshold is breached.

### Backend — JaCoCo (Maven)

| Scope | Metric | Minimum |
|-------|--------|---------|
| `**/service/**` | Line coverage | **80%** |
| `**/controller/**` | Line coverage | **70%** |
| Overall project | Branch coverage | **70%** |

Enforce via `jacoco-maven-plugin` `<rules>` in `pom.xml`:

```xml
<plugin>
  <groupId>org.jacoco</groupId>
  <artifactId>jacoco-maven-plugin</artifactId>
  <version>0.8.12</version>
  <executions>
    <execution>
      <id>prepare-agent</id>
      <goals><goal>prepare-agent</goal></goals>
    </execution>
    <execution>
      <id>check</id>
      <phase>verify</phase>
      <goals><goal>check</goal></goals>
      <configuration>
        <rules>
          <rule>
            <element>PACKAGE</element>
            <includes>
              <include>**/service/**</include>
            </includes>
            <limits>
              <limit>
                <counter>LINE</counter>
                <value>COVEREDRATIO</value>
                <minimum>0.80</minimum>
              </limit>
            </limits>
          </rule>
          <rule>
            <element>PACKAGE</element>
            <includes>
              <include>**/controller/**</include>
            </includes>
            <limits>
              <limit>
                <counter>LINE</counter>
                <value>COVEREDRATIO</value>
                <minimum>0.70</minimum>
              </limit>
            </limits>
          </rule>
          <rule>
            <element>BUNDLE</element>
            <limits>
              <limit>
                <counter>BRANCH</counter>
                <value>COVEREDRATIO</value>
                <minimum>0.70</minimum>
              </limit>
            </limits>
          </rule>
        </rules>
      </configuration>
    </execution>
  </executions>
</plugin>
```

Run locally: `mvn verify` — JaCoCo report generated at `target/site/jacoco/index.html`.

---

### Frontend — Jest (Next.js)

| Scope | Metric | Minimum |
|-------|--------|---------|
| `lib/**` / `utils/**` (calculation logic) | Line coverage | **80%** |
| `components/**` | Line coverage | **70%** |
| Overall | Branch coverage | **70%** |

Enforce via `jest.config.ts`:

```ts
const config = {
  coverageThreshold: {
    './src/lib/': {
      lines: 80,
      branches: 70,
    },
    './src/components/': {
      lines: 70,
    },
    global: {
      branches: 70,
    },
  },
};
export default config;
```

Run locally: `npx jest --coverage` — fails the run if any threshold is not met.

---

## TC-01 — Matrix Gains

### Unit Tests (backend `MatrixGainsService`)

| ID | Input | Expected Output |
|----|-------|----------------|
| TC-01-U01 | 3×3 matrix `[[4,2,1],[3,5,2],[1,4,6]]` | maxi-max = row 2 (max=6), maxi-min = row 1 (min=2) |
| TC-01-U02 | 1×1 matrix `[[7]]` | maxi-max = 7, maxi-min = 7 |
| TC-01-U03 | Matrix with negative values `[[-1,-2],[-3,-4]]` | maxi-max = -1 (row 0), maxi-min = -2 (row 0) |
| TC-01-U04 | Two strategies with equal maxi-max | Both strategies flagged as optimal |

### Validation Tests

| ID | Scenario | Expected Error |
|----|----------|---------------|
| TC-01-V01 | Empty matrix (no rows) | 400 — "at least one strategy required" |
| TC-01-V02 | Row with no columns | 400 — "at least one scenario required" |
| TC-01-V03 | Non-numeric cell value | 400 — validation error on cell value |

### Frontend Tests

| ID | Action | Expected |
|----|--------|---------|
| TC-01-F01 | Add row → add column → enter values → click Calculate | Result row appears at bottom of table |
| TC-01-F02 | Optimal strategy cell is highlighted | Visual highlight present |
| TC-01-F03 | Change a value → click Calculate again | Results update without page reload |

---

## TC-02 — Economic Order Quantity

### Unit Tests (backend `EoqService`)

| ID | Input | Expected Output |
|----|-------|----------------|
| TC-02-U01 | D=1000, S=50, C=10, I=0.2 | EOQ = 223.61, orders/year = 4.47, cycle = 81.65 days |
| TC-02-U02 | D=500, S=100, C=5, I=0.1 | EOQ = 447.21 |
| TC-02-U03 | All inputs = 1 | EOQ = √2 ≈ 1.41 |

### Validation Tests

| ID | Scenario | Expected Error |
|----|----------|---------------|
| TC-02-V01 | D = 0 | 400 — "demand must be positive" |
| TC-02-V02 | I = 0 | 400 — "holding rate must be positive" |
| TC-02-V03 | Negative unit cost | 400 — "cost must be positive" |

### Frontend Tests

| ID | Action | Expected |
|----|--------|---------|
| TC-02-F01 | Fill valid form → Calculate | EOQ, orders/year, cycle time, total cost displayed with 2 decimal places |
| TC-02-F02 | Leave a field blank → Calculate | Inline error on blank field |
| TC-02-F03 | Enter I = 0 | Inline error, no calculation runs |

---

## TC-03 — Rentability Point (Break-even)

### Unit Tests (backend `BreakevenService`)

| ID | Input | Expected Output |
|----|-------|----------------|
| TC-03-U01 | CF=10000, CVu=5, P=15 | Qty = 1000, Revenue = 15000.00 |
| TC-03-U02 | CF=0, CVu=5, P=10 | Qty = 0, Revenue = 0.00 |
| TC-03-U03 | CF=5000, CVu=8, P=10 | Qty = 2500, Revenue = 25000.00 |

### Validation Tests

| ID | Scenario | Expected Error |
|----|----------|---------------|
| TC-03-V01 | P = CVu (zero margin) | 400 — "price must be greater than variable cost" |
| TC-03-V02 | P < CVu | 400 — "price must be greater than variable cost" |
| TC-03-V03 | Negative fixed costs | 400 — "fixed costs must be ≥ 0" |

### Frontend Tests

| ID | Action | Expected |
|----|--------|---------|
| TC-03-F01 | Valid inputs → Calculate | Break-even qty and revenue displayed; chart rendered |
| TC-03-F02 | P ≤ CVu | Inline error; chart not rendered |
| TC-03-F03 | Break-even point visible on chart | Revenue and cost lines intersect at computed quantity |

---

## TC-04 — Attention Queue (M/M/s)

### Unit Tests (backend `QueueService`)

| ID | Input | Expected Output (approx) |
|----|-------|--------------------------|
| TC-04-U01 | λ=2, μ=3, s=1 | ρ=0.67, Lq≈1.33, L≈2.00, Wq≈0.67, W≈1.00 |
| TC-04-U02 | λ=4, μ=3, s=2 | ρ=0.67, stable system |
| TC-04-U03 | λ=1, μ=10, s=1 | ρ=0.10, very short queue |

### Validation Tests

| ID | Scenario | Expected Error |
|----|----------|---------------|
| TC-04-V01 | sμ ≤ λ (unstable queue) | 400 — "system is unstable: total service rate must exceed arrival rate" |
| TC-04-V02 | s = 0 | 400 — "number of servers must be ≥ 1" |
| TC-04-V03 | λ = 0 | 400 — "arrival rate must be positive" |

### Frontend Tests

| ID | Action | Expected |
|----|--------|---------|
| TC-04-F01 | Valid λ, μ, s → Calculate | ρ, L, Lq, W, Wq displayed with 2 decimal places |
| TC-04-F02 | Input that makes queue unstable | Warning displayed; metrics not shown |
| TC-04-F03 | Increase s until queue stabilises | Warning clears; metrics appear |

---

## TC-05 — Decision Tree

### Unit Tests (backend `DecisionTreeService`)

| ID | Input | Expected Output |
|----|-------|----------------|
| TC-05-U01 | Chance node: branch A (p=0.6, val=100), branch B (p=0.4, val=50) | EMV = 80.00 |
| TC-05-U02 | Decision node choosing between EMV=80 and EMV=60 | Optimal = EMV=80 path |
| TC-05-U03 | Two-level tree with nested chance nodes | Correct backwards induction through levels |

### Validation Tests

| ID | Scenario | Expected Error |
|----|----------|---------------|
| TC-05-V01 | Chance node probabilities sum ≠ 1.0 | 400 — "probabilities must sum to 1.0" |
| TC-05-V02 | Probability < 0 or > 1 | 400 — "probability must be between 0 and 1" |
| TC-05-V03 | Tree has no terminal nodes | 400 — "tree must have at least one terminal value" |

### Frontend Tests

| ID | Action | Expected |
|----|--------|---------|
| TC-05-F01 | Add nodes → assign values → click Calculate | EMV shown on each node; optimal path highlighted |
| TC-05-F02 | Probabilities don't sum to 1 | Inline error on that chance node; Calculate blocked |
| TC-05-F03 | Modify a branch value → Calculate again | EMV recalculated; highlight updates |

---

## TC-06 — Non-Functional

| ID | Test | Method | Pass Criteria |
|----|------|--------|---------------|
| TC-06-NF01 | Response time for each `calculate` endpoint | Load test (single user, 50 requests) | p95 < 300 ms |
| TC-06-NF02 | Standalone frontend loads with no backend | Open `index.html` in browser with no server running | All 5 tools visible and functional |
| TC-06-NF03 | Numeric output format | Inspect all displayed numbers | All values show exactly 2 decimal places |
| TC-06-NF04 | Invalid JSON body to any endpoint | `POST` with malformed JSON | 400 returned, no 500 |
