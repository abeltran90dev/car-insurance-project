# Phase 2 — Infrastructure scaffold (Docker, Strapi, Angular shell)

Goal: `docker compose up` from a clean clone starts Strapi (with content model, seed data for CO and CL, and secured public permissions) and the Angular app shell. **No feature code** (no form engine, plan list or summary — those belong to US-01..03). Follow CLAUDE.md, the accepted ADRs (especially ADR-001, ADR-002, ADR-003, ADR-004) and the `strapi5-content-modeling` and `angular-conventions` skills. Deadline is today 23:59: keep it minimal and working.

## Branch

Create and work on `chore/scaffold-infra` (the spec-gate hook allows infrastructure there and blocks `frontend/src/app/features/`).

## 1. Strapi (`cms/`)

- Strapi 5, TypeScript, SQLite (file in a Docker volume; a database is not a requirement of the assessment, SQLite keeps the setup to one command). Verify the non-interactive `create-strapi` flags against docs.strapi.io before running.
- Content types and components **exactly as decided in ADR-001**, defined as versioned `schema.json` files (so the model is code, not clicks). Draft & Publish enabled where the specs require "published".
- Seed in `bootstrap` behind `SEED_ON_BOOT` (idempotent: running twice creates no duplicates). Seed content in Spanish, fictitious only:
  - Countries: Colombia (`co`, `es-CO`, `COP`) and Chile (`cl`, `es-CL`, `CLP`), with legal age 18.
  - Form fields per country covering every field type (text, number, select, date, checkbox) and every validator from the specs. CO: tipo de documento (CC/CE), número de documento, nombres, apellidos, fecha de nacimiento, correo, celular, ciudad (select), placa, marca (select), modelo, año, acepta tratamiento de datos (checkbox). CL: RUT, nombres, apellidos, fecha de nacimiento, correo, celular, comuna/ciudad (select), patente, marca (select), modelo, año. Different order between countries to prove ordering is data-driven.
  - Plans: 3 active per country (one recommended) + 1 inactive and 1 draft per country to prove filtering. Realistic fictitious prices in COP and CLP.
  - Terms and conditions text per country.
- Public permissions set automatically in `bootstrap` per ADR-003: read-only allow-list (`find`/`findOne` only on the content the app reads). No API tokens created. CORS restricted to the frontend origin.
- `.env.example` with placeholders. **No real or reusable secrets committed.** Strapi secrets (APP_KEYS, JWT secrets, etc.) are generated at container start if absent (entrypoint script) so `docker compose up` works from a clean clone.
- The first Strapi admin user is created by hand on first visit (documented in README); no admin credentials in the repo.

## 2. Angular (`frontend/`)

- Angular 21, standalone, no SSR, routing, strict TypeScript. Unit tests with the default v21 test runner (verify; Vitest expected). Playwright installed and configured in `frontend/e2e/` (one smoke test: the country picker loads).
- One build for both countries: the API base URL is **not** baked per country. In Docker, nginx serves the build and proxies `/api` to Strapi (same origin, no token, no CORS issue in production mode). In local dev, `proxy.conf.json` does the same.
- Shell only, under `src/app/core/` and `src/app/shared/`:
  - Routes per ADR-002 (`''` country picker, `:country` parent route with a guard that validates the country against Strapi, not-found page). Child routes for the steps point to placeholder components that will be replaced by features.
  - Typed read-only Strapi client service (GET only) with the loading/error/data pattern from the skill.
  - Country context (signal) resolved from the route, exposing locale, currency and copy.
  - Wizard state service skeleton persisted in `sessionStorage` per ADR-004 (keyed by country).
  - Base layout: header, step indicator (accessible, `aria-current="step"`), mobile-first CSS, visible focus styles.

## 3. Docker

- `docker-compose.yml` at repo root with `cms` and `frontend` services, healthcheck on `cms`, `frontend` depends on a healthy `cms`, named volume for SQLite and uploads.
- Ports: frontend `http://localhost:4200`, Strapi admin `http://localhost:1337/admin`.

## 4. Verification (run it, don't assume)

From a clean state (`docker compose down -v`), run `docker compose up --build` and verify, showing me the evidence:
1. Both containers healthy.
2. `GET /api/...` for each public content type returns the seeded CO and CL data; inactive and draft plans are not returned by the app's query.
3. Public `POST`, `PUT` and `DELETE` on each content type return 403 (add this as an automated test script, e.g. `cms/tests/public-permissions.test.*`, runnable with one npm script).
4. The Angular shell loads at :4200, `/co` and `/cl` resolve, `/xx` shows not-found.
5. Restarting the stack does not duplicate seed data.

## Human checkpoint — stop here

STOP and give me: what was built, the verification evidence, anything that deviated from the ADRs, and any skill content that turned out wrong (fix the skill and say so). Wait for my `APPROVED` or `REJECTED: <reason>`.

After `APPROVED`: update README "How to run" section, merge `chore/scaffold-infra` into `main` with a merge commit, push, and remind me to `/export`.
