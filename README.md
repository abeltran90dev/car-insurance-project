# Multi-country car insurance quote (CO / CL)

A single Angular 21 application that quotes car insurance for **Colombia** and **Chile** in a 3-step wizard: policyholder and vehicle data → plan list → summary and simulated payment.
Every form field, validation message, plan, price and piece of copy is configured per country in **Strapi 5**. The same build serves both countries.
It was built with an AI-driven, spec-driven flow with human checkpoints, described in [FLOW.md](FLOW.md).

## Quick start

Requirements: Docker with Docker Compose v2+. Nothing else is needed to run the app.

```bash
docker compose up --build
```

The first build takes a few minutes. Strapi starts, grants the read-only public permissions, loads the CO and CL seed, and reports healthy. The frontend container starts after that.

**Windows note.** On Docker Compose v5 for Windows, the command fails with `failed to execute bake: exit status 1` when the shell's working directory has a **lowercase drive letter** (`c:\...`, which is the default in VS Code terminals). Buildx bake's filesystem-entitlement check compares paths case-sensitively. `COMPOSE_BAKE=false` does not help, because Compose v5 always builds through bake, and nothing in `docker-compose.yml` can change this. Use either of these:

```powershell
cd C:\path\to\car-insurance-project      # uppercase drive letter, then the plain command works
# or
$env:BUILDX_BAKE_ENTITLEMENTS_FS=0; docker compose up --build    # Git Bash: BUILDX_BAKE_ENTITLEMENTS_FS=0 docker compose up --build
```

Verified on 2026-11-23 (Docker 29.9.1, Compose v5.6.0). From `c:\` the build fails, and it succeeds with either workaround. A fresh `git clone` with empty volumes came up with `cms` healthy, the app answering on :4200 (`/api/countries` returned the seed) and the admin answering on :1337.

## URLs

| URL | What |
|-----|------|
| http://localhost:4200 | Angular app: country picker at `/`, then `/co` or `/cl` (steps `/{cc}/datos` → `/{cc}/planes` → `/{cc}/resumen` → `/{cc}/confirmacion`) |
| http://localhost:4200/api/… | Strapi REST API through the nginx proxy (same origin as the app) |
| http://localhost:1337/admin | Strapi admin |

If another process already answers on `localhost:4200` (for example an old `ng serve`), use `http://127.0.0.1:4200`.

## Creating the Strapi admin user

There are no admin credentials in the repo. On the first visit to http://localhost:1337/admin, Strapi shows a registration form. Create the admin with any name, email and password of your choice. The account is stored in the `cms_data` volume. To edit content, open **Content Manager**, change a field or plan, click **Publish**, and reload the app. Unpublished drafts never reach the app.

Other setup notes:

- **No `.env` is required.** The `cms` container generates its secrets on first start and keeps them in the `cms_data` volume. To override defaults, copy `.env.example` to `.env`. It contains placeholders only.
- **Seed data** (fictitious) loads on every start and is idempotent. Each country gets copy and terms, form fields (plus one draft field), and plans (3 active, 1 inactive, 1 draft).
- **Reset everything** (database, uploads, generated secrets, admin user): `docker compose down -v`.
- **Local frontend development:** `docker compose up -d cms`, then `cd frontend && npm ci && npm start` (`ng serve` on :4200, proxies `/api` to :1337).
- **curl and Strapi filters:** use `curl -g` so `[` and `]` in query strings are not treated as globs.

## Tests

Start the stack first (`docker compose up --build`).

| Suite | Command | What it covers |
|-------|---------|----------------|
| Strapi public permissions | `cd cms && npm ci && npm run test:permissions` | Public writes are denied (403), reads work, drafts are hidden from the app's queries |
| Frontend unit (Vitest) | `cd frontend && npm ci && npm test` | Validators (incl. RUT), form config mapping, pricing, guards, plan list, summary, payment states |
| Frontend e2e (Playwright) | `cd frontend && npx playwright install chromium && npm run e2e` (`E2E_BASE_URL` defaults to `http://localhost:4200`) | Every P1 AC per story in CO and CL, the full Colombia flow with keyboard only, and public-write 403/401 API tests |

Test names start with their acceptance criterion ID (e.g. `US-03-AC-20 …`), so `npx playwright test -g US-02-AC-05` runs one AC.

**Final run (2026-11-23, `chore/final-delivery`, Docker stack):**

| Suite | Result |
|-------|--------|
| Strapi public permissions | 16 passed, 0 failed (`node --test`) |
| Frontend unit (Vitest) | 12 files, 111 passed, 0 failed |
| Frontend e2e (Playwright, chromium) | 40 passed, 0 failed, 0 skipped (`E2E_BASE_URL=http://127.0.0.1:4200`) |

## Architecture in brief

```
Browser ──► nginx (frontend container :4200 → 80)
              ├─ /        Angular 21 SPA (standalone components, signals, @if/@for, no NgModules)
              └─ /api/*  ─► Strapi 5 (cms container :1337, SQLite on a volume)
                            Public role: find on country, form-field, plan, site-copy only
```

- **Frontend** (`frontend/`): one build. The route `/{cc}` selects the country, and the app fetches that country's config from `/api` (GET only, no auth header). The form is generated from `form-field` entries, with typed validations that map to Angular validators. Wizard state lives in `sessionStorage`, per tab and per country ([ADR-004](docs/adr/ADR-004-wizard-state-in-browser.md)).
- **Proxy:** nginx serves the SPA and proxies `/api/` to `cms:1337`, so the browser calls the same origin. No CORS is needed and the Strapi URL is not baked into the build.
- **CMS** (`cms/`): content types `country`, `form-field`, `plan`, `site-copy`. Public read permissions and the seed are applied in `bootstrap`. Draft & Publish is on for fields and plans.

## Multi-country strategy

Decision: [ADR-001](docs/adr/ADR-001-multi-country-content-model.md) (with country resolution in [ADR-002](docs/adr/ADR-002-country-resolution-in-frontend.md)). A `country` collection type (code, name, locale, currency, legal age, terms, UI copy) has `form-field` and `plan` entries linked to it. The app filters by country code (`filters[country][code][$eq]=CO`), so selecting a country is a **data filter, not a code branch**. Countries can differ in structure: Colombia has a document-type select plus a document number, Chile has a single RUT field. Labels, options, error messages, prices and terms all come from Strapi in Spanish.

**Adding a third country (e.g. Peru) without a rebuild:**
1. In the Strapi admin, create and publish a `country` entry (`code: PE`, name, `numberLocale`, `currency`, `legalAge`, terms, copy keys).
2. Create its `form-field` entries (key, label, type, required, options, validations with messages, order) and its `plan` entries (name, base price, coverages, recommended, active), linked to the country, and publish them.
3. The picker lists it and `/pe` works.

Code is needed only if the country requires a **validation type that doesn't exist yet**, such as a new national-ID checksum. The validation types are a closed, typed set in the frontend (`validators.ts`).

## Security summary

Decision: [ADR-003](docs/adr/ADR-003-strapi-public-permissions-bootstrap.md).
- **No token in the browser.** The app reads public content through Strapi's Public role. No API token exists, and none is needed.
- **Minimal Public role.** It grants only `find` on `country`, `form-field`, `plan` and `site-copy`, set automatically in Strapi `bootstrap` (reproducible, no manual clicking). It has no `findOne` and no create/update/delete. A test proves that a public write returns 403 (`cms/tests/public-permissions.test.mjs` plus the e2e API tests `US-01-AC-15`, `US-02-AC-19`, `US-03-AC-22`).
- **No secrets in the repo.** Strapi secrets are generated on first start and stored in a volume. `.env` is gitignored, and `.env.example` has placeholders only. The admin user is created by hand.
- **CMS content is rendered as text** (no `innerHTML`). Personal data stays in the tab's `sessionStorage`, is masked in the summary where configured (`maskInSummary`), is cleared after a successful payment, and is never logged.
- **Fictitious data only** in seeds and tests (e.g. `1111111111`, `11.111.111-1`, `example.test`).
- Known gap: anonymous `?status=draft` requests can read drafts (see "Requirements not met").

## Simulated pricing rule

Price shown = **round(plan base price × vehicle-age factor)**, in the country's currency and number format.
- The base price per plan and country comes from Strapi.
- The vehicle age is the current year minus the vehicle year entered in step 1. The factor is 1.00 for 0–5 years, 1.15 for 6–10 and 1.30 for 11–20 ([pricing.ts](frontend/src/app/features/plan-list/pricing.ts), SPEC-US-02 GAP-07/11/13).
- The factors are a single documented constant, the same for every country. This is a deliberate simplification, not country content. If the vehicle year is missing, the factor is 1.00 and a console warning is logged.

## Simulated payment

There is no payment gateway and no card data. After the user accepts the country's terms, **Pagar** opens a simulated gateway panel with two buttons: **Simular pago aprobado** and **Simular pago rechazado**. A 1.5 s "processing" state follows. Double submits are blocked.
- **Approved:** the quote data is cleared and the confirmation shows a quote number `COT-{CC}-{YYYYMMDD}-{6 random chars}`.
- **Rejected:** an error is shown and the user can retry.

## Repository map

| Path | Contents |
|------|----------|
| `frontend/` | Angular 21 app; unit specs next to the code, Playwright tests in `frontend/e2e/` |
| `cms/` | Strapi 5 project: content types, bootstrap permissions, idempotent CO/CL seed, `tests/` (permissions) |
| `docker-compose.yml` | The whole stack |
| [CLAUDE.md](CLAUDE.md) | Global context and rules for every agent |
| [FLOW.md](FLOW.md) | The agentic flow: diagram, steps, human control, lessons, traceability |
| [docs/user-stories/](docs/user-stories/) | Input user stories, verbatim |
| [docs/specs/](docs/specs/) | One approved, versioned spec per story |
| [docs/adr/](docs/adr/) | Architecture decision records (MADR), ADR-001..005 |
| [docs/reviews/](docs/reviews/) | Review inputs (`US-NN.diff`), review reports with human decisions, the delivery audit |
| [docs/prompts/](docs/prompts/) | Phase prompts (drafted with the Claude.ai planning chat, final decisions by the human) |
| [docs/ai-sessions/](docs/ai-sessions/) | Unedited session exports (see its README for the raw-transcript exclusion) |
| [.claude/agents/](.claude/agents/) | Subagent definitions (spec-writer, architect, implementer, test-writer, reviewer) |
| [.claude/skills/](.claude/skills/) | Custom skills (spec-authoring, strapi5-content-modeling, angular-conventions) |
| [.claude/hooks/](.claude/hooks/) | Spec-gate hook (blocks app-code writes until the story's spec is approved) |

## Requirements not met or partially met

Source: [delivery audit](docs/reviews/AUDIT-DELIVERY.md) and the review reports. Each item has a human decision (Andres Beltran, 2026-11-23).

| Item | Status | Why / decision |
|------|--------|----------------|
| P2 acceptance criteria without an automated test | Partially met: checked by hand, not by tests | Scope decision for the same-day deadline: P1 ACs always have automated tests, P2 ACs have tests if time allows and are otherwise checked by hand. Some P2 ACs are still pending a manual check (table below). |
| Responsive layout (mobile and desktop) | Met by manual check only | Steps 1–3 checked at 320/360 px. Step 1 in CO and CL; steps 2 and 3 in CO only. There is no automated viewport test. |
| Anonymous `GET /api/<type>?status=draft` returns **draft** entries | Accepted risk | Strapi 5.63 honors `status` for any Public `find`. The app never sends it, so drafts never reach the UI, but a direct caller can read unpublished business content (no personal data). Proposed fix: a global Strapi middleware that forces `status=published` on unauthenticated `/api` requests, plus a test. |
| One-command start on Windows | Met, with a host note | `docker compose up --build` needs an uppercase drive letter or `BUILDX_BAKE_ENTITLEMENTS_FS=0` on Docker Compose v5 for Windows (see Quick start). |
| Accepted review findings | Accepted risks | Listed in "Known risks" below. Each one has a human decision in its review report. |
| REVIEW-US-03-F11 (new in the r2 re-review) | Not fixed, listed | Decision at the final checkpoint: new r2 findings are listed, not fixed. See "Known risks". |

### Known risks (accepted)

| Risk | Impact | Decision | Proposed fix |
|------|--------|----------|--------------|
| Drafts readable with `?status=draft` (see above) | Low: unpublished business content, no personal data | Accepted (Phase 2 checkpoint) | Middleware forcing `status=published` for anonymous requests, plus a test |
| Missing Strapi copy for `form.title`, `form.intro`, `form.empty` or `common.continue` renders empty text, and the missing-key warning is logged on every change detection ([REVIEW-US-01-F09](docs/reviews/REVIEW-US-01.md)) | Low: the seed defines all keys | Accepted (HC3 US-01) | Technical fallbacks for those keys; warn once per key |
| Plan prices recomputed in the template on every change detection, and the factor-1 warning repeats when the vehicle year is unavailable ([REVIEW-US-02-F03](docs/reviews/REVIEW-US-02.md)) | Low: console noise only, prices correct | Accepted (HC3 US-02) | Compute priced plans once in a `computed`; warn once |
| The plans step fetches `/form-fields` twice. If only that call fails, the plan list shows the error state instead of falling back to factor 1.00 ([REVIEW-US-02-F04](docs/reviews/REVIEW-US-02.md)) | Low: rare; "Reintentar" recovers | Accepted (HC3 US-02) | Cache form fields per country |
| With Strapi unreachable, `/{cc}/confirmacion` renders an empty page instead of redirecting to step 1 ([REVIEW-US-03-F06](docs/reviews/REVIEW-US-03.md)) | Low: Strapi-down only | Accepted (HC3 US-03) | Redirect to `/{cc}/datos` when the country is null |
| Duplicate copy lookup in the summary and confirmation; unused `StepPlaceholder` ([REVIEW-US-03-F07/F08](docs/reviews/REVIEW-US-03.md)) | Cosmetic | Accepted (HC3 US-03) | Use the shared `copy()` helper; delete the file |
| If navigation to the confirmation **fails with an error** (e.g. a lazy chunk fails to load), the summary is left blank with no message or retry, and the promise rejection is unhandled. Quote data is already cleared, so nothing leaks ([REVIEW-US-03-F11](docs/reviews/REVIEW-US-03.md#re-review-r2-2026-11-23)) | Low: network failure during one navigation | Listed, not fixed (final checkpoint) | `try/catch` around the navigation, then redirect to `/{cc}/datos`; unit tests for both fallback branches |

### Manual checks (P2 criteria without an automated test)

| AC | How verified |
|----|--------------|
| US-01-AC-21 (small screens, 320 px) | Manually at HC4 in CO and CL (Andres Beltran, 2026-11-23). |
| US-02-AC-08 (single selection with keyboard) | Manually at HC4 (keyboard-only selection and continue), Andres Beltran, 2026-11-23. |
| US-02-AC-13 (price recalculated after editing step 1) | Manually at HC4 (vehicle year changed, prices updated), Andres Beltran, 2026-11-23. |
| US-02-AC-15 (error state with retry) | Manually at HC4 (CMS stopped, error shown, retry after restart loads plans), Andres Beltran, 2026-11-23. The unresolved-country retry is also unit-tested (REVIEW-US-02-F01). |
| US-02-AC-21 (responsive layout) | Manually at 360 px in CO: one column, no horizontal scroll, all controls usable (Andres Beltran, 2026-11-23, final checkpoint). |
| US-03-AC-21 (summary fits a 360 px viewport) | Manually at 360 px in CO: one column, no horizontal scroll, all controls usable (Andres Beltran, 2026-11-23, final checkpoint). |
| US-03-AC-20 (payment with keyboard only) | Automated for CO: `US-01-AC-12 US-03-AC-20 completes the full Colombia flow with keyboard only`. CL verified manually at HC4 (full keyboard-only flow), Andres Beltran, 2026-11-23. |
| US-02-AC-14 (loading state) | Pending manual check. The live-region behavior is unit-tested (REVIEW-US-02-F02). |
| US-02-AC-06 (price in country currency and format) | Pending manual check. |
| US-02-AC-07 (only the first recommended plan is highlighted) | Pending manual check. At HC4 the recommended flag was moved to another plan in Strapi, and the app reflected it after reload. |
| US-02-AC-11 (selection kept on return and reload) | Pending manual check. |
| US-02-AC-20 (focus on arrival) | Pending manual check. |
| US-03-AC-13 (summary error state with retry when Strapi fails) | Pending manual check. Implemented. |
| US-03-AC-15 (selected plan no longer available shows "Cambiar plan") | Pending manual check. Implemented. |
| US-03-AC-16 (option labels, locale dates, empty optional fields omitted) | Pending manual check. Implemented. |
| US-03-AC-17 (terms acceptance resets on re-entry) | Pending manual check. Implemented. |
| US-03-AC-18 (confirmation without data redirects to step 1) | Pending manual check. Implemented. When Strapi is down the confirmation page renders empty (REVIEW-US-03-F06, accepted risk). |
| US-03-AC-19 (cancel closes the gateway and returns focus) | Pending manual check. Implemented. |

## How AI was used

The whole increment was produced by an agentic flow in **Claude Code** (main session and subagents on Claude Opus 5.5 / Claude Sonnet 5.5). Five subagents (spec-writer, architect, implementer, test-writer, reviewer) did the work. Three project skills and a spec-gate hook supported them, and four human checkpoints controlled them. A separate Claude.ai planning chat (Claude Opus 5.5) was used as an advisor. It drafted the phase prompts (versioned in `docs/prompts/`) and the first draft of SPEC-US-01, and proposed options at checkpoints. Its log is not included by the author's decision; it is available on request. All Claude Code sessions are included unedited in [docs/ai-sessions/](docs/ai-sessions/). All approvals, scope decisions and manual verification were done by the human. Details, evidence and lessons learned are in [FLOW.md](FLOW.md). No paid tool was replaced by a free alternative.
