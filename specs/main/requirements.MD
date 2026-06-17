# Requirements — MarketingQuantitative v1.0

## Functional Requirements

### FR-01 — Matrix Gains (Payoff Matrix)
| ID | Requirement |
|----|-------------|
| FR-01.1 | The system shall allow a user to create a named Gain Matrix session |
| FR-01.2 | The user shall be able to add rows (strategies) with a label |
| FR-01.3 | The user shall be able to add columns (competitive scenarios / states of nature) with a label |
| FR-01.4 | The user shall be able to input a numeric payoff value at each (strategy × scenario) cell |
| FR-01.5 | The system shall calculate the **maxi-max** (optimistic) criterion: max of row maxima |
| FR-01.6 | The system shall calculate the **maxi-min** (pessimistic) criterion: max of row minima |
| FR-01.7 | Results shall be displayed in a dedicated result row within the same table |
| FR-01.8 | The system shall highlight the optimal strategy for each criterion |

---

### FR-02 — Economic Order Quantity (Quantidade Econômica de Demanda)
| ID | Requirement |
|----|-------------|
| FR-02.1 | The user shall input annual demand (D), ordering cost per order (S), unit cost (C), and annual holding cost rate (I) |
| FR-02.2 | The system shall calculate EOQ = √(2DS / IC) |
| FR-02.3 | The system shall calculate the number of orders per year (D / EOQ) |
| FR-02.4 | The system shall calculate the cycle time in days (EOQ / D × 365) |
| FR-02.5 | The system shall calculate total annual cost (ordering cost + holding cost) |
| FR-02.6 | All calculated values shall be displayed with 2 decimal places |

---

### FR-03 — Rentability Point (Break-even Analysis)
| ID | Requirement |
|----|-------------|
| FR-03.1 | The user shall input fixed costs (CF), variable cost per unit (CVu), and selling price per unit (P) |
| FR-03.2 | The system shall validate that P > CVu (margin must be positive) |
| FR-03.3 | The system shall calculate break-even quantity = CF / (P − CVu) |
| FR-03.4 | The system shall calculate break-even revenue = break-even quantity × P |
| FR-03.5 | The system shall display a simple chart showing total revenue and total cost curves |
| FR-03.6 | The system shall indicate the break-even point on the chart |

---

### FR-04 — Attention Queue (Queueing Theory — M/M/s)
| ID | Requirement |
|----|-------------|
| FR-04.1 | The user shall input arrival rate (λ), service rate per server (μ), and number of servers (s) |
| FR-04.2 | The system shall validate that total service capacity (s × μ) > λ (stable queue condition) |
| FR-04.3 | The system shall calculate server utilization ρ = λ / (s × μ) |
| FR-04.4 | The system shall calculate average number of customers in the system (L) |
| FR-04.5 | The system shall calculate average number of customers waiting in queue (Lq) |
| FR-04.6 | The system shall calculate average time in system (W = L / λ) |
| FR-04.7 | The system shall calculate average waiting time in queue (Wq = Lq / λ) |
| FR-04.8 | The system shall display all metrics in a results panel |

---

### FR-05 — Decision Tree
| ID | Requirement |
|----|-------------|
| FR-05.1 | The user shall be able to add decision nodes (square) and chance nodes (circle) |
| FR-05.2 | The user shall be able to label each branch with a name and monetary value |
| FR-05.3 | The user shall be able to assign probabilities to branches of chance nodes (must sum to 1.0) |
| FR-05.4 | The system shall calculate Expected Monetary Value (EMV) at each chance node |
| FR-05.5 | The system shall propagate EMV backwards to identify the optimal decision path |
| FR-05.6 | The system shall highlight the optimal path visually |
| FR-05.7 | The system shall display the EMV of each node inline |

---

## Non-Functional Requirements

| ID | Requirement |
|----|-------------|
| NFR-01 | All calculation results must be displayed within **300 ms** of user triggering computation (p95) |
| NFR-02 | The frontend must function as a **standalone HTML page** with no server dependency |
| NFR-03 | The UI must be usable on desktop browsers (Chrome, Firefox, Edge, Safari — last 2 major versions) |
| NFR-04 | All monetary and numeric outputs must use **2 decimal places** (`toFixed(2)`) |
| NFR-05 | Input validation errors must be displayed inline, adjacent to the offending field |
| NFR-06 | The backend API (when enabled) must validate all request bodies via Jakarta Bean Validation |
| NFR-07 | The application must run on Java 21 and Spring Boot 3.3 |
