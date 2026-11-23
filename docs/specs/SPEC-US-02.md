---
id: SPEC-US-02
story: US-02
title: Plan list
status: Approved            # Draft | Approved — only the human approves
version: 3               # +1 on every change after an approval (see Changelog)
approved_by: Andres Beltran  # filled by the main session after APPROVED at HC1
approved_on: 2026-11-23  # YYYY-MM-DD
adrs: [ADR-001, ADR-002, ADR-003, ADR-004]
---

# SPEC-US-02 – Plan list

## Traceability

| Link | Reference |
|------|-----------|
| User story | [US-02](../user-stories/US-02.md) |
| Depends on | [SPEC-US-01](SPEC-US-01.md) (step 1 data, vehicle year, country entry, guards, wizard state) |
| Consumed by | SPEC-US-03 (selected plan, final price via the same pricing function) |
| ADRs | [ADR-001](../adr/ADR-001-multi-country-content-model.md), [ADR-002](../adr/ADR-002-country-resolution-in-frontend.md), [ADR-003](../adr/ADR-003-strapi-public-permissions-bootstrap.md), [ADR-004](../adr/ADR-004-wizard-state-in-browser.md) |
| Code | branch `feat/US-02-plan-list` (filled after implementation) |
| Tests | see [Test mapping](#9-test-mapping) |
| Review | [REVIEW-US-02](../reviews/REVIEW-US-02.md) (after review) |

## 1. Scope

- Wizard **step 2** at route `/{cc}/planes` (`/co/planes`, `/cl/planes`).
- Loads the published and active plans of the route's country from Strapi, in the configured order, with name, short description, coverages, benefits and price.
- Computes and displays a **simulated final price** ("precio estimado") from the plan's base price and the vehicle year entered in step 1, formatted in the country's currency and locale.
- Highlights the recommended plan; lets the user select exactly one plan (radio-group semantics) and continue to the summary (`/{cc}/resumen`).
- Handles loading, error (with retry) and empty states; persists the selection in the wizard state.

## 2. Gaps & resolutions

GAP-01..GAP-10: **Resolution: human decision (Andres Beltran)** (source: `docs/prompts/phase-1-prompt.md`, "Human decisions on known gaps").
GAP-11..GAP-27: **agent-found**, proposed by spec-writer in v1 and **confirmed as human decision (Andres Beltran)** at the HC1 review of v1 (2026-11-23). GAP-12, GAP-13, GAP-21 and GAP-26 were confirmed explicitly; the rest were accepted as proposed.

| ID | Gap (question the story does not answer) | Options | Resolution | Rationale |
|----|------------------------------------------|---------|------------|-----------|
| GAP-01 | How does the app know the country? | URL prefix / subdomain / selector in state | **Human decision (Andres Beltran):** route prefix `/co`, `/cl`; step 2 is `/{cc}/planes`. Root `/` is a country picker. Unknown code → not-found page with a link to the picker. Mechanism recorded in an ADR. | One build, deep-linkable, testable. |
| GAP-02 | Where does step 2 UI copy, currency and locale come from? | Frontend constants / Strapi per country | **Human decision (Andres Beltran):** Spanish UI copy served from Strapi per country; currency and number locale come from the country entry. Copy keys for this step: see §4.3. | Non-negotiables 1–2. |
| GAP-03 | Where is the selected plan stored; when cleared? | memory / sessionStorage / localStorage | **Human decision (Andres Beltran):** wizard state in `sessionStorage`, keyed by country; cleared after successful payment; switching country starts a new quote. | PII must not outlive the tab. |
| GAP-04 | Which async states must step 2 handle? | — | **Human decision (Andres Beltran):** loading, error with retry, and empty states are mandatory for every Strapi call. | Story AC "No plans" + robustness. |
| GAP-05 | What if the user deep-links to `/{cc}/planes` without step 1? | Show anyway / redirect | **Human decision (Andres Beltran):** a guard redirects to the first incomplete step (`/{cc}/datos`) when step 1 is not valid. | Price depends on step 1 data. |
| GAP-06 | Styling approach? | UI library / plain CSS | **Human decision (Andres Beltran):** plain CSS, no UI library, mobile-first, visible focus styles. | — |
| GAP-07 | What is the simulated price rule? | — | **Human decision (Andres Beltran):** `final = basePrice × ageFactor`; vehicle age 0–5 → 1.00, 6–10 → 1.15, 11–20 → 1.30; rounded to whole currency units. Shown in the UI as "precio estimado". | Story: "The rule is documented." |
| GAP-08 | How is the price formatted? | Manual / `Intl.NumberFormat` | **Human decision (Andres Beltran):** `Intl.NumberFormat(country.numberLocale, { style: 'currency', currency: country.currency, minimumFractionDigits: 0, maximumFractionDigits: 0 })` (`es-CO`/`COP`, `es-CL`/`CLP`). | COP has 2 ISO minor digits, so fraction digits must be forced to 0 explicitly. |
| GAP-09 | More than one plan flagged recommended? | All / first / none | **Human decision (Andres Beltran):** only the first by display order is highlighted. | Deterministic. |
| GAP-10 | How is "only one plan" enforced? | Checkboxes + logic / radio group | **Human decision (Andres Beltran):** radio-group semantics, keyboard accessible. | Native single choice. |
| GAP-11 | How is "vehicle age" computed, against which date, and what about `currentYear + 1`? | Calendar year diff / exact date | **Human decision (Andres Beltran)** (accepted as proposed): `vehicleAge = currentYear − vehicleYear`, `currentYear` from the browser's local date at render time. Age `−1` (next year's model) is clamped to `0` → factor 1.00. Step 1 validation (SPEC-US-01) guarantees `−1 ≤ age ≤ 20`; any other value means step 1 is invalid and the GAP-05 guard applies. | Matches the vehicle-year rule's runtime computation in SPEC-US-01. |
| GAP-12 | Fields are dynamic: which step 1 value is the "vehicle year"? | Fixed key in code / field with the `vehicleYear` validator / new Strapi flag | **Human decision (Andres Beltran)** (confirmed explicitly): the step 1 field whose Strapi validation uses the named validator `vehicleYear`. If no such field is configured (or the value is not an integer), `ageFactor = 1.00` and a console warning is logged. | Avoids hard-coding a field key; uses a rule SPEC-US-01 already defines. |
| GAP-13 | Where do the age factors live? | Code constant / Strapi per country | **Human decision (Andres Beltran)** (confirmed explicitly): the age factors stay in **frontend code**, as one documented constant in a single pure pricing function, same for CO and CL. This is a **simulated rating**, not country content; keeping it in code is a documented trade-off (moving it to Strapi is a later option). | Rule is fixed by GAP-07 and identical in both countries. |
| GAP-14 | Each plan has a `currency`; what if it differs from the country's currency? | Format with plan currency / country currency / exclude plan | **Human decision (Andres Beltran)** (accepted as proposed): format with the country's currency (GAP-08). A plan whose `currency` ≠ `country.currency` is **not shown** and a console warning is logged. | Avoids showing a CLP amount as COP. |
| GAP-15 | Plan with missing, zero, negative or non-numeric `basePrice`? | Show "—" / exclude | **Human decision (Andres Beltran)** (accepted as proposed): exclude the plan, log a console warning. If no plan remains, the empty state is shown. | Never display a wrong or zero price. |
| GAP-16 | Two plans with the same `order`? | Undefined / secondary sort | **Human decision (Andres Beltran)** (accepted as proposed): secondary sort by `name` ascending (done in the Strapi request). | Deterministic order for tests. |
| GAP-17 | What is persisted, and what if the persisted plan is no longer offered (unpublished/inactive) on return or reload? | Keep stale / clear | **Human decision (Andres Beltran)** (accepted as proposed): persist only the plan's `documentId`. On load, if it is not in the fetched list, the selection is cleared silently and nothing is preselected. | Minimal state; no stale prices. |
| GAP-18 | Continue button before a plan is selected? | Disabled / enabled + error message | **Human decision (Andres Beltran)** (accepted as proposed): "Continuar" is disabled until a plan is selected; "Volver" (to `/{cc}/datos`) is always available. | Consistent with US-03's disabled pay button. |
| GAP-19 | Is the price stored or recomputed if step 1 data changes? | Snapshot / recompute | **Human decision (Andres Beltran)** (accepted as proposed): recompute every time from current step 1 data and current plan data. No price is persisted. US-03 uses the same pricing function. | Single source of truth. |
| GAP-20 | How is CMS text rendered; empty coverages/benefits? | `innerHTML` / plain text | **Human decision (Andres Beltran)** (accepted as proposed): all plan text is plain-text interpolation (never `innerHTML`). A plan with no coverages (or no benefits) omits that list and its heading. | XSS safety; no empty headings. |
| GAP-21 | Slow Strapi: when does loading become an error? | No timeout / N seconds | **Human decision (Andres Beltran)** (confirmed explicitly): 10 s timeout → error state with retry (same value as SPEC-US-01; align if it differs). | Avoids infinite spinner. |
| GAP-22 | Public permissions for `plan`; proof writes are blocked? | — | **Human decision (Andres Beltran)** (accepted as proposed; status assertion updated at HC2): Public role gets only `find` on `plan` (granted in `bootstrap`); a test in US-02 proves anonymous `POST`/`PUT`/`DELETE` on `/api/plans` are denied with **401 or 403** (human decision at HC2, ADR-003). | Non-negotiable 4. ADR-003. |
| GAP-23 | Focus and announcements on step 2? | — | **Human decision (Andres Beltran)** (accepted as proposed): on arrival (after loading) focus moves to the step heading (`h1`, `tabindex="-1"`); loading/error/empty messages are in a polite live region. | Keyboard/screen-reader users know where they are. |
| GAP-24 | Layout on mobile vs desktop? | — | **Human decision (Andres Beltran)** (accepted as proposed): ≤ 480 px: one column of cards, no horizontal scroll, radio/card touch target ≥ 44×44 px. ≥ 1024 px: cards in a row/grid (up to 3 per row). Order is always the configured order. | Mobile-first. |
| GAP-25 | Show base price and factor breakdown, or only the final price? | Final only / breakdown | **Human decision (Andres Beltran)** (accepted as proposed): show only the final price, labelled "Precio estimado" plus a short note explaining it depends on vehicle age (copy from Strapi). | Story asks to document the rule, not to expose internals. |
| GAP-26 | Price period (per year / per month)? | Annual / monthly | **Human decision (Andres Beltran)** (confirmed explicitly): the price is the **annual** premium; the period suffix (e.g. "/año") is Strapi copy (`plans.pricePeriod`). | Story silent; copy keeps it configurable. |
| GAP-27 | More than 100 plans? | Paginate / cap | **Human decision (Andres Beltran)** (accepted as proposed): request `pagination[pageSize]=100`; more than 100 plans per country is out of scope. | Realistic catalogs are < 10 plans. |

### Open questions (need a human answer before approval)

None. All agent-found gaps (GAP-11..GAP-27) were resolved by human decision at the HC1 review of v1.

Pending verification (not a question, no decision needed): whether Strapi 5 REST returns `decimal` attributes (`basePrice`) as strings is **to be verified in Phase 2** (implementation). The mapping with `Number()` in §4.2 is safe either way.

### Decisions needed (ADR)

None open. Resolved by the ADRs accepted at HC2:

- **ADR-001 Multi-country content model** – `plan` → manyToOne `country`; step 2 UI copy (§4.3) stored on `country.copy` (`shared.copy-entry`, key convention `<area>.<camelCaseName>`).
- **ADR-002 Country resolution** – route prefix `/{cc}` (GAP-01).
- **ADR-003 Public permissions** – `find` on `plan` via bootstrap allow-list; anonymous writes denied with 401 or 403 (GAP-22).
- **ADR-004 Wizard state storage** – `sessionStorage`, keyed by country (GAP-03, GAP-17).

## 3. Country matrix (CO / CL)

All values below are **seed data** configured in Strapi, not code. Names and prices are fictitious.

| Aspect | Colombia (CO) | Chile (CL) |
|--------|---------------|------------|
| Route | `/co/planes` | `/cl/planes` |
| Currency / locale (country entry) | `COP` / `es-CO` | `CLP` / `es-CL` |
| Format example (`Intl`, 0 decimals) | `$ 1.250.000` | `$389.990` |
| Seed plans: published + active, in order | 1 "Plan Básico" 850000 · 2 "Plan Estándar" 1250000 (recommended) · 3 "Plan Premium" 1900000 | 1 "Plan Esencial" 259990 · 2 "Plan Full" 389990 (recommended) · 3 "Plan Full Plus" 549990 |
| Seed plans that must NOT appear | "Plan Antiguo" (published, `active=false`); "Plan Borrador" (draft only) | "Plan Antiguo" (published, `active=false`); "Plan Borrador" (draft only) |
| Coverages (seed examples) | "Responsabilidad civil", "Pérdida total por daños", "Hurto" | "Responsabilidad civil", "Daños propios", "Robo" |
| Benefits (seed examples) | "Grúa 24/7", "Vehículo de reemplazo" | "Asistencia en ruta", "Auto de reemplazo" |
| Step copy (seed) | "Elige tu plan", "Precio estimado", "/año" … | "Elige tu plan", "Precio estimado", "/año" … |

The pricing rule (GAP-07, GAP-11) is the same for both countries. The empty state (AC-04) is tested by mocking an empty response, not by a seed country.

## 4. Data contract with Strapi

### 4.1 Content types (ADR-001)

- `plan` (collection type, Draft & Publish on): `name` (string, required), `shortDescription` (text), `basePrice` (decimal, required), `currency` (string, e.g. `COP`), `order` (integer), `recommended` (boolean, default false), `active` (boolean, default true), `coverages` (component `plan.coverage`, repeatable), `benefits` (component `plan.benefit`, repeatable), `country` (relation manyToOne → `country`).
- `plan.coverage`, `plan.benefit` (components): `title` (string, required), `description` (text, optional).
- `country`: used for `currency`, `numberLocale` and UI copy (`copy`, component `shared.copy-entry`, repeatable); fetched as defined in SPEC-US-01 (not re-fetched by this step if already in memory).

### 4.2 Request

Country entry (shared with SPEC-US-01, ADR-001; only if not already in memory):

```
GET /api/countries
  ?filters[code][$eq]=CO
  &populate[0]=copy
```

Plans:

```
GET /api/plans
  ?filters[country][code][$eq]=CO
  &filters[active][$eq]=true
  &sort[0]=order:asc&sort[1]=name:asc
  &populate[0]=coverages&populate[1]=benefits
  &pagination[pageSize]=100
```

- No `status` param: REST returns published documents by default. Never `populate=*`. No auth header.
- `CO` is replaced by the route's country code in upper case.

Example response (fictitious, abbreviated):

```json
{
  "data": [
    {
      "id": 3,
      "documentId": "a1b2c3d4e5f6g7h8i9j0k1l2",
      "name": "Plan Estándar",
      "shortDescription": "Cobertura completa para tu día a día.",
      "basePrice": 1250000,
      "currency": "COP",
      "order": 2,
      "recommended": true,
      "active": true,
      "coverages": [{ "id": 11, "title": "Responsabilidad civil", "description": "Daños a terceros." }],
      "benefits": [{ "id": 21, "title": "Grúa 24/7", "description": null }]
    }
  ],
  "meta": { "pagination": { "page": 1, "pageSize": 100, "pageCount": 1, "total": 1 } }
}
```

Frontend model (after mapping; `basePrice` mapped with `Number()` because decimals may arrive as strings **[unverified – to be verified in Phase 2]**):

```ts
interface PlanItem { title: string; description: string | null; }
interface Plan {
  documentId: string;
  name: string;
  shortDescription: string | null;
  basePrice: number;
  currency: string;
  order: number;
  recommended: boolean;
  coverages: PlanItem[];
  benefits: PlanItem[];
}
// Pure function, reused by US-03:
// computeFinalPrice(basePrice: number, vehicleYear: number | null, today: Date): number
```

### 4.3 UI copy keys for step 2 (Spanish, per country, on `country.copy` per ADR-001; key convention `<area>.<camelCaseName>`)

`plans.title` ("Elige tu plan"), `plans.priceLabel` ("Precio estimado"), `plans.priceNote` ("Calculado según la antigüedad de tu vehículo"), `plans.pricePeriod` ("/año"), `plans.recommendedBadge` ("Recomendado"), `plans.coveragesHeading` ("Coberturas"), `plans.benefitsHeading` ("Beneficios"), `plans.empty` ("Por ahora no hay planes disponibles para tu país."), `plans.loading` ("Cargando planes…"), `plans.error` ("No pudimos cargar los planes."), `common.retry` ("Reintentar"), `common.continue` ("Continuar"), `common.back` ("Volver"). All values are seed examples. If country copy itself is unavailable, only the minimal technical fallback in the frontend is used (error + retry).

## 5. Validations

| Field / rule | Source | Rule (exact boundary) | Error message source | When shown |
|--------------|--------|-----------------------|----------------------|------------|
| Plan visible | Strapi query + code | published AND `active = true` AND `country.code = route cc` AND `currency = country.currency` AND `basePrice` finite and `> 0` | N/A (console warning for excluded plans) | On load |
| Age factor | Code (GAP-07, GAP-13) | `age = currentYear − vehicleYear`, clamp `< 0` to 0; `0 ≤ age ≤ 5` → 1.00; `6 ≤ age ≤ 10` → 1.15; `11 ≤ age ≤ 20` → 1.30 | N/A | On render |
| Rounding | Code | `Math.round(basePrice × factor)` (half up to whole units) | N/A | On render |
| Single selection | Code (radio group) | Exactly 0 or 1 plan selected | N/A | — |
| Continue enabled | Code | A plan from the current list is selected | N/A | Always |
| Step access | Guard | Step 1 valid (SPEC-US-01), else redirect to `/{cc}/datos` | N/A | On navigation |

## 6. UI states

| State | Trigger | What the user sees | Copy source |
|-------|---------|--------------------|-------------|
| Loading | Plans request in flight | `plans.loading` text in a polite live region; no plan cards; "Continuar" disabled | Strapi (country copy) |
| Empty | 200 response with 0 plans, or 0 plans left after GAP-14/15 exclusions | `plans.empty` message; no radio group; "Continuar" not shown; "Volver" available | Strapi |
| Error | Network error, 4xx/5xx, or 10 s timeout | `plans.error` + "Reintentar" button that repeats the request (back to Loading) | Strapi; technical fallback if copy unavailable |
| Success / default | ≥ 1 visible plan | Cards in configured order, each with name, short description, "Precio estimado" + formatted final price + period, coverages, benefits; first recommended plan has the `plans.recommendedBadge` badge and a distinct border; "Continuar" disabled until selection | Strapi |
| Selected | User selects a plan | Selected card shows checked radio and distinct selected style (not color only: check mark/border width); "Continuar" enabled | — |

## 7. Accessibility

- Plans form a `radiogroup` (native `<input type="radio">` with a shared `name`, inside a `<fieldset>` whose `<legend>` is `plans.title`). Each radio's accessible name includes the plan name; the price and, if applicable, the recommended badge are linked via `aria-describedby`.
- Keyboard: Tab enters the group; Arrow keys move and select; Space selects; Tab reaches "Continuar"; Enter/Space activates it. The whole step is completable without a mouse.
- The recommended distinction is not color only: badge text is visible and part of the description.
- Focus: after loading resolves, focus moves to the `h1` (`tabindex="-1"`). On error, the retry button is reachable by Tab; after retry succeeds, focus moves to the `h1`.
- Visible focus style on radios/cards and buttons (GAP-06).
- Loading/empty/error messages are announced via `aria-live="polite"`.

## 8. Acceptance criteria

**Priority tags.** Every AC carries a priority tag:

- **P1** – the original story ACs, plus derived ACs about validation, country filtering, security (including the proof that a public write is denied with 401 or 403) and double submit. Every P1 AC **must have an automated test** (unit or e2e) before HC4.
- **P2** – covered by an automated test if time allows; otherwise **verified manually** at HC4 and listed in the README as manually verified.

US-02 has no submit action (step 2 only navigates to the summary), so it has no double-submit AC; double submit is covered in SPEC-US-03.

```gherkin
# US-02-AC-01 — Plans for the country (original) [P1]
Scenario Outline: Only active and published plans for the country, in configured order
  Given I completed the step 1 form for country "<cc>" with seed data
  When I reach "/<cc>/planes"
  Then I see exactly the plans "<plans>" in this order
  And I do not see "Plan Antiguo" nor "Plan Borrador"
  Examples:
    | cc | plans                                         |
    | co | Plan Básico, Plan Estándar, Plan Premium      |
    | cl | Plan Esencial, Plan Full, Plan Full Plus      |

# US-02-AC-02 — Recommended plan (original) [P1]
Scenario: Recommended plan is visually distinguished
  Given "Plan Estándar" is marked as recommended in Strapi for CO
  When I view the plan list at "/co/planes"
  Then only the "Plan Estándar" card shows the badge with the text of "plans.recommendedBadge" ("Recomendado")
  And the badge is part of that radio's accessible description

# US-02-AC-03 — Plan selection (original) [P1]
Scenario: Selecting a plan marks it as chosen and allows continuing
  Given I am on "/co/planes" with no plan selected
  When I select "Plan Premium"
  Then the "Plan Premium" radio is checked and its card has the selected style
  And the "Continuar" button is enabled
  When I activate "Continuar"
  Then I am on "/co/resumen"

# US-02-AC-04 — No plans available (original) [P1]
Scenario: Empty state when the country has no active plans
  Given the plans request for CO returns an empty list
  When I reach "/co/planes"
  Then I see the "plans.empty" message ("Por ahora no hay planes disponibles para tu país.")
  And no plan radio and no "Continuar" button are shown
  And the "Volver" button is available

# US-02-AC-05 — Simulated final price by vehicle age (derived from GAP-07, GAP-11) [P1]
Scenario Outline: Final price = basePrice × age factor, rounded to whole units
  Given today is in year 2026
  And step 1 vehicle year is <year>
  When computeFinalPrice(<base>, <year>, today) runs
  Then the result is <final>
  Examples:
    | year | base   | final   |
    | 2027 | 850000 | 850000  |
    | 2021 | 850000 | 850000  |
    | 2020 | 850000 | 977500  |
    | 2016 | 850000 | 977500  |
    | 2015 | 850000 | 1105000 |
    | 2006 | 850000 | 1105000 |
    | 2020 | 33333  | 38333   |

# US-02-AC-06 — Price shown in country currency and format (derived from GAP-08, GAP-25, GAP-26) [P2]
Scenario Outline: Price formatted with the country's locale and currency
  Given today is in year 2026 and step 1 vehicle year is 2023 for country "<cc>"
  When I view "/<cc>/planes"
  Then the "<plan>" card shows the label "Precio estimado"
  And the price equals Intl.NumberFormat("<locale>", currency "<cur>", 0 fraction digits).format(<base>) followed by "/año"
  Examples:
    | cc | plan          | locale | cur | base    |
    | co | Plan Estándar | es-CO  | COP | 1250000 |
    | cl | Plan Full     | es-CL  | CLP | 389990  |

# US-02-AC-07 — Only the first recommended plan is highlighted (derived from GAP-09) [P2]
Scenario: Two plans flagged recommended
  Given the plans response for CO has "Plan Estándar" (order 2) and "Plan Premium" (order 3) both recommended
  When I view "/co/planes"
  Then only "Plan Estándar" shows the recommended badge

# US-02-AC-08 — Single selection with keyboard (derived from GAP-10) [P2]
Scenario: Keyboard-only single selection
  Given I am on "/co/planes" and focus is on the step heading
  When I press Tab to reach the plan group, then ArrowDown, then Space
  Then exactly one radio is checked
  When I press ArrowDown again
  Then the next plan is checked and the previous one is unchecked
  And I can reach and activate "Continuar" with Tab and Enter

# US-02-AC-09 — Continue disabled without selection (derived from GAP-18) [P1]
Scenario: Continue is disabled until a plan is selected
  Given I arrive at "/co/planes" for the first time in this quote
  Then no plan is selected
  And "Continuar" is disabled

# US-02-AC-10 — Guard without valid step 1 (derived from GAP-05) [P1]
Scenario: Deep link to plans without step 1 data
  Given a new browser tab with empty sessionStorage
  When I open "/cl/planes"
  Then I am redirected to "/cl/datos"
  And no plans request is made

# US-02-AC-11 — Selection kept when going back and on reload (derived from GAP-03, GAP-17) [P2]
Scenario: Selected plan is preselected on return
  Given I selected "Plan Full" on "/cl/planes"
  When I go back to "/cl/datos" and continue to "/cl/planes" again, or reload "/cl/planes"
  Then "Plan Full" is still selected
  And sessionStorage contains its documentId for country CL and no price

# US-02-AC-12 — Stale selection cleared (derived from GAP-17) [P1]
Scenario: Previously selected plan no longer offered
  Given sessionStorage for CO holds the documentId of a plan
  And the plans response for CO no longer contains that plan
  When I reach "/co/planes"
  Then no plan is selected and "Continuar" is disabled

# US-02-AC-13 — Price recalculated after editing step 1 (derived from GAP-19) [P2]
Scenario: Changing vehicle year updates the price
  Given today is in year 2026 and I am on "/co/planes" with vehicle year 2023
  And "Plan Básico" shows the format of 850000
  When I go back, change the vehicle year to 2012 and continue
  Then "Plan Básico" shows the format of 1105000

# US-02-AC-14 — Loading state (derived from GAP-04) [P2]
Scenario: Loading while plans are requested
  Given the plans request for CO is pending
  When I reach "/co/planes"
  Then I see the "plans.loading" text in a polite live region
  And no plan cards are shown

# US-02-AC-15 — Error state with retry (derived from GAP-04, GAP-21) [P2]
Scenario: Plans request fails and the user retries
  Given the first plans request for CO returns HTTP 500 (or does not answer within 10 s)
  When I reach "/co/planes"
  Then I see the "plans.error" message and a "Reintentar" button
  When the next request succeeds and I activate "Reintentar"
  Then the plan list is shown

# US-02-AC-16 — Invalid plans excluded (derived from GAP-14, GAP-15) [P1]
Scenario: Plans with wrong currency or invalid base price are hidden
  Given the plans response for CO contains "Plan X" with currency "CLP" and "Plan Y" with basePrice 0, plus "Plan Básico"
  When I reach "/co/planes"
  Then I see only "Plan Básico"
  And a console warning is logged for "Plan X" and "Plan Y"

# US-02-AC-17 — Missing vehicle year field (derived from GAP-12) [P1]
Scenario: No step 1 field uses the vehicleYear validator
  Given the CO form configuration has no field with validator "vehicleYear"
  When computeFinalPrice runs for basePrice 850000 with vehicleYear null
  Then the result is 850000
  And a console warning is logged

# US-02-AC-18 — CMS text rendered as plain text (derived from GAP-20) [P1]
Scenario: Markup in plan text is not interpreted
  Given the plans response for CO has a plan whose shortDescription is "<img src=x onerror=alert(1)>Texto"
  When I view "/co/planes"
  Then that literal text is visible on the card and no img element is created
  And a plan with an empty benefits list shows no "Beneficios" heading

# US-02-AC-19 — Public write to plans is refused (derived from GAP-22; ADR-003) [P1]
Scenario: Anonymous write to /api/plans is denied with 401 or 403
  Given Strapi is running with bootstrap permissions and no auth header is sent
  When I send POST /api/plans, and PUT and DELETE /api/plans/{documentId of a seed plan}
  Then each response status is 401 or 403
  And GET /api/plans returns 200

# US-02-AC-20 — Focus on arrival (derived from GAP-23) [P2]
Scenario: Focus moves to the step heading after loading
  Given I continue from "/co/datos" with valid data
  When the plan list has loaded
  Then the focused element is the h1 with the "plans.title" text

# US-02-AC-21 — Responsive layout (derived from GAP-24) [P2]
Scenario: Plan cards on mobile and desktop
  Given I am on "/co/planes" with 3 plans
  When the viewport is 375 px wide
  Then the cards are stacked in one column, there is no horizontal scroll, and each radio/card target is at least 44×44 px
  When the viewport is 1280 px wide
  Then the 3 cards are shown side by side in the configured order
```

## 9. Test mapping

P1 rows require an automated test. P2 rows: automated if time allows; otherwise verified manually at HC4 and listed in the README.

| AC ID | Priority | Test level | Test name (starts with AC ID) | Country | Notes |
|-------|----------|------------|-------------------------------|---------|-------|
| US-02-AC-01 | P1 | e2e | `US-02-AC-01 shows only active published plans in order` | CO, CL | Original. Seed data incl. inactive + draft plans (country filtering) |
| US-02-AC-02 | P1 | e2e | `US-02-AC-02 highlights the recommended plan` | CO, CL | Original |
| US-02-AC-03 | P1 | e2e | `US-02-AC-03 selects a plan and continues to summary` | CO, CL | Original |
| US-02-AC-04 | P1 | unit + e2e | `US-02-AC-04 shows empty state when no plans` | CO | Original. e2e with route mock |
| US-02-AC-05 | P1 | unit | `US-02-AC-05 computes final price by vehicle age` | n/a | Fixed clock |
| US-02-AC-06 | P2 | e2e | `US-02-AC-06 formats price in country currency` | CO, CL | Expected value built with Intl, not a literal (non-breaking spaces) |
| US-02-AC-07 | P2 | unit | `US-02-AC-07 highlights only first recommended plan` | n/a | |
| US-02-AC-08 | P2 | e2e | `US-02-AC-08 selects a single plan with keyboard only` | CO | |
| US-02-AC-09 | P1 | unit + e2e | `US-02-AC-09 disables continue until a plan is selected` | CO | Validation |
| US-02-AC-10 | P1 | e2e | `US-02-AC-10 redirects to step 1 without valid data` | CL | Validation (step access guard) |
| US-02-AC-11 | P2 | e2e | `US-02-AC-11 keeps selected plan on return and reload` | CL | |
| US-02-AC-12 | P1 | unit | `US-02-AC-12 clears selection of a plan no longer offered` | n/a | Validation (persisted selection against current list) |
| US-02-AC-13 | P2 | e2e | `US-02-AC-13 recalculates price after editing vehicle year` | CO | Fixed clock |
| US-02-AC-14 | P2 | unit | `US-02-AC-14 shows loading state` | n/a | |
| US-02-AC-15 | P2 | unit + e2e | `US-02-AC-15 shows error and retries` | CO | Timeout case in unit test with fake timers |
| US-02-AC-16 | P1 | unit | `US-02-AC-16 hides plans with wrong currency or invalid price` | n/a | Validation + country filtering (currency) |
| US-02-AC-17 | P1 | unit | `US-02-AC-17 uses factor 1 when vehicle year is missing` | n/a | Validation (pricing input) |
| US-02-AC-18 | P1 | unit | `US-02-AC-18 renders CMS text as plain text` | n/a | Security (XSS) |
| US-02-AC-19 | P1 | e2e (API) | `US-02-AC-19 public write to plans is denied with 401 or 403` | n/a | Security. Against running Strapi. Assertion: status ∈ {401, 403} (ADR-003, HC2) |
| US-02-AC-20 | P2 | e2e | `US-02-AC-20 moves focus to heading after loading` | CO | |
| US-02-AC-21 | P2 | e2e + manual | `US-02-AC-21 lays out plan cards on mobile and desktop` | CO | Manual visual check at HC4 |

## 10. Out of scope

- Plan comparison table, filters or search; plan detail page.
- Coverage amounts/deductibles (components have only `title` and `description`).
- Pricing factors other than vehicle age; per-country factor configuration (GAP-13).
- Pagination beyond 100 plans (GAP-27).
- Summary, terms, payment and quote number (US-03).
- Step 1 fields, validations and the country picker (US-01).

## Changelog

| Version | Date | Change | Reason / source | ACs affected | Approval (HC1) |
|---------|------|--------|-----------------|--------------|----------------|
| 1 | 2026-11-23 | Initial spec | US-02; human decisions in `docs/prompts/phase-1-prompt.md` | all | REJECTED – Andres Beltran – 2026-11-23 (add P1/P2 tags) |
| 2 | 2026-11-23 | Added P1/P2 priority tags to every AC and to the Test mapping (new Priority column), plus a P1/P2 definition note in §8. Recorded human confirmations: GAP-12, GAP-13 (age factors stay in frontend code as a simulated rating, documented trade-off), GAP-21 and GAP-26 (price is annual) confirmed explicitly; GAP-11..GAP-27 all marked "Human decision (Andres Beltran)". Open questions emptied. Decimal-as-string mapping noted as to be verified in Phase 2. No change to AC wording, data contract or behavior; AC-05 promoted to P1 at HC1 | HC1 rejection: priority tags + confirmations (Andres Beltran) | all (tags only; no behavior change) | APPROVED – Andres Beltran – 2026-11-23 |
| 3 | 2026-11-23 | §4.2: country request `GET /api/countries?filters[code][$eq]=CO&populate[0]=copy` added. §4.1/§4.3: copy stored on `country.copy` (`shared.copy-entry`); keys confirmed to follow `<area>.<camelCaseName>` (no renames needed). US-02-AC-19 (and GAP-22, §8 P1 note, Test mapping name): anonymous writes asserted as denied with 401 or 403 instead of exactly 403. Front matter `adrs:` filled; Traceability ADR links and "Decisions needed (ADR)" updated to resolved. No other behavior change; AC count (21) and P1/P2 tags unchanged | Alignment with accepted ADR-001..004 (HC2) | US-02-AC-19 | APPROVED – Andres Beltran – 2026-11-23 |
