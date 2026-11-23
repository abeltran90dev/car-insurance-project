---
id: ADR-003
title: Read-only public access to Strapi, granted automatically in bootstrap
status: Accepted          # Proposed | Accepted | Superseded
date: 2026-11-23
deciders: Andres Beltran
related_specs: [SPEC-US-01, SPEC-US-02, SPEC-US-03]
supersedes:
superseded_by:
---

# ADR-003: Read-only public access to Strapi, granted automatically in bootstrap

## Context and problem statement

The frontend is anonymous and read-only: quote and payment are simulated client-side (SPEC-US-03 GAP-10/GAP-12), so it never writes to Strapi. Strapi content types are private by default, and anonymous requests use the Public role. That role is configured only through the admin UI; setting permissions in code is **not documented** (verified). CLAUDE.md requires that `docker compose up` stays one command, that no write-capable token reaches the browser (non-negotiable 4), and that a test proves an anonymous write returns 403. The human has already chosen to set the permissions in `bootstrap`. This ADR records the alternatives, that choice, its risk, and the surrounding security rules (CORS, plain-text rendering). How do we give the browser exactly the read access it needs, reproducibly, without any credential in frontend code?

## Decision drivers

- No token with write permissions in the frontend, and in practice none at all (non-negotiable 4).
- `docker compose up` on a clean checkout yields a working app with no admin clicks (CLAUDE.md stack, DoD).
- Least privilege: `find` only on the types the app reads (SPEC-US-01 GAP-26, SPEC-US-02 GAP-22, SPEC-US-03 §4).
- Provable: anonymous writes are automatically shown to be denied, and reads return 200 (US-01-AC-15, US-02-AC-19, US-03-AC-22).
- Upgrade safety: Strapi releases often (5.62.0 at time of writing).
- XSS: CMS text is untrusted input to the SPA.

## Considered options

1. **Manual admin setup** (README step: Settings → Users & Permissions → Roles → Public, tick `find`)
2. **`strapi import` of an exported archive** containing the configuration
3. **Programmatic grant in `bootstrap` through an explicit allow-list** (uses internal Users & Permissions models)
4. **Read-only API token in the frontend** and Public role left closed

## Decision outcome

**Chosen option:** "Programmatic grant in `bootstrap` with an explicit allow-list" (human decision, recorded here), because it is the only option that keeps `docker compose up` a single command **and** keeps the browser free of any credential. `bootstrap` runs at every server start after Strapi is set up, with access to the `strapi` object (verified), so a fresh container always ends up with the same permissions.

### Rules

1. **One isolated function** `grantPublicReadPermissions(strapi)` in `cms/src/bootstrap/permissions.ts`, called from `bootstrap` **before** seeding. All internal API usage is in this one file.
2. **Explicit allow-list constant**, no loops over content types, no patterns:
   ```
   api::country.country.find
   api::form-field.form-field.find
   api::plan.plan.find
   api::site-copy.site-copy.find      // single type for picker/not-found copy (ADR-001)
   ```
   No `findOne`: every read in the specs is a filtered `find`. No `create`/`update`/`delete`, no upload, no extra users-permissions routes.
3. **Idempotent, grant-only (human decision at HC2, Andres Beltran, 2026-11-23):** it creates only missing permissions and logs what it granted. It **does not revoke** anything; an unexpected extra `api::*` permission on Public is logged as a warning rather than deleted, so a startup never destroys an admin's change silently. The denial tests are the guard against write exposure.
4. **Internal API, verified before writing:** the commonly used approach queries `plugin::users-permissions.role` (type `public`) and creates `plugin::users-permissions.permission` rows (`action` = the string above, linked to the role). This is **[unverified] and undocumented**. The implementer must first grant one permission in the admin UI, read it back with `strapi.db.query`, and match UIDs and action format exactly.
5. **No tokens in `frontend/`** of any type, including Strapi's pre-generated Read-only token. The frontend sends GET only, with no `Authorization` header.
6. **CORS:** `strapi::cors` with `origin: [env('FRONTEND_ORIGIN', 'http://localhost:4200')]` instead of the default `'*'` (default verified). CORS is defense in depth for browsers only; authorization is the Public role.
7. **CMS text is plain text:** Angular interpolation only. No `[innerHTML]`, no `bypassSecurityTrust*`. Terms use `white-space: pre-line` (SPEC-US-03 GAP-20). Validation `pattern` regexes from Strapi are compiled in a `try/catch` and invalid ones are ignored (SPEC-US-01 §5).
8. **Secrets** (`APP_KEYS`, `JWT_SECRET`, …) only in `.env`; `.env.example` holds placeholders (non-negotiable 7).
9. **"Denied" means 401 or 403 (human decision at HC2, Andres Beltran, 2026-11-23):** the denial tests accept either status for an anonymous write. The Strapi docs state 401 for unauthenticated requests, and the exact status Strapi returns for a Public-role write without permission is not documented. Both statuses prove the write was rejected. No spec change is made for this; the ACs' "returns 403" wording is read as "is denied (401 or 403)".

### Consequences

- **Positive:** `docker compose up` works from a clean checkout; reviewers and e2e need no admin login.
- **Positive:** The permission set is code-reviewed, in git, and identical in every environment. No credential is shipped to the browser.
- **Positive:** The allow-list is the single place to change when a content type is added, and it is easy to audit.
- **Negative:** It relies on **undocumented internal Users & Permissions models**. A Strapi upgrade can rename models, fields or action formats, and the function would then fail or, worse, silently grant nothing. Mitigation: the GET smoke test (200) detects "grants nothing"; the denial tests detect over-granting. After any Strapi upgrade, both must pass before merging.
- **Negative:** Grant-only means an admin who ticks `create` on Public in the admin UI keeps that permission until removed by hand. It is logged as a warning at startup, but not reverted.
- **Negative:** The business team cannot "turn off" public access to a type from the admin. Any removal is reverted on next restart. Changing access is a code change.
- **Negative:** Accepting 401 or 403 is slightly looser than a single exact status. A test cannot tell "no permission" apart from "not authenticated". Both mean the write was refused, which is what non-negotiable 4 requires; any 2xx (or other non-denial status) still fails the test.
- **Negative (cost to reverse):** Low. Deleting the function and documenting manual setup (option 1) is a small change; the permissions already granted in an existing DB stay.

### Confirmation

- **E2E (API, Playwright `request`, no auth header) against the running stack:**
  - `US-01-AC-15 public write to form-fields and countries returns 403`
  - `US-02-AC-19 public write to plans returns 403`
  - `US-03-AC-22 public write to countries returns 403`

  Each test sends `POST` to the collection, and `PUT`/`DELETE` to a seeded `documentId`, expecting a denial status (401 or 403), and `GET` expecting 200. `site-copy` (`PUT`/`DELETE /api/site-copy` → 401 or 403, `GET` → 200) is added to US-01-AC-15 through the spec change loop (ADR-001 follow-up).
- Unit (cms): the allow-list constant equals the four actions above.
- Review checklist: `grep -r "innerHTML\|bypassSecurityTrust\|Authorization\|Bearer" frontend/src` returns nothing; no `.env` committed; CORS origin is not `'*'`.

## Pros and cons of the options

### Manual admin setup

- Good, because it is the documented path, using only public, supported UI.
- Good, because it has zero upgrade risk.
- Bad, because `docker compose up` is no longer enough: every fresh volume needs an admin account plus clicks. E2E and the reviewer depend on someone having done it.
- Bad, because it is not reviewable or reproducible; drift between environments is invisible.

### `strapi import` of an exported archive

- Good, because it is a documented CLI, reproducible, and can carry content and config together.
- Bad, because import **deletes all existing data first** and requires identical schemas (skill §5, from the import/export docs). It is destructive on every run and fragile across schema changes.
- Bad, because the archive is a binary or opaque file in git, so permission changes cannot be reviewed in a diff.
- Bad, because it is **[unverified]** whether role permissions round-trip through export/import; admin users and API tokens do not.

### Programmatic grant in `bootstrap` (chosen)

- Good, because it is one command, reproducible, reviewable, and least privilege by allow-list.
- Good, because it runs on every start, so it self-heals a fresh container.
- Bad, because it uses an undocumented internal API, so there is upgrade risk (mitigated by isolation plus tests).
- Bad, because it is grant-only and does not enforce removal of extras.

### Read-only API token in the frontend

- Good, because it is a documented feature: the Read-only token type allows `find`/`findOne` only. No internal API is needed.
- Good, because the Public role stays fully closed.
- Bad, because the token is visible to every visitor in the JS bundle and network tab. It is a shared secret that is not secret, and it must be injected per environment, which pushes toward per-environment builds or runtime config.
- Bad, because a read-only token reads **all** content types, which is broader than a per-type allow-list.
- Bad, because creating the token is itself a manual admin step or another internal-API bootstrap, so the problem is not solved.
- Bad, because it goes against non-negotiable 4's intent ("public content is read through the Public role").

## Links

- Specs: [SPEC-US-01](../specs/SPEC-US-01.md) (GAP-26, AC-14, AC-15), [SPEC-US-02](../specs/SPEC-US-02.md) (GAP-20, GAP-22, AC-18, AC-19), [SPEC-US-03](../specs/SPEC-US-03.md) (GAP-12, GAP-20, AC-12, AC-22)
- Related ADRs: ADR-001 (content types in the allow-list, `site-copy`)
- Sources (official docs, checked 2026-11-23):
  - https://docs.strapi.io/cms/features/users-permissions (Public role configured in admin UI; no documented code path; requests without a token use the Public role; auth failures → 401)
  - https://docs.strapi.io/cms/configurations/functions (`bootstrap` runs at every server start, after setup, with the `strapi` object)
  - https://docs.strapi.io/cms/configurations/middlewares (`strapi::cors` options; default `origin: '*'`)
  - https://docs.strapi.io/cms/features/api-tokens (token types; via `strapi5-content-modeling` skill §7)
  - https://docs.strapi.io/cms/features/data-management/import (import deletes existing data; via skill §5)
- Unverified: internal model UIDs and action string format (verify on the running instance); whether export/import carries role permissions.
