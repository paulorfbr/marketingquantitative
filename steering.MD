# Steering — MarketingQuantitative

Guidelines for AI agents working in this repository.
These rules take precedence over any default assistant behaviour.


---


## Core principle

**Every claim about what the system does or should do must be backed by one of:**

1. **Code evidence** — an exact file path and, where possible, a line range (e.g. `frontend/src/lib/queue.ts:41-58`)
2. **Requirements evidence** — a requirement ID from `specs/main/requirements.MD` (FR-xx, NFR-xx) or a test ID from `specs/main/test.MD` (TC-xx)

If neither exists, the claim is speculation. Say so explicitly and ask the user to decide, rather than filling the gap yourself.


---


## What this means in practice

### When answering "what does the system do?"

- Read the relevant source file before answering.
- Quote the specific function, formula, or constant, and cite its file path.
- Do not paraphrase from memory — implementations drift; the file is the truth.

**Correct:**
> `calculateQueue()` in `frontend/src/lib/queue.ts:20-38` computes P₀ via the infinite-sum formula truncated at s, matching TC-04-U01 in `specs/main/test.MD`.

**Wrong:**
> The queue tool calculates all standard M/M/s metrics.


### When answering "should the system do X?"

- Check `specs/main/requirements.MD` first.
- If a matching FR/NFR exists, cite it by ID and implement exactly that — no more.
- If no matching requirement exists, say: "There is no requirement for X (checked FR-01 through FR-05, NFR-01 through NFR-07). Should I add one before implementing?"

**Correct:**
> NFR-04 requires `toFixed(2)` on all numeric outputs. The proposed change aligns with that requirement.

**Wrong:**
> I'll add currency formatting since that seems useful.


### When implementing a change

- Identify the requirement it satisfies (FR-xx or NFR-xx) before writing any code.
- If the change touches a calculation, also identify the test case (TC-xx) it must pass.
- Do not add validation, error handling, or formatting beyond what the requirement specifies.


### When a requirement is ambiguous or missing

- Do not guess intent. Quote the requirement verbatim and ask for clarification.
- Do not implement a "reasonable default" for unspecified behaviour.


---


## Prohibited behaviours

| # | Behaviour | Why |
|---|-----------|-----|
| P-01 | Adding features not traceable to an FR or user instruction | Scope creep; spec is the contract |
| P-02 | Changing a formula or algorithm without citing the source formula and the TC that validates it | Silent correctness regressions |
| P-03 | Adding comments that describe what the code does (vs. why it does something non-obvious) | Code style — see `CLAUDE.md` |
| P-04 | Removing or relaxing a Bean Validation annotation without citing a requirement that permits it | NFR-06 mandates validation on all request bodies |
| P-05 | Committing or logging credentials | AGENTS.md: "Never: Commit secrets" |
| P-06 | Skipping tests before reporting a task complete | AGENTS.md: "Always: run unit tests" |
| P-07 | Answering "does the system do X?" without reading the source file first | Staleness risk — memory diverges from code |
| P-08 | Introducing abstractions, helpers, or utilities not required by the current task | `CLAUDE.md` code style; premature abstraction |
| P-09 | Speculating about database schema without reading the Flyway migration | `src/main/resources/db/migration/` is the schema truth |
| P-10 | Modifying a Flyway migration file that has already been applied | Ask first — AGENTS.md: "Ask first: Migration changes" |


---


## Evidence reference map

| Question type | Primary source | Secondary source |
|---------------|---------------|-----------------|
| "What does tool X calculate?" | `frontend/src/lib/{tool}.ts` | `specs/main/test.MD` TC-xx |
| "What does the API accept/return?" | Controller + DTO in `src/main/java/.../` | `specs/contracts/rest-api.MD` |
| "What must the system do?" | `specs/main/requirements.MD` FR-xx | `PRD.MD` §4 Functional requirements |
| "What are the performance constraints?" | `specs/main/requirements.MD` NFR-01 | `specs/main/test.MD` TC-06-NF01 |
| "What is the data schema?" | `src/main/resources/db/migration/*.sql` | `PRD.MD` §7 Data model |
| "What are the validation rules?" | DTO annotations in `src/main/java/.../dto/` | `specs/main/requirements.MD` NFR-06 |
| "What is the UI layout?" | The client component in `frontend/src/components/{tool}/` | `docs/design/WIREFRAMES.md` |
| "What tasks remain?" | `specs/main/tasks.MD` | `PRD.MD` §10 Roadmap |
| "What are the business rules?" | `PRD.MD` §5 Business rules | Service layer validation code |


---


## Tone and output format

- Reply with code and requirement citations as primary content. Prose explanations are secondary.
- When writing code, default to no comments (see `CLAUDE.md`). Add a comment only when the WHY is non-obvious.
- When unsure: ask one specific question with the relevant requirement ID included in the question. Do not ask multiple open-ended questions.
- Do not summarise what was just done at the end of a response — the diff is visible.
