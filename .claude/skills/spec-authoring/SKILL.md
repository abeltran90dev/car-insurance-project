---
name: spec-authoring
description: Template, gap-detection checklist and versioning procedure for writing a verifiable spec (docs/specs/SPEC-US-XX.md) from a user story in this project. Use whenever creating or revising a spec (including changes to an approved spec), or when reviewing whether a spec is ready for HC1 approval.
---

# Spec authoring

A spec is the **source of truth** for one user story. Code and tests are derived from it. A good spec here:

- makes every acceptance criterion observable and testable;
- surfaces what the story leaves unsaid (gaps) and proposes a resolution for each;
- states CO vs CL behavior explicitly, as **data** from Strapi, never as code branches;
- defines the data contract with Strapi precisely enough to build seeds and mocks from it.

## Procedure

1. Read the story verbatim. Don't paraphrase the original ACs away.
2. Run the **gap-detection checklist** below, item by item. Record every hit as a `GAP-NN`.
3. Fill the **template** below, section by section. Sections that don't apply say `N/A – <reason>`; never delete a section.
4. Self-check against "Ready for HC1" at the end.

To **change** an existing spec, follow "Versioning and changelog" below instead of editing in place.

## Gap-detection checklist

For each item, ask the question against the story. Anything unanswered becomes a `GAP-NN` (question → options → proposed resolution → rationale).

**Country resolution**
- How does the app know the country (URL segment, subdomain, selector, browser locale)? Is it chosen by the user or fixed per entry point?
- What happens with an unknown or missing country? Can the country change mid-wizard, and what happens to entered data if it does?
- Which content varies per country: fields, options, validations, copy, currency, number/date format, terms?

**Validation details**
- For each business rule, the exact boundary: inclusive or exclusive? Measured against which date (today, in which timezone)? Example: "not more than 20 years old" means `year >= currentYear - 20`? "Legal age" means 18 in both CO and CL, configured or fixed?
- Format rules per document type (CO cédula: digits only, length range; CL RUT: check digit, accepted formats with or without dots and dash). Where does the rule live: a Strapi-configured regex, or a named validator in code selected by Strapi?
- Which validations can the business team configure (required, min/max, minLength/maxLength, pattern, custom named rules), and which are fixed in code?
- When are errors shown (on blur, on submit, on change)? Is there one message per field, or one per rule?

**Edge cases**
- Empty config (zero fields or zero plans), a misconfigured field (unknown type, select without options, duplicate order).
- Very long labels and option lists; special characters (ñ, accents); paste with spaces.
- Price edge cases: rounding, zero/negative adjustments, currency without decimals (CLP, COP).
- Double clicks, back/forward browser buttons, page reload in the middle of the wizard, deep link to step 2/3 without step 1 data.

**Persistence**
- What is persisted (form values, selected plan, country, step), where (sessionStorage/localStorage), for how long, and when is it cleared (after payment, on country change)?
- What if the Strapi config changes while persisted data exists (a field removed or added)?
- Is PII stored in the browser? Minimize it and justify it.

**Security**
- Only `find`/`findOne` on the Public role for content the app reads; no tokens in the browser.
- CMS-provided text rendered safely (no unsanitized `innerHTML`; if rich text is needed, how is it sanitized?).
- Document numbers masked where displayed; no PII in logs or URLs.
- If the story touches Strapi content the app reads, the spec includes (or references) an AC proving that a **public write returns 403** (Public role permissions are set automatically in `bootstrap`).

**Accessibility**
- Every field has a programmatic label; help and error text linked via `aria-describedby`; required state exposed.
- Focus on step change (where it moves); focus on first invalid field on submit; error announcement.
- Keyboard-only completion of the whole step, including selects, date inputs, checkboxes and plan cards.

**Responsive**
- Layout behavior at mobile (≤ 480px) and desktop widths; touch target sizes; long tables or plan cards on small screens.

**Error states**
- Strapi unreachable or slow (timeout), 4xx/5xx, partial data. What does the user see (in Spanish, from where if Strapi is down), and can they retry?
- Loading state for every remote call.

## Template

Copy this into `docs/specs/SPEC-US-XX.md`.

````markdown
---
id: SPEC-US-XX
story: US-XX
title: <story title>
status: Draft            # Draft | Approved — only the human approves
version: 1               # +1 on every change after an approval (see Changelog)
approved_by:             # "Andres Beltran", filled by the main session after APPROVED at HC1
approved_on:             # YYYY-MM-DD
adrs: []                 # e.g. [ADR-001]
---

# SPEC-US-XX – <title>

## Traceability

| Link | Reference |
|------|-----------|
| User story | [US-XX](../user-stories/US-XX.md) |
| ADRs | ADR-NNN … (or "none yet") |
| Code | branch `feat/US-XX-<slug>` (filled after implementation) |
| Tests | see [Test mapping](#test-mapping) |
| Review | [REVIEW-US-XX](../reviews/REVIEW-US-XX.md) (after review) |

## 1. Scope

What this story delivers, in 3–6 bullets. Which wizard step(s) it touches.

## 2. Gaps & resolutions

| ID | Gap (question the story does not answer) | Options | Proposed resolution | Rationale |
|----|------------------------------------------|---------|---------------------|-----------|
| GAP-01 | … | A / B | A | … |

### Open questions (need a human answer before approval)
- …

### Decisions needed (ADR)
- … (architectural decisions for the architect; leave empty if none)

## 3. Country matrix (CO / CL)

All values below are **seed data** configured in Strapi, not code.

| Aspect | Colombia (CO) | Chile (CL) |
|--------|---------------|------------|
| Identity document | Cédula de ciudadanía / extranjería | RUT |
| Vehicle identifier | Placa | Patente |
| Currency / format | COP, e.g. `$ 1.234.567` | CLP, e.g. `$1.234.567` |
| … | … | … |

## 4. Data contract with Strapi

Content types and components involved (names and attributes), the exact REST requests the frontend makes (path, `filters`, `populate`, `sort`, `status`), and an example response (fictitious). Follow the `strapi5-content-modeling` skill. Include the frontend TypeScript model the response is mapped to.

## 5. Validations

| Field / rule | Source (Strapi-configured or code) | Rule (exact boundary) | Error message source | When shown |
|--------------|------------------------------------|-----------------------|----------------------|------------|

## 6. UI states

| State | Trigger | What the user sees | Copy source |
|-------|---------|--------------------|-------------|
| Loading | … | … | … |
| Empty | … | … | … |
| Error | … | … | … |
| Success / default | … | … | … |

## 7. Accessibility

Concrete requirements for this story (labels, `aria-describedby`, focus moves, keyboard paths, announcements).

## 8. Acceptance criteria

Original story ACs first (in story order), then derived ACs. One scenario per ID.

```gherkin
# US-XX-AC-01 — <name> (original)
Scenario: …
  Given …
  When …
  Then …

# US-XX-AC-05 — <name> (derived from GAP-02)
Scenario: …
```

Rules: concrete values (from seed data) where useful; one behavior per scenario; each `Then` is observable in the UI or through an API call.

## 9. Test mapping

| AC ID | Test level (unit / e2e / manual) | Test name (starts with AC ID) | Country | Notes |
|-------|----------------------------------|-------------------------------|---------|-------|
| US-XX-AC-01 | e2e | `US-XX-AC-01 shows only CO fields in order` | CO, CL | |

## 10. Out of scope

- …

## Changelog

| Version | Date | Change | Reason / source | ACs affected | Approval (HC1) |
|---------|------|--------|-----------------|--------------|----------------|
| 1 | YYYY-MM-DD | Initial spec | US-XX | all | pending |
````

## Versioning and changelog

`version` starts at 1. The Changelog records every revision and every approval.

| Situation | `version` | `status` | Changelog |
|-----------|-----------|----------|-----------|
| First draft | 1 | Draft | Row "Initial spec", approval `pending` |
| Revised after an HC1 rejection (never approved yet) | unchanged | Draft | New row with the same version: "HC1 rejection: <reason>" and what changed |
| HC1 `APPROVED` | unchanged | Approved (set by the main session) | Main session fills that row's approval cell: `Approved – Andres Beltran – YYYY-MM-DD` |
| **Any change after approval** (new gap, wording, AC, data contract, a bug that proves the spec wrong) | **+1** | **Draft** (clear `approved_by` and `approved_on`) | New row: change, reason/source (`human`, `implementer`, `REVIEW-US-XX-FNN`, test-writer bug), ACs affected, approval `pending` |

Rules:
- An approved spec is never edited in place. Every change goes through this table and back through HC1.
- AC IDs are stable. New ACs take the next free number; removed ACs stay in the document, struck through and marked `(removed in vN)`; changed ACs say `(changed in vN)`.
- Update the Test mapping in the same revision. The test-writer and implementer use the Changelog to see what to redo.
- While the spec is `Draft`, the spec gate hook blocks code changes for that story. Finish the HC1 loop before going back to code.

## Ready for HC1 (self-check before handing over)

- [ ] Every story AC is present with an ID `US-XX-AC-NN`, and every derived AC references its `GAP-NN`.
- [ ] No AC uses untestable wording ("clear", "simple", "properly") without a measurable definition.
- [ ] Every checklist category was considered (hits recorded as gaps, or none found).
- [ ] The country matrix covers every aspect that differs, and all of it is Strapi data.
- [ ] The data contract lists exact requests and an example payload.
- [ ] Every AC appears in the test mapping.
- [ ] Open questions and ADR decisions are listed separately from resolved gaps.
- [ ] `status: Draft`; approval fields are empty.
- [ ] `version` and the Changelog are consistent (a new row for this revision, ACs affected listed).
