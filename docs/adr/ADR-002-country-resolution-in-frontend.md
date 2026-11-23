---
id: ADR-002
title: How the frontend resolves the current country at runtime
status: Accepted          # Proposed | Accepted | Superseded
date: 2026-11-23
deciders: Andres Beltran
related_specs: [SPEC-US-01, SPEC-US-02, SPEC-US-03]
supersedes:
superseded_by:
---

# ADR-002: How the frontend resolves the current country at runtime

## Context and problem statement

The single Angular build must know, on every screen, which country's content to load from Strapi (ADR-001), which sessionStorage slot to use (ADR-004), and how to format money and dates. The human decided the URL shape at HC1: route prefix `/co`, `/cl`, a country picker at `/`, and a not-found page for unknown codes (SPEC-US-01 GAP-01, GAP-20). The mechanism still needs a decision. How is the country code carried, how is an unknown code detected without a hard-coded list, how do lower-case routes map to upper-case Strapi codes, and how is "Strapi down" kept apart from "country does not exist"?

## Decision drivers

- One build; known countries come from Strapi, not from code (non-negotiable 1, SPEC-US-01 GAP-20).
- Deep-linkable and testable steps (`/cl/planes` in e2e), guards that redirect to the first incomplete step (SPEC-US-02 GAP-05, SPEC-US-03 GAP-05).
- US-01-AC-23: `/zz/datos` shows not-found **and makes no form-fields request**.
- Must work in `docker compose up` on `localhost`, with no DNS setup.
- Error and retry state when Strapi is unreachable (SPEC-US-01 GAP-11), never a false "not found".

## Considered options

1. **Route prefix `/:country/...`** (lower-case segment), validated against Strapi by a functional `canMatch` guard
2. **Subdomain per country** (`co.example.test`, `cl.example.test`)
3. **Selector plus state only** (country chosen on `/`, kept in a signal and sessionStorage; URLs `/datos`, `/planes`)
4. **Query parameter** (`/datos?pais=co`)

## Decision outcome

**Chosen option:** "Route prefix `/:country/...` with a `canMatch` guard", because it is the human's HC1 decision, it is deep-linkable and trivially testable, and it needs no infrastructure. Angular's `canMatch` gives exactly the required not-found behavior: when the guard rejects, the router tries the next matching route (verified), so the `**` not-found route renders and the step component, with its form-fields request, is never created.

### Mechanism

```
''                          → CountryPicker (lists GET /api/countries?sort=name:asc&pagination[pageSize]=100)
':country'  canMatch: [countryMatchGuard]
   ├─ 'datos'               → step 1
   ├─ 'planes'        canActivate: [step1ValidGuard]          → step 2
   ├─ 'resumen'       canActivate: [step1ValidGuard, planSelectedGuard] → step 3
   ├─ 'confirmacion'  canActivate: [confirmationInMemoryGuard] → confirmation
   └─ ''                    → redirectTo 'datos'
'**'                        → NotFound (copy from `site-copy`, ADR-001; link to '/')
```

`countryMatchGuard` (functional, async, in `core/`):

1. Reads the first URL segment. If it does not match `^[a-z]{2}$` after a case check, it returns `false` (not-found) with **no** Strapi call. Country codes are ISO 3166-1 alpha-2, so this also keeps junk out of the filter. An upper-case segment (`/CO/datos`) returns a `UrlTree` to the canonical lower-case URL.
2. Upper-cases the segment and asks `CountryContext.resolve('CO')`, which performs `GET /api/countries?filters[code][$eq]=CO&populate[0]=copy` (cached in memory for the session; 10 s timeout).
3. Outcomes:
   - exactly one entry → stores the `CountryConfig` in `CountryContext`, returns `true`;
   - 200 with zero entries → `false`, so `**` shows not-found and no other request is made (US-01-AC-23);
   - network error, HTTP error or timeout → `true`. The step then shows its error state with "Reintentar", which re-runs `CountryContext.resolve`. "Strapi down" is never reported as "country unknown".
4. Uses `$eq` on the upper-cased value, not `$eqi`. That keeps one canonical case in Strapi (`code` is stored upper case, ADR-001), and the lower/upper mapping lives in one function.

**Unknown country keeps the URL (human decision at HC2, Andres Beltran, 2026-11-23):** an unknown country shows the not-found page **in place**, keeping the URL the user typed (e.g. `/zz/datos` stays in the address bar). The guard returns `false` and the `**` route renders; it does not redirect to a separate `/not-found` URL.

Step guards are functional `CanActivateFn`s that return a `UrlTree` to the first incomplete step (verified pattern). They run after `canMatch`, so `CountryContext` is already resolved. Components read the country from `CountryContext` (a signal), not from parent route params, so the design does not depend on route parameter inheritance.

### Consequences

- **Positive:** Every step is bookmarkable and testable by URL (`/cl/planes` in Playwright). Guards and the not-found behavior are pure routing; a third country works as soon as its Strapi entry exists.
- **Positive:** One code path decides the case mapping (`segment.toUpperCase()` for Strapi, lower case for URLs) and the "unknown vs unavailable" distinction.
- **Positive:** Keeping the URL on not-found lets the user see and correct what they typed, and lets e2e assert the URL is unchanged.
- **Negative:** Opening any country route costs one extra Strapi request before the first render (cached afterwards). A slow Strapi delays navigation by up to the 10 s timeout. The loading indicator shows only once the step renders, so during that time the user sees the previous page or a blank outlet. Mitigation: a top-level navigation-pending indicator (router events).
- **Negative:** If Strapi is unreachable, `/zz/datos` shows the step's error state instead of not-found. That is acceptable and intended: we cannot know the country is unknown.
- **Negative:** The route words (`datos`, `planes`, `resumen`, `confirmacion`) are Spanish and hard-coded in the router. They are technical identifiers fixed by the approved specs, not editable copy. A non-Spanish country would still use these paths. Changing them later costs route and test changes only.
- **Negative (cost to reverse):** Moving to subdomains later changes `CountryContext`'s source only (hostname instead of segment), plus deployment and DNS work. The routes and guards would lose the prefix level.

### Confirmation

- E2E: US-01-AC-22 (picker lists Strapi countries), US-01-AC-23 (`/zz/datos` → not-found with the URL unchanged, assert no `/api/form-fields` request via request interception), US-02-AC-10 and US-03-AC-11 (guard redirects).
- Unit: `countryMatchGuard` with mocked responses for the three outcomes (found, empty, error) plus upper-case redirect and malformed segment.
- Review checklist: no country list or `'co'|'cl'` literal in routing code.

## Pros and cons of the options

### Route prefix + `canMatch` (chosen)

- Good, because it is deep-linkable, shareable, and each country/step is one URL in tests.
- Good, because `canMatch` rejection falls through to `**` with no step component created (US-01-AC-23).
- Good, because it needs no infrastructure; it works on `localhost:4200`.
- Bad, because there is an extra request before first render of a country route.
- Bad, because a user can edit the URL to another country mid-quote. That is handled by per-country state (ADR-004, SPEC-US-01 GAP-25).

### Subdomain per country

- Good, because the URLs are clean, and it is a common pattern for real multi-country sites (separate cookies/analytics per host).
- Good, because one build is still possible (read `location.hostname` at runtime).
- Bad, because it needs DNS or hosts-file entries and per-host CORS origins. `docker compose up` stops being one command for reviewers.
- Bad, because e2e tests need host mapping; the picker at `/` needs a separate "root" host.
- Bad, because sessionStorage is per origin, so cross-country isolation comes for free but the picker cannot see either state (not needed, but it complicates the "new quote" link).

### Selector plus state only

- Good, because it is the simplest router (`/datos`, `/planes`) with no country guard.
- Bad, because it is not deep-linkable: `/planes` opened in a new tab has no country. US-02-AC-10 and US-03-AC-11 would need a separate "no country" redirect.
- Bad, because the country is hidden state, so bugs where CO data is shown under CL are harder to see and to test.
- Bad, because it contradicts the human's HC1 decision (SPEC-US-01 GAP-01).

### Query parameter

- Good, because it is deep-linkable, with no infrastructure.
- Bad, because it is easy to lose on navigation: every link and `router.navigate` must carry `queryParamsHandling`, which is error-prone.
- Bad, because a query parameter reads as optional and filter-like, which is semantically wrong for a required scope, and guards must handle a missing parameter on every route.

## Links

- Specs: [SPEC-US-01](../specs/SPEC-US-01.md) (GAP-01, GAP-11, GAP-17, GAP-20; AC-22, AC-23), [SPEC-US-02](../specs/SPEC-US-02.md) (GAP-01, GAP-05; AC-10), [SPEC-US-03](../specs/SPEC-US-03.md) (GAP-01, GAP-05, GAP-22; AC-11, AC-18)
- Related ADRs: ADR-001 (country entity, `site-copy`), ADR-004 (state keyed by country)
- Sources (official docs, checked 2026-11-23):
  - https://angular.dev/guide/routing/route-guards (CanMatch rejection tries other routes; guards may return `UrlTree`/`RedirectCommand`; guards may return Promise/Observable)
  - https://angular.dev/guide/routing/define-routes (`:param` segments; `**` wildcard placed last)
  - https://angular.dev/guide/routing/read-route-state (`withComponentInputBinding`; not relied on for the parent param)
  - https://docs.strapi.io/cms/api/rest/filters (`$eq`, `$eqi`)
- Unverified: none of the routing facts above. `redirectTo` with an empty child path is standard Angular, but its exact form was not re-checked against the docs page.
