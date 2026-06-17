Use `Agents.MD` as source of truth

Do not guess commands.

Check `specs/` for intent.

## Active Technologies
- Java 21 (backend) · ES6+ Vanilla JS (frontend) + Spring Boot 3.3 · Spring Data JPA/Hibernate · Flyway · Jakarta Bean Validation (main)
- PostgreSQL 15+ (optional backend) · in-memory `state` object (frontend) (main)
- React 18 · Next.js 14 (App Router) · TypeScript (frontend framework)

- Java 21 (backend) · HTML5/CSS3/ES6+ vanilla JS (frontend) + Spring Boot 3.3 · Spring Data JPA/Hibernate · Flyway · (main)

## Project Structure

```text
specs/main/                              ← Feature planning artifacts
  plan.md · research.md · data-model.md · quickstart.md · contracts/rest-api.md
```

## Commands

```bash
# Start backend
mvn spring-boot:run

# Run backend tests
mvn test

# Run backend tests + coverage check (JaCoCo)
mvn verify

# Init database (first time)
psql -U postgres -c "CREATE DATABASE prixstrategie;"

# Add a Flyway migration
# Create: src/main/resources/db/migration/V{YYYYMMDD}{seq}__description.sql

# Start frontend (dev)
cd frontend && npm install && npm run dev

# Run frontend tests
cd frontend && npm test

# Run frontend tests + coverage
cd frontend && npm run test:coverage
```

## Code Style

- **Java**: Java 21 records for DTOs; `@Transactional` on service methods; Jakarta Bean Validation on all request bodies; standard Spring Boot conventions
- **TypeScript/React**: strict TypeScript; functional components only; no class components; `const` arrow functions; 2-space indent; `toFixed(2)` for monetary display
- **Next.js**: App Router (`app/` directory); Server Components by default, `"use client"` only when strictly needed (event handlers, hooks); `fetch` with `cache`/`revalidate` for data; no `getServerSideProps` / `getStaticProps`
- **State**: `useState` / `useReducer` for local UI state; no external state library unless complexity demands it; calculation inputs live in component state, results derived inline
- **Naming**: PascalCase components; camelCase functions/variables; kebab-case file names (`matrix-gains/page.tsx`)
- **SQL**: lowercase keywords; snake_case identifiers; explicit CHECK constraints for all business rules

## Recent Changes
- main: Added Java 21 (backend) · ES6+ Vanilla JS (frontend) + Spring Boot 3.3 · Spring Data JPA/Hibernate · Flyway · Jakarta Bean Validation

- main: Initial v1.0 plan — standalone HTML frontend + optional Spring Boot + PostgreSQL backend
