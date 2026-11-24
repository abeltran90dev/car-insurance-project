# REVIEW-US-01 – Policyholder and vehicle data form

| Field | Value |
|-------|-------|
| Story | [US-01](../user-stories/US-01.md) |
| Spec | [SPEC-US-01](../specs/SPEC-US-01.md) (version 2, Approved) |
| ADRs checked | ADR-001, ADR-002, ADR-003, ADR-004 |
| Branch | `feat/US-01-data-form` |
| Commit range | `a249095..5f9e972` |
| Review input | [US-01.diff](US-01.diff) (changed files + diff, written by the main session) |
| Test summary reviewed | unit: 62 passed / 0 failed · e2e: 7 passed / 0 failed (6 US-01 + smoke) |
| Reviewer | reviewer subagent (Claude Code, opus), read-only |
| Review date | 2026-11-23 |
| Human triage (HC3) | Andres Beltran, (pending) |

## Findings

Source: `review` (found by the reviewer) · `test-writer` (bug reported by the test-writer; every one must be logged here).
Severity: `blocker` (violates an AC, a non-negotiable or security; must fix) · `major` (likely bug or significant deviation) · `minor` (quality issue with low risk) · `nit` (style).

Human decision (HC3): `fix now` · `accept risk: <reason>` · `out of scope: <reason>`.
Status: `Open` · `Resolved` · `Accepted` · `Deferred`.

| ID | Source | Severity | File:line | Finding | Recommendation | Human decision | Resolution commit | Status |
|----|--------|----------|-----------|---------|----------------|----------------|-------------------|--------|
| REVIEW-US-01-F01 | review | major | `frontend/src/app/features/applicant-form/applicant-form.ts:145-153` (with `frontend/src/app/core/country-match-guard.ts:25-31`) | **Retry after a failed country lookup never activates the country's slot in `QuoteStore`. This can leak data across countries (GAP-09, GAP-25, US-01-AC-13, ADR-004).** When the lookup fails, the guard returns `true` without calling `store.activate(code)` (guard:31). `retry()` then calls only `this.context.resolve(code)` (line 152). After a successful retry, `country()` becomes the new country, but the store still points to whichever country was active before, or to `null`. Effects: (a) if another country was active (e.g. CO filled, then `/cl/datos` opened while Strapi was down, then Reintentar), `built` restores CO's stored values into the CL form (line 81 reads `store.values()`), and `submit()` writes the CL values into `quote:v1:CO` (line 177). (b) If no country was active (direct load while Strapi is down), `setApplicant` is a no-op (`quote-store.ts:66-71`). The user then navigates to `/planes` with nothing stored and data is silently lost. No test covers the retry-after-country-error path. | In `retry()`, when `resolve` returns `'found'`, call `store.activate(code)`. Alternatively, move activation into `CountryContext.resolve` or a shared helper so the guard and retry cannot drift apart. Add a component test: active CO slot with values, country lookup error for CL, retry succeeds, assert the CL form is empty and the submit writes `quote:v1:CL`. | | | Open |
| REVIEW-US-01-F02 | review | minor | `frontend/src/app/features/applicant-form/applicant-form.ts:151-153` | **Retry after a country-lookup error ignores the `'not-found'` outcome (GAP-20, US-01-AC-23, ADR-002).** If `/zz/datos` is opened while Strapi is down, the step shows the error state, as ADR-002 intends. Pressing Reintentar once Strapi is back makes `resolve` return `'not-found'`, but the result is discarded (`void`). The user then stays on a generic error with a retry button that can never succeed, instead of seeing the not-found page. | Handle the outcome. On `'not-found'`, re-run navigation to the same URL (e.g. `router.navigateByUrl(router.url, { onSameUrlNavigation: 'reload' })`) so `canMatch` falls through to `**`, or render the not-found content. Fold the fix into F01. | | | Open |
| REVIEW-US-01-F03 | review | minor | `frontend/src/app/features/applicant-form/applicant-form.ts:79`, `:127`; `applicant-form.html:31,43,...` | **An invalid field can show no error message and no `aria-invalid` (GAP-06 "user always sees a message", §7).** `genericError` defaults to `''` when the country has no `form.genericError` copy (line 79). The validator then reports a failure with `message: ''`. `errorFor` returns `''`, which is falsy, so the template hides the error paragraph and leaves `aria-invalid` and `aria-describedby` unset, because both depend on the message text and not on `control.invalid`. Submission is still blocked, but the user gets no explanation and assistive tech gets no invalid state. | Use a technical fallback for the last link of the chain (e.g. `country.copy['form.genericError'] ?? FALLBACK_COPY.error`) and log a missing-key warning. Drive `aria-invalid` from `control.invalid && (touched \|\| submitted)` rather than from the message text. | | | Open |
| REVIEW-US-01-F04 | review | minor | `frontend/src/app/features/applicant-form/applicant-form.ts:163-170` | **Focus moves before the error attributes are rendered (US-01-AC-11 "Focus and announcement on invalid submit", §7).** `submit()` calls `focus()` synchronously, before change detection adds `aria-invalid`, `aria-describedby` and the error `<p>`. Screen readers announce the field at focus time, so the first invalid field is read without its error. The unit test passes because it runs `detectChanges()` before it asserts. | Defer the focus until after render, e.g. `afterNextRender(() => …focus(), { injector })`, or render first and then focus. Lookup by id can use `getElementById` scoped to the host, or a `viewChildren` query. | | | Open |
| REVIEW-US-01-F05 | review | major | `docs/specs/SPEC-US-01.md:492` (no test in `frontend/e2e/us-01-data-form.spec.ts`) | **P1 US-01-AC-12 (keyboard-only completion) has no automated test.** The Definition of Done requires every AC to have a test whose name starts with its AC ID, and §8 says P1 means an automated test is required. The main session deferred it to the US-03 whole-wizard e2e. That matches the spec's test-mapping note, but US-01 cannot meet its DoD at HC4 without it unless the deferral is accepted explicitly. From the code, native controls and a native submit button are used and nothing has a `div` click handler, so the risk of a real keyboard trap is low. | Either add a short Playwright test now, `US-01-AC-12 completes step 1 with keyboard only` (Tab/type/Space/ArrowDown on the CO seed, Enter on Continuar, assert `/co/planes`), or record `accept risk` with the deferral to the US-03 e2e and verify manually at HC4. | | | Open |
| REVIEW-US-01-F06 | review | minor | `frontend/src/app/features/applicant-form/validators.ts:46` | **The RUT validator adds a 6–8 digit body-length rule that the spec does not define (deviation 2 declared by the implementer).** §5 and GAP-05 say: "Valid when the body is numeric and the check digit matches". `/^(\d{6,8})-?([\dK])$/` rejects 1–5 digit and 9+ digit bodies whose check digit is correct. All AC-09 examples still behave as specified. The bound does help disambiguate the optional dash, but it is an unapproved behavior change. CLAUDE.md requires spec changes to go through the spec change loop, not into code. Deviation 1 (stored as `body-DV`) matches §5 "no dots, uppercase K" and is not a finding. | Human decision: accept the bound and send it through the spec change loop (v3, §5 `rut` row), or relax the pattern to `^(\d+)-?([\dK])$` (keeping a sensible upper bound only if the spec says so). | | | Open |
| REVIEW-US-01-F07 | review | minor | `frontend/src/app/features/applicant-form/validators.ts:203-208` | **`isStep1Valid` (GAP-17, the shared guard predicate for US-02/US-03) does not check that a stored `select` value is still one of the published options.** The form drops such values on load (`applicant-form.ts` `initialValue`). The engine does not, so a stored `documentType`/`city`/`brand` whose option was removed in Strapi passes `isStep1Valid` even though step 1 would render it empty and block Continuar. The guard and the form then disagree under config drift, which is exactly the case GAP-17 was written for. | In `compileField`, add an implicit membership check for `select` fields (value must be in `field.options`), with the same message chain. Add a unit test. | | | Open |
| REVIEW-US-01-F08 | review | nit | `frontend/src/app/features/applicant-form/applicant-form.html:47` | **Each select has an extra empty first option labelled with the CMS placeholder (deviation 3 declared).** US-01-AC-06 says "I see exactly those options". The test codifies `real + 1` (`applicant-form.spec.ts`, AC-06 test). An empty option is a common, accessible pattern for required selects. When `placeholder` is null, the option is blank. | Accept as is, or mark the empty option `disabled` (and `hidden` if the human prefers) so it cannot be selected as a value. If accepted, add a one-line clarification to the spec at the next version bump. | | | Open |
| REVIEW-US-01-F09 | review | nit | `frontend/src/app/features/applicant-form/applicant-form.html:3,17,19,89`; `applicant-form.ts:105-112` | **Missing-copy fallbacks are empty strings for `form.title`, `form.empty`, `form.intro` and `common.continue`.** If `common.continue` is missing, the submit button has no accessible name. If `form.empty` is missing, the empty state is an empty paragraph, although §6 says "or generic fallback". `text()` also runs `console.warn` from the template, so it logs on every change-detection pass. | Give `common.continue` and `form.empty` technical fallbacks (as already done for loading, error and retry). Compute the copy lookups once with `computed`, or warn once per key. | | | Open |
| REVIEW-US-01-F10 | review | nit | `frontend/src/app/shared/country-picker.ts:26`; `frontend/e2e/us-01-data-form.spec.ts:59` | **Picker links point to `/{cc}`, not to `/{cc}/datos` as §6 states.** The `''` child redirect makes the user land on `/cl/datos`, so US-01-AC-22 is met. The e2e asserts `href="/cl"`, so it codifies the deviation. The picker code is pre-existing scaffold, outside this diff. | Change the link to `['/', segment, 'datos']` and update the assertion, or accept as is. | | | Open |

## Test-writer bugs

| Bug (as reported in the test run summary) | AC | Failing test | Finding ID |
|-------------------------------------------|----|--------------|------------|

None reported.

## Spec conformance

| AC ID | Implemented | Tested (test name) | Notes |
|-------|-------------|--------------------|-------|
| US-01-AC-01 | yes | `US-01-AC-01 renders only the country published fields in order`; `… different field set and order for CL`; `US-01-AC-01 sorts by order and breaks ties by key` | Country filter is in the query (`applicant-form-api.ts`); no `status` param. |
| US-01-AC-02 | yes | `US-01-AC-02 shows configured error message and blocks continue` (unit + component), plus blur/boundary tests | See F03 for the empty-message edge case. |
| US-01-AC-03 | yes | `US-01-AC-03 renders a newly published field without code changes` | Config only in memory; never in sessionStorage. |
| US-01-AC-04 | yes | `US-01-AC-04 keeps step 1 data when going back` (e2e) + unit part | |
| US-01-AC-05 | yes | `US-01-AC-05 hides unpublished fields (co/cl)` (e2e) | Seed has `draftOnlyField` per country (`cms/src/bootstrap/seed-data.ts:182,218`), so the test is not vacuous. |
| US-01-AC-06 | yes | `US-01-AC-06 renders select options from Strapi in order` | See F08 (extra empty option). |
| US-01-AC-07 | yes | `US-01-AC-07 …` (fixed clock, Feb 29, impossible date) | |
| US-01-AC-08 | yes | `US-01-AC-08 year %i -> %s`, clock-driven limits | |
| US-01-AC-09 | yes (with extra rule) | `US-01-AC-09 "%s" -> %s`, K case-insensitive | See F06. |
| US-01-AC-10 | yes | `US-01-AC-10 "%s" -> %s` | |
| US-01-AC-11 | yes | `US-01-AC-11 focuses first invalid field on continue`; labels/help/required test | See F04 (focus happens before attributes render). |
| US-01-AC-12 | likely (native controls) | none | See F05: P1 with no test, deferred to the US-03 e2e. |
| US-01-AC-13 | yes (normal path) | `US-01-AC-13 isolates wizard state per country` (2 tests) | Broken on the retry-after-error path: F01. |
| US-01-AC-14 | yes | `US-01-AC-14 renders CMS text as plain text` | Interpolation only; no `innerHTML` in the diff. |
| US-01-AC-15 | yes | `US-01-AC-15 public write to form-fields, countries and site-copy is denied` (e2e) | Asserts 401/403 for POST/PUT/DELETE and 200 for GET, as v2 requires. |
| US-01-AC-16 | yes | `US-01-AC-16 …` (mapper, engine, component) | Warnings carry the key and validator name only. |
| US-01-AC-17 (P2) | yes | `US-01-AC-17 shows error state and retries` | Timeout is from `StrapiClient` (10 s); not tested with fake timers (P2, acceptable). |
| US-01-AC-18 (P2) | yes | `US-01-AC-18 shows empty state when no fields` | See F09 (fallback). |
| US-01-AC-19 | yes | `US-01-AC-19 …` (unit + component) | See F03 when the generic copy itself is missing. |
| US-01-AC-20 (P2) | yes | `US-01-AC-20 discards stored value of removed field` | |
| US-01-AC-21 (P2) | yes (CSS single column, 44px targets) | none | Manual at HC4, as stated. |
| US-01-AC-22 | yes | `US-01-AC-22 lists countries from Strapi on the picker` (e2e) | See F10. |
| US-01-AC-23 | yes | `US-01-AC-23 shows not-found for unknown country code` (e2e) | Asserts no form-fields request. |
| US-01-AC-24 (P2) | yes | `US-01-AC-24 skips misconfigured fields with a warning` (mapper + component + engine) | |
| US-01-AC-25 (P2) | yes | `US-01-AC-25 shows loading state while configuration loads` | `aria-live="polite"` region present. |

## Summary

- **Overall:** The implementation is solid and closely follows SPEC-US-01 v2. Every field, label, option, rule and message comes from Strapi. The mapper and validators are pure functions with good tests, and the plain-text rendering and GET-only/no-token rules are respected. One real defect matters: Reintentar after a failed country lookup does not activate the country's store slot. That can restore and overwrite another country's data (F01). The other findings are small accessibility and robustness gaps, two declared deviations that need a human decision (F06, F08), and the P1 keyboard test that was deferred (F05).
- **Areas checked with no findings:**
  - Security: no `innerHTML`, no token, no write requests, and no PII in `console.warn` messages.
  - Non-negotiables: one build, no hard-coded field or country content, no NgModules (standalone, OnPush, signals, `@if`/`@for`/`@switch`), fictitious data in tests (`1111111111`, `11.111.111-1`, `example.test` email).
  - ADR-004: `sessionStorage` only via `QuoteStore`; writes only on a valid Continuar.
  - Code quality: typed reactive forms, no `any`, mapper is the only place that knows the raw Strapi shapes.
- **Declared deviations:**
  - (1) RUT stored as `body-DV`: conforms to §5.
  - (2) RUT body length: F06.
  - (3) Empty select option: F08.
  - (4) No fieldsets per `group`: conforms, since §4.1 says "may".
  - (5) Fallback error with retry on country-lookup failure: conforms to ADR-002 and §6, but see F01/F02 for the retry path.
  - (6) No lint script: not required by the spec or CLAUDE.md; no finding.
- **Process:**
  - Branch `feat/US-01-data-form` and spec SPEC-US-01 `status: Approved`, version 2 (the current approved version). ADR-001..004 are `Accepted`.
  - All five commits use the `US-01` scope. Feature code lives under `frontend/src/app/features/` and only on the `feat/` branch, so the commit range matches the branch rule.
  - The review input lists commits only in one-line form, so I could not verify the `Refs:` trailers. Please check them at HC3.
- **Re-review after fixes:** n/a (single review round).
