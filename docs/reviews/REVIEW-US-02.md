# REVIEW-US-02 – Plan list

| Field | Value |
|-------|-------|
| Story | [US-02](../user-stories/US-02.md) |
| Spec | [SPEC-US-02](../specs/SPEC-US-02.md) (version 3) |
| ADRs checked | ADR-001, ADR-002, ADR-003, ADR-004, ADR-005 |
| Branch | `feat/US-02-plan-list` |
| Commit range | `0027b69..6952188` |
| Review input | [US-02.diff](US-02.diff) (changed files + diff, written by the main session) |
| Test summary reviewed | unit: 91 passed / 0 failed · e2e: 19 passed / 0 failed (as reported by test-writer; not run by the reviewer) |
| Reviewer | reviewer subagent (Claude Code, opus), read-only |
| Review date | 2026-11-23 |
| Human triage (HC3) | Andres Beltran, 2026-11-23 |

## Findings

Source: `review` (found by the reviewer) · `test-writer` (bug reported by the test-writer; every one must be logged here).
Severity: `blocker` (violates an AC, a non-negotiable or security; must fix) · `major` (likely bug or significant deviation) · `minor` (quality issue with low risk) · `nit` (style).

Human decision (HC3): `fix now` · `accept risk: <reason>` · `out of scope: <reason>`.
Status: `Open` · `Resolved` · `Accepted` · `Deferred`.

| ID | Source | Severity | File:line | Finding | Recommendation | Human decision | Resolution commit | Status |
|----|--------|----------|-----------|---------|----------------|----------------|-------------------|--------|
| REVIEW-US-02-F01 | review | major | `frontend/src/app/features/plan-list/plan-list.ts:845-848`, `plan-list.html:6-8`, `plans-guard.ts:17-19` | **"Reintentar" does nothing when the country could not be resolved.** If Strapi is down on a deep link or reload of `/{cc}/planes`, `countryMatchGuard` returns `true` on `'error'`, `plansGuard` returns `true` because `country` is null, and the template shows the technical fallback with a retry button (`!country()` branch). `retry()` only calls `this.resource.reload()`. The resource's `params` is `this.country() ?? undefined`, so the resource is `idle` and `reload()` is a no-op. The country is never re-resolved, so the user is stuck until a manual page reload. This breaks the GAP-04 / §6 error state ("Reintentar" repeats the request). `ApplicantForm.retry()` (`applicant-form.ts:158-175`) already handles this case with `resolveAndActivate`. Related: because `plansGuard` let the navigation through with no country, a fixed retry would show plans without the GAP-05 step 1 check ever running. | In `PlanList.retry()`, when `country()` is null, resolve the country from the parent route param with `resolveAndActivate` (same as the applicant form). Then re-run navigation (`navigateByUrl(router.url, { onSameUrlNavigation: 'reload' })`) so `plansGuard` checks step 1 before plans are shown. Add a unit test for retry with no country. | fix now | | Open |
| REVIEW-US-02-F02 | review | minor | `frontend/src/app/features/plan-list/plan-list.html:9-11, 14-18`, `plan-list.html:14` | **Live-region semantics differ from §7 / GAP-23.** (a) The `aria-live="polite"` containers for loading and empty are created at the same moment as their text. Many screen readers don't announce a live region that is inserted already filled, so loading and empty may go unannounced. (b) The error message uses `role="alert"` (assertive), but §7 says loading/empty/error are announced "via `aria-live=\"polite\"`". Loading and empty are P2 (AC-14) and the error state is part of AC-15 (P2), so this is a behavior defect, not a missing test. | Render one persistent `<div aria-live="polite">` outside the `@if` chain, and put the loading, empty and error texts inside it. Use polite rather than `role="alert"` for the error, or record the deviation in the spec through the change loop. | fix now (overrides proposal): accessibility is an explicit requirement and the change is small; consistent with US-01 F04. One always-present polite live region for loading/empty/error | | Open |
| REVIEW-US-02-F03 | review | minor | `frontend/src/app/features/plan-list/plan-list.ts:836-839`, `pricing.ts:1003-1005`, `plan-list.ts:827-834` | **Console-warning flood.** `price(plan)` is a template method, so it runs on every change detection for every card. When the vehicle year is unavailable (GAP-12), `ageFactor` logs `console.warn` on every call: 3 plans × every CD cycle. `text()` also warns for a missing copy key on every call. Behavior is correct (AC-17 passes), but the logs are noisy and the repeated template work is wasted. | Compute prices once in a `computed` (for example `pricedPlans = computed(() => plans().map(p => ({...p, price: format(computeFinalPrice(...))})))`). Warn once about a missing year in the component (in the `vehicleYear` computed or an effect), not inside the pure function per call, or keep the warn in the pure function and call it once per render set. Warn once per missing copy key (memoize). | accept risk: console noise only, behavior is correct | | Accepted |
| REVIEW-US-02-F04 | review | minor | `frontend/src/app/features/plan-list/plan-list.ts:766-775`, `plans-guard.ts:968` | **Plan list depends on `/form-fields`, which is fetched twice.** The guard already fetches `/form-fields` to validate step 1. The component fetches it again in a `forkJoin` with `/plans` to find the `vehicleYear` key. Two effects: (1) a redundant request on every arrival; (2) if `/form-fields` fails while `/plans` succeeds, the whole step goes to the plans error state. GAP-12 intends only that a missing year field falls back to factor 1.00, not that the plan list becomes unavailable. | Cache the fields per country in `ApplicantFormApi` (for example `shareReplay` per code) so the guard and the component share one response. Optionally map a `/form-fields` failure in the component to `yearKey: null` (factor 1.00 + warning) instead of failing the plans resource. | accept risk: rare failure case, the user can retry | | Accepted |
| REVIEW-US-02-F05 | review | minor | `frontend/e2e/us-02-plan-list.spec.ts:95-112` | **AC-02 e2e test reads its expected value from the system under test.** The recommended plan name comes from an unsorted Strapi query (`filters[recommended][$eq]=true`, no `sort`) and the test takes `data[0]`. It doesn't assert the spec's concrete expectation (CO "Plan Estándar", CL "Plan Full"). If the seed ever had two recommended plans, `data[0]` might not be the first by `order` (GAP-09), and the test could pass or fail for the wrong reason. The test also doesn't check that the badge text comes from copy for the specific card beyond the regex. | Assert the seed's recommended plan by name, as the test already does for `SEED_PLANS` (for example `RECOMMENDED = { co: 'Plan Estándar', cl: 'Plan Full' }`), and drop the extra API call. | fix now: assert the recommended plan by name so the test does not trust the source it is testing | | Open |
| REVIEW-US-02-F06 | review | nit | `frontend/src/app/features/plan-list/plan-list.html:24` | Unused template variable `let i = $index` in the `@for`. Dead code. | Remove `; let i = $index`. | fix now: trivial cleanup | | Open |

## Test-writer bugs

| Bug (as reported in the test run summary) | AC | Failing test | Finding ID |
|-------------------------------------------|----|--------------|------------|
| None reported | | | |

None reported. The test-writer named one defect in its own test (a non-exact `getByRole` name match for "Plan Full" vs "Plan Full Plus") and fixed it in the test itself. It isn't a production bug, so no finding is logged. The fix is visible in `frontend/e2e/us-02-plan-list.spec.ts:111,121-122` (`exact: true`).

## Spec conformance

| AC ID | Implemented | Tested (test name) | Notes |
|-------|-------------|--------------------|-------|
| US-02-AC-01 (P1) | yes | `US-02-AC-01 shows only active published plans in order (co/cl)` | Query matches §4.2 exactly (filters, two-key sort, explicit populate, pageSize 100, no status, no auth). |
| US-02-AC-02 (P1) | yes | `US-02-AC-02 highlights the recommended plan (co/cl)` | Badge id is in the radio's `aria-describedby`. Test quality: F05. |
| US-02-AC-03 (P1) | yes | `US-02-AC-03 selects a plan and continues to summary (co/cl)`, `US-02-AC-03 selects a plan after completing the real step 1 form (co)` | Selected style is a 4px solid border plus a check mark, so not color only. |
| US-02-AC-04 (P1) | yes | `US-02-AC-04 shows empty state when no plans` (unit), `US-02-AC-04 shows empty state when no plans (co, mocked)` (e2e) | Live-region note: F02. |
| US-02-AC-05 (P1) | yes | `US-02-AC-05 computes final price by vehicle age (...)` ×7 | All 7 spec rows, fixed clock. |
| US-02-AC-06 (P2) | yes | not automated (P2) | `Intl.NumberFormat` with country locale and currency and 0/0 fraction digits; period and label from copy. |
| US-02-AC-07 (P2) | yes | not automated (P2) | `recommendedId` = first `recommended` in the ordered list. |
| US-02-AC-08 (P2) | yes | not automated (P2) | Native radios with a shared `name` inside a `fieldset`/`legend`. |
| US-02-AC-09 (P1) | yes | `US-02-AC-09 disables continue until a plan is selected` (unit + e2e) | |
| US-02-AC-10 (P1) | yes | `US-02-AC-10 redirects to step 1 without valid data (cl)` | Guard uses the step 1 engine (`isStep1Valid`). Gap when the country is unresolved: F01. |
| US-02-AC-11 (P2) | yes | not automated (P2) | Only `planDocumentId` is persisted (ADR-004); no price stored. |
| US-02-AC-12 (P1) | yes | `US-02-AC-12 clears selection of a plan no longer offered`, `US-02-AC-12 keeps selection of a plan that is still offered` | |
| US-02-AC-13 (P2) | yes | not automated (P2) | Price recomputed from `store.values()` on each render. |
| US-02-AC-14 (P2) | yes | not automated (P2) | See F02. |
| US-02-AC-15 (P2) | partial | not automated (P2) | Works when the country is resolved (10 s timeout in `StrapiClient`). Retry is dead when the country is unresolved: F01. |
| US-02-AC-16 (P1) | yes | `US-02-AC-16 hides plans with wrong currency or invalid price` (mapper + rendered) | `Number()` mapping covers decimals that arrive as strings. |
| US-02-AC-17 (P1) | yes | `US-02-AC-17 uses factor 1 when vehicle year is missing`, `US-02-AC-17 uses factor 1 when no step 1 field uses the vehicleYear validator` | Warning noise: F03. |
| US-02-AC-18 (P1) | yes | `US-02-AC-18 renders CMS text as plain text` | Interpolation only; no `innerHTML` anywhere in the diff. |
| US-02-AC-19 (P1) | yes | `US-02-AC-19 public write to plans is denied with 401 or 403` | Asserts status ∈ {401, 403} for POST/PUT/DELETE and 200 for GET (ADR-003). |
| US-02-AC-20 (P2) | yes | not automated (P2) | Focus goes to the `h1` (`tabindex="-1"`) after the first successful load and again after a successful retry. |
| US-02-AC-21 (P2) | yes | not automated (P2, manual at HC4) | Single column by default; 3 columns at ≥ 1024 px; radio label `min-height: 44px`. |

## Summary

- Overall: the implementation follows SPEC-US-02 v3 closely. The Strapi request matches §4.2. Plans, copy, currency and locale all come from Strapi. The pricing function is pure, documented, and keeps the factors in code as GAP-13 decided. Invalid plans are filtered with warnings. Every P1 AC has a test named with its ID. The one substantive defect is F01: a dead "Reintentar" in the unresolved-country error path, which also bypasses the step 1 guard once fixed naively. The other findings are minor robustness, a11y and test-quality points.
- Areas checked with no findings:
  - **ADRs & CLAUDE.md:** single build, no NgModules (standalone, OnPush, signals, built-in control flow), no auth header or write token (GET-only `StrapiClient`), wizard state limited to `planDocumentId` per ADR-004, `cms/` untouched.
  - **Security:** no `innerHTML`, no secrets, AC-19 test present.
  - **Fictitious data:** e2e step 1 values use `example.test` emails and placeholder documents and plates.
  - **Code quality:** no `any`.
  - **Process:** the branch `feat/US-02-plan-list` matches an Approved spec (v3), no scaffold-branch feature code, commit subjects follow Conventional Commits with the `US-02` scope. `Refs:` trailers can't be verified from the `--oneline` commit list in the review input.
- Re-review after fixes: pending.
