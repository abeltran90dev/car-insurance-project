# Multi-country car insurance quote (CO / CL)

> Skeleton. Completed as the project is built.

A single Angular application that quotes car insurance for Colombia and Chile in a 3-step wizard (data form → plan list → summary and simulated payment). Every form field, plan and piece of copy is configured per country in Strapi 5.

Built with an AI-driven, spec-driven flow. See [FLOW.md](FLOW.md) and [CLAUDE.md](CLAUDE.md).

## How to run

Requirements: Docker with Docker Compose v2+. Nothing else is needed for the running app.

```bash
docker compose up --build
```

| URL | What |
|-----|------|
| http://localhost:4200 | Angular app (country picker at `/`, then `/co` or `/cl`) |
| http://localhost:1337/admin | Strapi admin |

- **Clean clone works as is.** No `.env` is required: the `cms` container generates its secrets on first start and keeps them in the `cms_data` volume. To override defaults, copy `.env.example` to `.env` (placeholders only).
- **Seed data** for Colombia (`CO`) and Chile (`CL`) is loaded on start (`SEED_ON_BOOT=true`): countries with copy and terms, form fields (plus one draft field per country), and plans (3 active, 1 inactive, 1 draft per country). All data is fictitious. Seeding is idempotent: restarts create no duplicates.
- **Public permissions** (read-only `find` on `country`, `form-field`, `plan`, `site-copy`) are granted automatically in Strapi `bootstrap` ([ADR-003](docs/adr/ADR-003-strapi-public-permissions-bootstrap.md)). No API token exists or is needed.
- **Strapi admin user:** create it by hand on the first visit to http://localhost:1337/admin. No admin credentials are stored in the repo.
- **Switch country:** pick it on `/`, or open `/co` or `/cl` directly. An unknown code (e.g. `/xx`) shows the not-found page.
- **Reset everything** (database, uploads, generated secrets): `docker compose down -v`.

### Local development (without Docker for the frontend)

```bash
docker compose up -d cms          # Strapi on :1337
cd frontend && npm ci && npm start # ng serve on :4200, proxies /api to :1337 (proxy.conf.json)
```

### Troubleshooting

- **`failed to execute bake` on Windows** (Docker Compose v5.x): a Buildx bake filesystem-entitlement check fails on drive-letter case. Run `export BUILDX_BAKE_ENTITLEMENTS_FS=0` (Git Bash) or `$env:BUILDX_BAKE_ENTITLEMENTS_FS=0` (PowerShell) before `docker compose up --build`.
- **Port in use:** stop whatever is on 4200 or 1337, or change the host port in `docker-compose.yml`.
- **curl and Strapi filters:** use `curl -g` so `[` `]` in query strings are not treated as globs.

## Repository layout

| Path | Contents |
|------|----------|
| `frontend/` | Angular 21 app (standalone, signals, Vitest, Playwright in `frontend/e2e/`) |
| `cms/` | Strapi 5 project: content model, bootstrap permissions and idempotent CO/CL seed |
| `docs/user-stories/` | Input user stories, verbatim |
| `docs/specs/` | One spec per story (source of truth) |
| `docs/adr/` | Architecture decision records (MADR) |
| `docs/reviews/` | Code review reports and their resolution |
| `docs/ai-sessions/` | Unedited exported agent sessions |
| `.claude/agents/` | Subagent definitions |
| `.claude/skills/` | Custom skills |

## Running tests

With the stack running (`docker compose up`):

| Suite | Command |
|-------|---------|
| Strapi public permissions (writes denied, reads OK, drafts hidden from app queries) | `cd cms && npm ci && npm run test:permissions` |
| Frontend unit (Vitest) | `cd frontend && npm ci && npm test` |
| Frontend e2e (Playwright) | `cd frontend && npx playwright install chromium && npm run e2e` (`E2E_BASE_URL` defaults to http://localhost:4200) |

## Multi-country strategy

TODO: summary and link to ADR-001.

## Security notes

TODO: Public role permissions and their justification; no tokens in the browser.

## Known risks

| Risk | Impact | Status | Proposed fix |
|------|--------|--------|--------------|
| Anonymous `GET /api/<type>?status=draft` returns **draft** entries (verified on Strapi 5.63): any Public `find` permission honors the `status` parameter. The app never sends it, so drafts never reach the UI, but a direct caller can read unpublished content. | Low: unpublished business content (fields, plans), no personal data. | Accepted for now (Andres Beltran, 2026-11-23, Phase 2 checkpoint). Fixed if time remains. | A global Strapi middleware that forces `status=published` on unauthenticated `/api` requests, plus a test in `cms/tests/` proving `?status=draft` returns no drafts. |
| Missing Strapi copy for `form.title`, `form.intro`, `form.empty` or `common.continue` renders empty text, and the missing-key warning is logged on every change-detection pass (REVIEW-US-01-F09). | Low: the seed defines all keys; affects only misconfigured content. | Accepted (Andres Beltran, 2026-11-23, HC3 US-01). | Technical fallbacks for those keys; warn once per key. |
| Plan prices are recomputed in the template on every change-detection pass; when the vehicle year is unavailable, the factor-1 warning (and any missing-copy warning) is logged repeatedly (REVIEW-US-02-F03). | Low: console noise only; prices are correct. | Accepted (Andres Beltran, 2026-11-23, HC3 US-02). | Compute priced plans once in a `computed`; warn once. |
| The plans step fetches `/form-fields` twice (guard + component), and if only `/form-fields` fails the whole plan list shows the error state instead of falling back to factor 1.00 (REVIEW-US-02-F04). | Low: rare failure case; "Reintentar" recovers. | Accepted (Andres Beltran, 2026-11-23, HC3 US-02). | Cache form fields per country and map a fields failure to "no vehicle year". |

## Manual checks (P2 without automated test)

| AC | How verified |
|----|--------------|
| US-01-AC-21 (small screens, 320 px) | Manually at HC4 in CO and CL (Andres Beltran, 2026-11-23). |
| US-02-AC-08 (single selection with keyboard) | Manually at HC4 (keyboard-only selection and continue), Andres Beltran, 2026-11-23. |
| US-02-AC-13 (price recalculated after editing step 1) | Manually at HC4 (vehicle year changed, prices updated), Andres Beltran, 2026-11-23. |
| US-02-AC-15 (error state with retry) | Manually at HC4 (CMS stopped, error shown, retry after restart loads plans), Andres Beltran, 2026-11-23. Unresolved-country retry also unit-tested (REVIEW-US-02-F01). |
| US-02-AC-14 (loading state) | Pending manual check. Live-region behavior unit-tested (REVIEW-US-02-F02). |
| US-02-AC-06 (price in country currency and format) | Pending manual check. |
| US-02-AC-07 (only the first recommended plan is highlighted) | Pending manual check. At HC4 the recommended flag was moved to another plan in Strapi and the app reflected it after reload. |
| US-02-AC-11 (selection kept on return and reload) | Pending manual check. |
| US-02-AC-20 (focus on arrival) | Pending manual check. |
| US-02-AC-21 (responsive layout) | Pending manual check. |

## Requirements not met

TODO: list any requirement from the assessment that is not met, and why.
