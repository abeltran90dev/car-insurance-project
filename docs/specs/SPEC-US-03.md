---
id: SPEC-US-03
story: US-03
title: Summary and payment
status: Approved            # Draft | Approved — only the human approves
version: 3
approved_by: Andres Beltran
approved_on: 2026-11-23
adrs: [ADR-001, ADR-002, ADR-003, ADR-004]
---

# SPEC-US-03 – Summary and payment

## Traceability

| Link | Reference |
|------|-----------|
| User story | [US-03](../user-stories/US-03.md) |
| Depends on | [SPEC-US-01](SPEC-US-01.md) (step 1 values, field config, incl. `maskInSummary`), [SPEC-US-02](SPEC-US-02.md) (selected plan, simulated final price) |
| ADRs | [ADR-001](../adr/ADR-001-multi-country-content-model.md), [ADR-002](../adr/ADR-002-country-resolution-in-frontend.md), [ADR-003](../adr/ADR-003-strapi-public-permissions-bootstrap.md), [ADR-004](../adr/ADR-004-wizard-state-in-browser.md) |
| Code | branch `feat/US-03-summary-payment` (filled after implementation) |
| Tests | see [Test mapping](#9-test-mapping) |
| Review | [REVIEW-US-03](../reviews/REVIEW-US-03.md) (after review) |

## 1. Scope

- Step 3 route `/{cc}/resumen` (`cc` = `co` | `cl`): summary of policyholder data, vehicle data and chosen plan with its final (estimated) price.
- Partial masking of the identity document number.
- "Editar datos" (→ step 1, data kept) and "Cambiar plan" (→ step 2, plan preselected).
- Per-country terms and conditions from Strapi; pay button gated by an acceptance checkbox.
- Simulated in-app payment gateway (approve / reject), processing lock, no double submit.
- Confirmation route `/{cc}/confirmacion` with a simulated quote number; wizard state cleared on success.

Consumes the wizard state produced by US-01 (form values keyed by Strapi field `key`) and US-02 (selected plan `documentId`). This spec does not assume specific field keys.

## 2. Gaps & resolutions

Gaps GAP-01..GAP-12 are **human decisions** from `docs/prompts/phase-1-prompt.md`. Gaps GAP-13..GAP-24 were **found by the agent**; at the v1 HC1 review the human answered OQ-1..OQ-6 explicitly (GAP-13, -14, -15, -16, -18, -22) and accepted the remaining agent-found gaps as proposed.

| ID | Gap | Options | Resolution | Rationale |
|----|-----|---------|------------|-----------|
| GAP-01 | How is the country known on the summary? | URL prefix / subdomain / state only | **Human decision (Andres Beltran):** route prefix `/co/resumen`, `/cl/resumen`, `/co/confirmacion`, `/cl/confirmacion`. Root `/` = country picker; unknown code → not-found page with link to picker. Mechanism recorded in ADR. | Deep-linkable, one build. |
| GAP-02 | Where does summary copy come from? | Hard-coded / Strapi | **Human decision (Andres Beltran):** all UI copy in Spanish from Strapi per country; currency and locale from the country entry. The Colombian document type is a `select` form-field configured in Strapi (SPEC-US-01 GAP-15), not an attribute of the country entry (changed in v3, ADR-001). | Non-negotiable 2 and language policy. |
| GAP-03 | Where is wizard state kept, when cleared? | memory / sessionStorage / localStorage | **Human decision (Andres Beltran):** `sessionStorage`, keyed by country; **cleared after successful payment**; switching country starts a new quote. | PII must not outlive the tab. |
| GAP-04 | Loading/error/empty for Strapi calls on step 3? | — | **Human decision (Andres Beltran):** mandatory for every call, error state has a retry action. | Consistency across steps. |
| GAP-05 | Deep link to `/{cc}/resumen` without a plan? | Show empty / redirect | **Human decision (Andres Beltran):** guard redirects to the first incomplete step (`/{cc}/datos` if step 1 invalid, else `/{cc}/planes`). | Prevents an incomplete summary. |
| GAP-06 | Styling | UI lib / plain CSS | **Human decision (Andres Beltran):** plain CSS, mobile-first, visible focus styles. | — |
| GAP-07 | How is the document masked? | Fixed / last N | **Human decision (Andres Beltran):** only the last 4 characters visible (e.g. `******5678`); for RUT the check digit is among those 4. Exact algorithm in §5. | Story rule "partially masked". |
| GAP-08 | What do "edit data" / "change plan" do? | — | **Human decision (Andres Beltran):** "Editar datos" → `/{cc}/datos` with data kept; "Cambiar plan" → `/{cc}/planes` with current plan preselected. | Story rule. |
| GAP-09 | Terms source and gating | — | **Human decision (Andres Beltran):** terms text per country from Strapi; pay button disabled until the checkbox is checked. | Story AC. |
| GAP-10 | How is payment simulated? | Random / deterministic | **Human decision (Andres Beltran):** in-app mock gateway with two buttons, "Simular pago aprobado" / "Simular pago rechazado", ~1.5 s simulated processing; payment controls locked while processing. | Deterministic, testable. |
| GAP-11 | Success / rejection outcome | — | **Human decision (Andres Beltran):** success → confirmation screen with quote number `COT-{CC}-{YYYYMMDD}-{6 random alphanumerics}`; rejection → clear error, user stays on summary with all data kept, can retry. | Story ACs. |
| GAP-12 | Card data? | — | **Human decision (Andres Beltran):** no card data is ever requested or stored. | Non-negotiable 6. |
| GAP-13 | *(agent-found)* Which step-1 field is "the document number" to mask, given fields are dynamic? | (a) infer from validator `rut`/`colombianId`; (b) boolean `maskInSummary` on `form-field` in Strapi | **Resolution: human decision (Andres Beltran)** (OQ-1, v2): (b) `maskInSummary` boolean on `form-field` (default `false`; seed: `true` for the document field in CO and CL). SPEC-US-01's data contract must include this attribute. | Business team controls it; works for a third country without code. |
| GAP-14 | *(agent-found)* How are dynamic values rendered? (select, date, checkbox, empty optional) | raw value / formatted | **Resolution: human decision (Andres Beltran)** (OQ-2, v2): display rules accepted. Grouped by `group` (`policyholder`, `vehicle`), ordered by `order`; label = Strapi field label; select → option **label**; date → `Intl.DateTimeFormat(country.numberLocale)` (e.g. `15/03/1990`); checkbox → Strapi copy "Sí"/"No"; optional empty fields omitted; only currently published fields shown. | No raw codes in the UI; config drift handled. |
| GAP-15 | *(agent-found)* Is the summary price a stored snapshot or recomputed? What if the plan was unpublished/deactivated meanwhile? | snapshot / re-fetch | **Resolution: human decision (Andres Beltran)** (OQ-3, v2): re-fetch plans on the summary (same request as SPEC-US-02) and recalculate the price with the SPEC-US-02 pricing function; if the selected plan is no longer returned, show "plan no disponible" state with "Cambiar plan" and no pay controls. | Shown price always matches current Strapi data. |
| GAP-16 | *(agent-found)* How is the mock gateway presented, and how does "stays on summary" work? | (a) inline panel on `/{cc}/resumen`; (b) modal dialog; (c) separate route `/{cc}/pago` | **Resolution: human decision (Andres Beltran)** (OQ-4, v2): (a) inline panel ("Pasarela de pago simulada") inside the summary page, revealed after clicking "Pagar", with "Simular pago aprobado", "Simular pago rechazado" and "Cancelar". | No focus trap needed; rejection naturally stays on summary. |
| GAP-17 | *(agent-found)* What exactly is locked during processing? | pay only / all | **Accepted as proposed (Andres Beltran, v2):** during processing "Pagar", both simulate buttons, "Cancelar", "Editar datos", "Cambiar plan" and the terms checkbox are disabled; a status text "Procesando pago…" is shown in an `aria-live="polite"` region. Lock is enforced in state (a second trigger is ignored even if fired programmatically). | Story "cannot be submitted twice". |
| GAP-18 | *(agent-found)* Is terms acceptance persisted / kept? | keep always / reset | **Resolution: human decision (Andres Beltran)** (OQ-5, v2): acceptance lives in memory only and is reset (unchecked) on every visit to the summary (after edit, plan change or reload); it is kept only across a rejected payment, which does not leave the page. | Data or plan may have changed; acceptance must apply to what is shown. |
| GAP-19 | *(agent-found)* Terms empty or missing in Strapi for the country? | allow pay / block | **Accepted as proposed (Andres Beltran, v2):** show error state with Strapi/fallback copy "Los términos y condiciones no están disponibles"; checkbox and pay disabled. | Cannot accept non-existent terms. |
| GAP-20 | *(agent-found)* How are terms rendered safely; long terms? | richtext/innerHTML / plain text | **Accepted as proposed (Andres Beltran, v2):** `termsBody` is plain `text`, rendered with interpolation and `white-space: pre-line`; inside a scrollable region (`max-height`, `tabindex="0"`, labelled by the terms title). No scroll-to-bottom requirement. | No unsanitized HTML (security checklist). |
| GAP-21 | *(agent-found)* Quote number details: random source, charset, date timezone? | — | **Accepted as proposed (Andres Beltran, v2):** `{CC}` = uppercase country code; `{YYYYMMDD}` = browser local date at approval time; 6 chars from `[A-Z0-9]` via `crypto.getRandomValues`. Collisions accepted (simulated). | Deterministic format, testable by regex. |
| GAP-22 | *(agent-found)* Confirmation after reload / back button, given state is cleared on success? | (a) memory only → reload redirects; (b) store non-PII snapshot (quote no., plan, price) | **Resolution: human decision (Andres Beltran)** (OQ-6, v2): (a) confirmation data kept in memory only; reload or deep link to `/{cc}/confirmacion` without it redirects to `/{cc}/datos`. Browser Back from confirmation → summary guard → `/{cc}/datos` (empty form). Confirmation shows "Nueva cotización" → `/{cc}/datos`. | Honors "cleared after payment"; prevents re-paying. |
| GAP-23 | *(agent-found)* Navigation away during the 1.5 s processing? | block / cancel | **Accepted as proposed (Andres Beltran, v2):** in-app links are disabled (GAP-17); if the user leaves via browser Back, the pending simulation is cancelled and no confirmation is shown. | No ghost confirmations. |
| GAP-24 | *(agent-found)* Which data is visible unmasked? | mask all PII / only document | **Accepted as proposed (Andres Beltran, v2):** only fields with `maskInSummary=true` are masked; other values shown in full to the person who entered them. No PII in URLs or console logs. | Story only requires document masking. |

Testability note: the processing delay (1500 ms) is an injectable setting so unit tests can use fake timers; e2e uses the real delay.

### Open questions (need a human answer before approval)

None. OQ-1..OQ-6 from v1 were answered by the human at HC1 (see GAP-13, -14, -15, -16, -18, -22).

### Decisions needed (ADR)

None open. Decided in v3 by the accepted ADRs:

- **Country resolution mechanism** (GAP-01) → ADR-002.
- **Multi-country content model** (GAP-02, GAP-09, GAP-13): terms on `country` (`termsTitle`, `termsBody`), step-3 copy in `country.copy` with dotted keys → ADR-001.
- **Public permissions** for the content types read here and the anonymous-write denial test → ADR-003.
- **Wizard state storage** (GAP-03, GAP-18, GAP-22) → ADR-004.

## 3. Country matrix (CO / CL)

All values are **seed data** in Strapi, not code. Copy examples are seed (Spanish).

| Aspect | Colombia (CO) | Chile (CL) |
|--------|---------------|------------|
| Routes | `/co/resumen`, `/co/confirmacion` | `/cl/resumen`, `/cl/confirmacion` |
| Masked document field (seed, `maskInSummary=true`) | Cédula, e.g. `1111111111` → `******1111` | RUT, e.g. `11.111.111-1` → `*****1111` |
| Currency / locale | `COP` / `es-CO`, e.g. `$ 1.234.567` | `CLP` / `es-CL`, e.g. `$1.234.567` |
| Date format (locale) | `15/03/1990` | `15-03-1990` (as produced by `Intl` for `es-CL`) |
| Terms title (seed) | "Términos y condiciones – Colombia" | "Términos y condiciones – Chile" |
| Terms body (seed) | Fictitious text mentioning "Superintendencia Financiera de Colombia (texto de ejemplo)" | Fictitious text mentioning "Comisión para el Mercado Financiero (texto de ejemplo)" |
| Quote number | `COT-CO-20261123-A1B2C3` | `COT-CL-20261123-Z9Y8X7` |

## 4. Data contract with Strapi

Model per ADR-001.

**Content read** (Public role: `find` only):

| Type | Attributes used by US-03 |
|------|--------------------------|
| `country` | `code`, `currency`, `numberLocale`, `termsTitle` (string), `termsBody` (text, plain), `copy` (repeatable component `shared.copy-entry` `{key, value}`; step-3 keys listed below) |
| `form-field` | `key`, `label`, `type`, `group`, `order`, `options` (`value`, `label`), `validations` (repeatable `{type, value, message}`), **`maskInSummary` (boolean, default `false`)** — decided at HC1 v1 (GAP-13); must also appear in the SPEC-US-01 contract |
| `plan` | `documentId`, `name`, `basePrice`, `currency`, `order`, `active` |

**Requests** (on every entry to `/{cc}/resumen`, in parallel; plans are always re-fetched per GAP-15):

```
GET /api/countries?filters[code][$eq]=CO&populate[0]=copy
GET /api/form-fields?filters[country][code][$eq]=CO&sort[0]=order:asc&sort[1]=key:asc&populate[0]=options&populate[1]=validations&pagination[pageSize]=100
GET /api/plans?filters[country][code][$eq]=CO&filters[active][$eq]=true&sort[0]=order:asc&sort[1]=name:asc&populate[0]=coverages&populate[1]=benefits&pagination[pageSize]=100
```

The countries and form-fields responses may be reused from a session cache shared with SPEC-US-01/02; the contract is identical. The plans request is not served from cache on the summary. No write requests are ever made.

**Example response** (`/api/countries`, fictitious, trimmed):

```json
{
  "data": [{
    "documentId": "c0untryco0000000000000a1",
    "code": "CO", "currency": "COP", "numberLocale": "es-CO",
    "termsTitle": "Términos y condiciones – Colombia",
    "termsBody": "1. Este es un texto de ejemplo.\n2. La cotización es simulada y no constituye una póliza.",
    "copy": [{ "key": "summary.title", "value": "Resumen de tu cotización" }]
  }],
  "meta": { "pagination": { "page": 1, "pageSize": 25, "pageCount": 1, "total": 1 } }
}
```

**Example response** (`/api/form-fields`, fictitious, one entry trimmed):

```json
{
  "data": [{
    "documentId": "f0rmfieldco00000000000d1",
    "key": "documentNumber", "label": "Número de documento", "type": "text",
    "group": "policyholder", "order": 2, "maskInSummary": true, "options": [],
    "validations": [{ "type": "colombianId", "value": null, "message": "Ingresa un número de documento válido." }]
  }]
}
```

**Step-3 UI copy keys** (`country.copy`, ADR-001 convention; seed values, Spanish): `summary.title` "Resumen de tu cotización" · `summary.loading` "Cargando tu resumen…" · `summary.policyholderTitle` "Datos del tomador" · `summary.vehicleTitle` "Datos del vehículo" · `summary.planTitle` "Plan elegido" · `summary.priceLabel` "Precio estimado" · `summary.editData` "Editar datos" · `summary.changePlan` "Cambiar plan" · `summary.termsAccept` "Acepto los términos y condiciones" · `payment.pay` "Pagar" · `payment.gatewayTitle` "Pasarela de pago simulada" · `payment.simulateApprove` "Simular pago aprobado" · `payment.simulateReject` "Simular pago rechazado" · `payment.cancel` "Cancelar" · `payment.processing` "Procesando pago…" · `payment.rejected` "El pago fue rechazado. No se realizó ningún cobro. Puedes intentarlo de nuevo." · `confirmation.title` "¡Pago exitoso!" · `confirmation.quoteNumberLabel` "Número de cotización" · `confirmation.newQuote` "Nueva cotización" · `common.yes` "Sí" · `common.no` "No" · `summary.termsUnavailable` "Los términos y condiciones no están disponibles." · `summary.planUnavailable` "El plan elegido ya no está disponible." · `summary.error` "No pudimos cargar la información." · `common.retry` "Reintentar".

Technical fallback (only when Strapi is unreachable, per CLAUDE.md): minimal Spanish error + "Reintentar" in the frontend.

**Frontend model (TypeScript):**

```ts
interface SummaryRow { key: string; label: string; displayValue: string; masked: boolean; }
interface SummaryViewModel {
  countryCode: 'CO' | 'CL' | string;      // any code configured in Strapi
  policyholder: SummaryRow[];
  vehicle: SummaryRow[];
  plan: { documentId: string; name: string; finalPrice: number; currency: string; formattedPrice: string };
  terms: { title: string; body: string } | null;   // null → GAP-19 state
}
type PaymentState = 'idle' | 'gateway' | 'processing' | 'rejected' | 'approved';
interface Confirmation { quoteNumber: string; planName: string; formattedPrice: string; } // memory only (GAP-22)
```

Wizard state consumed (shape owned by SPEC-US-01/02 and ADR-004): per-country step-1 values keyed by field `key`, and the selected plan `documentId`. US-03 writes nothing to sessionStorage except clearing the country's state on approval. Terms acceptance and the confirmation are memory only.

## 5. Validations

| Field / rule | Source | Rule (exact) | Message source | When shown |
|--------------|--------|--------------|----------------|------------|
| Document masking | Code, field selected by Strapi `maskInSummary` | Normalize: remove spaces, `.`, `-`; uppercase. Length `n`. If `n > 4`: `'*'.repeat(n-4) + last 4`; if `n <= 4`: `'*'.repeat(n)`. | — | Always, in summary |
| Terms accepted | Code | Pay enabled iff checkbox checked AND terms present AND state ∈ {`idle`,`rejected`}. Checkbox starts unchecked on every entry to the summary. | — | Live |
| Single submit | Code | A simulate action is accepted only in state `gateway`; any trigger in `processing`/`approved` is ignored | — | — |
| Quote number | Code | Matches `^COT-(CO\|CL)-\d{8}-[A-Z0-9]{6}$` (country part = configured code) | — | Confirmation |
| Step guard | Code | Step 1 valid (per SPEC-US-01) AND selected plan set, else redirect to first incomplete step | — | On navigation |

## 6. UI states

| State | Trigger | What the user sees | Copy source |
|-------|---------|--------------------|-------------|
| Loading | Entering `/{cc}/resumen` while requests pending | Loading indicator `summary.loading` (`aria-busy="true"` on main region); no pay controls | Strapi (fallback text if not yet loaded) |
| Error | Any of the 3 requests fails (network, 4xx, 5xx, timeout 10 s) | Error message `summary.error` + `common.retry` "Reintentar" (re-runs failed requests) | Strapi / technical fallback |
| Plan unavailable | Selected `documentId` not in plans response | `summary.planUnavailable` + "Cambiar plan"; no pay controls | Strapi |
| Terms unavailable | `termsBody` empty/null | `summary.termsUnavailable`; checkbox and pay disabled | Strapi |
| Default | Data loaded | Sections policyholder, vehicle, plan (name + "Precio estimado" + recalculated formatted price), terms, unchecked checkbox, "Pagar" (disabled until checked) | Strapi |
| Gateway | Click "Pagar" | Inline gateway panel inside the summary page with approve / reject / cancel buttons; no inputs | Strapi |
| Processing | Click approve or reject | "Procesando pago…" for ~1.5 s; all payment and navigation controls disabled | Strapi |
| Rejected | Reject simulation completes | Error alert `payment.rejected`; gateway closed; checkbox still checked; "Pagar" enabled; all data shown unchanged | Strapi |
| Approved | Approve simulation completes | Navigate to `/{cc}/confirmacion`: title, quote number, plan name, price, "Nueva cotización" | Strapi |

Responsive: single column at ≤ 480 px, no horizontal scroll at 360 px; two columns (data | plan + payment) allowed from 768 px. Interactive targets ≥ 44×44 px.

## 7. Accessibility

- Page has one `h1` (`summary.title`); sections use `h2` with `aria-labelledby`.
- On entering summary, focus moves to the `h1`. On confirmation, focus moves to the confirmation `h1`.
- Masked value has an accessible text that does not reveal the hidden digits (e.g. visible `******1111`, no extra `aria-label` with the full value).
- Terms region: `role="region"`, `aria-labelledby` = terms title, `tabindex="0"` when scrollable.
- Checkbox is a native `<input type="checkbox">` with `<label>`; "Pagar" is a native `<button>` with `disabled` (not only styled).
- On opening the gateway, focus moves to the gateway heading. On cancel, focus returns to "Pagar".
- Processing text in an `aria-live="polite"` region. Rejection message in `role="alert"` and receives focus.
- Whole flow (review → edit links → checkbox → pay → simulate) completable with Tab/Shift+Tab/Space/Enter only; focus styles visible.

## 8. Acceptance criteria

**Priority tags.** Every AC carries a Gherkin tag `@P1` or `@P2`:

- **P1** – must have at least one automated test (unit or e2e) before HC4. P1 = the original story ACs, plus derived ACs about validation (rules in §5), country filtering, security (including public write denial and PII/card-data handling) and double submit.
- **P2** – covered by an automated test if time allows; otherwise verified manually at HC4 and listed in the README under "Manually verified ACs".

`<cc>` is the lowercase route code and `<CC>` the uppercase Strapi country code. Scenario Outlines run once per Examples row (CO and CL).

```gherkin
# US-03-AC-01 — Complete summary (original)
@P1
Scenario Outline: Summary shows policyholder, vehicle and plan with final price
  Given I completed step 1 for "<cc>" with seed data and chose the plan "<plan>"
  When I reach "/<cc>/resumen"
  Then I see a "Datos del tomador" section with every non-empty published policyholder field label and value
  And I see a "Datos del vehículo" section with every non-empty published vehicle field label and value
  And I see the plan name "<plan>" and its final price formatted in "<currency>" with the label "Precio estimado"
  And the price equals the SPEC-US-02 simulated price for the entered vehicle year, recalculated from the plans re-fetched on entry
  Examples:
    | cc | plan          | currency |
    | co | Plan Estándar | COP      |
    | cl | Plan Full     | CLP      |

# US-03-AC-02 — Terms by country (original)
@P1
Scenario Outline: Terms text comes from Strapi for the country and gates payment
  Given I am on "/<cc>/resumen"
  When I view the terms and conditions
  Then the terms title and body equal the "termsTitle" and "termsBody" configured in Strapi for "<CC>"
  And the "Pagar" button is disabled while the acceptance checkbox is unchecked
  And the "Pagar" button becomes enabled when I check the checkbox
  Examples:
    | cc | CC |
    | co | CO |
    | cl | CL |

# US-03-AC-03 — Successful payment (original) (changed in v2: Scenario Outline per country)
@P1
Scenario Outline: Approved simulated payment
  Given I am on "/<cc>/resumen", accepted the terms and clicked "Pagar"
  When I click "Simular pago aprobado"
  Then "Simular pago aprobado", "Simular pago rechazado" and "Pagar" are disabled and "Procesando pago…" is shown
  And after the processing delay I am on "/<cc>/confirmacion"
  And I see a quote number matching "^COT-<CC>-\d{8}-[A-Z0-9]{6}$"
  Examples:
    | cc | CC |
    | co | CO |
    | cl | CL |

# US-03-AC-04 — Rejected payment (original) (changed in v2: Scenario Outline per country)
@P1
Scenario Outline: Rejected simulated payment, retry without data loss
  Given I am on "/<cc>/resumen", accepted the terms and clicked "Pagar"
  When I click "Simular pago rechazado"
  Then after the processing delay I stay on "/<cc>/resumen"
  And I see the Strapi message "El pago fue rechazado. No se realizó ningún cobro. Puedes intentarlo de nuevo." in an alert
  And all summary data, the chosen plan and the checked terms checkbox are unchanged
  And "Pagar" is enabled so I can try again
  Examples:
    | cc |
    | co |
    | cl |

# US-03-AC-05 — Document number masked (derived from GAP-07, GAP-13)
@P1
Scenario Outline: Only the last 4 characters of the document are visible
  Given the step 1 field with "maskInSummary" = true has the value "<entered>" in "<cc>"
  When I view "/<cc>/resumen"
  Then the document row shows "<shown>"
  And the full value "<entered>" does not appear anywhere in the page DOM
  Examples:
    | cc | entered      | shown      |
    | co | 1111111111   | ******1111 |
    | cl | 11.111.111-1 | *****1111  |

# US-03-AC-06 — Edit data keeps values (derived from GAP-08) (changed in v2: Scenario Outline per country)
@P1
Scenario Outline: "Editar datos" returns to step 1 with data kept
  Given I am on "/<cc>/resumen" after completing step 1 with seed data
  When I activate "Editar datos"
  Then I am on "/<cc>/datos"
  And every field shows the value I entered before
  Examples:
    | cc |
    | co |
    | cl |

# US-03-AC-07 — Change plan preselects current plan (derived from GAP-08) (changed in v2: Scenario Outline per country)
@P1
Scenario Outline: "Cambiar plan" returns to step 2 with the plan preselected
  Given I am on "/<cc>/resumen" with plan "<plan>" selected
  When I activate "Cambiar plan"
  Then I am on "/<cc>/planes"
  And "<plan>" is marked as chosen
  Examples:
    | cc | plan          |
    | co | Plan Estándar |
    | cl | Plan Full     |

# US-03-AC-08 — No double submit (derived from GAP-10, GAP-17)
@P1
Scenario: Repeated clicks produce a single payment
  Given the gateway is open on "/co/resumen"
  When I click "Simular pago aprobado" twice within 200 ms
  Then exactly one processing cycle runs
  And exactly one quote number is generated and shown

# US-03-AC-09 — Quote number format (derived from GAP-11, GAP-21)
@P1
Scenario: Quote number follows the configured pattern
  Given today's local date is 2026-11-23 and I am in "cl"
  When a simulated payment is approved
  Then the quote number matches "^COT-CL-20261123-[A-Z0-9]{6}$"

# US-03-AC-10 — State cleared after success (derived from GAP-03, GAP-22)
@P1
Scenario: Wizard state is removed after approval
  Given a simulated payment was approved for "co"
  When I inspect sessionStorage
  Then there is no wizard state for "co"
  And navigating Back to "/co/resumen" redirects to "/co/datos" with an empty form

# US-03-AC-11 — Summary guard (derived from GAP-05)
@P1
Scenario Outline: Deep link without complete previous steps redirects
  Given "<state>" for "cl"
  When I open "/cl/resumen"
  Then I am redirected to "<target>"
  Examples:
    | state                               | target     |
    | no wizard state                     | /cl/datos  |
    | valid step 1, no plan selected      | /cl/planes |

# US-03-AC-12 — No card data (derived from GAP-12)
@P1
Scenario: The gateway never asks for card data
  Given the gateway is open on "/co/resumen"
  Then the gateway contains no input, select or textarea elements
  And after approval or rejection sessionStorage contains no card-related keys

# US-03-AC-13 — Loading and error with retry (derived from GAP-04)
@P2
Scenario: Strapi failure on the summary shows an error and can be retried
  Given the Strapi countries request fails with HTTP 500
  When I open "/co/resumen"
  Then I see a loading indicator first, then the error message and a "Reintentar" button
  And no pay controls are shown
  When the request succeeds and I click "Reintentar"
  Then the summary is shown

# US-03-AC-14 — Terms unavailable (derived from GAP-19)
@P1
Scenario: Missing terms block payment
  Given "termsBody" is empty for "CO" in Strapi
  When I open "/co/resumen"
  Then I see "Los términos y condiciones no están disponibles."
  And the checkbox and "Pagar" are disabled

# US-03-AC-15 — Selected plan no longer available (derived from GAP-15)
@P2
Scenario: Plan unpublished or deactivated after selection
  Given my selected plan is no longer returned by the plans request for "CO"
  When I open "/co/resumen"
  Then I see "El plan elegido ya no está disponible." and a "Cambiar plan" action
  And no pay controls are shown

# US-03-AC-16 — Value formatting (derived from GAP-14)
@P2
Scenario: Dynamic values are rendered human-readable
  Given step 1 has a select value "MZ" with option label "Marca Ejemplo" and a date of birth "1990-03-15" in "co"
  When I view "/co/resumen"
  Then I see "Marca Ejemplo" (not "MZ") and "15/03/1990"
  And optional fields left empty have no row

# US-03-AC-17 — Terms acceptance reset on entry (derived from GAP-18)
@P2
Scenario: Returning to the summary requires accepting again
  Given I checked the terms checkbox on "/co/resumen" and activated "Editar datos"
  When I continue back to "/co/resumen"
  Then the terms checkbox is unchecked and "Pagar" is disabled

# US-03-AC-18 — Confirmation without data redirects (derived from GAP-22)
@P2
Scenario: Reloading or deep-linking the confirmation
  Given there is no confirmation in memory for "co"
  When I open "/co/confirmacion"
  Then I am redirected to "/co/datos"

# US-03-AC-19 — Gateway cancel (derived from GAP-16)
@P2
Scenario: Closing the gateway without paying
  Given the gateway is open on "/co/resumen"
  When I activate "Cancelar"
  Then the gateway is closed, focus is on "Pagar" and no payment was processed

# US-03-AC-20 — Keyboard-only completion and focus (derived from a11y checklist)
@P2
Scenario: Pay using only the keyboard
  Given I am on "/co/resumen"
  When I use only Tab, Shift+Tab, Space and Enter
  Then I can check the terms, open the gateway and approve the payment
  And focus moves to the gateway heading on open, to the alert on rejection, and to the confirmation h1 on approval

# US-03-AC-21 — Mobile layout (derived from responsive checklist)
@P2
Scenario: Summary on a 360 px wide viewport
  Given the viewport is 360x740
  When I view "/co/resumen" and open the gateway
  Then there is no horizontal scrollbar
  And "Pagar" and both simulate buttons are at least 44x44 px

# US-03-AC-22 — Public write refused (derived from security checklist) (changed in v3: 401 or 403, ADR-003)
@P1
Scenario: Anonymous write to content read by the summary
  Given Strapi is running with bootstrap permissions
  When an anonymous client sends POST /api/countries, and PUT and DELETE /api/countries/{documentId}
  Then each response status is 401 or 403
  And GET /api/countries returns 200
```

## 9. Test mapping

P1 rows must have an automated test. P2 rows: automated if time allows; otherwise "manual" at HC4 and listed in the README.

| AC ID | Priority | Level | Test name | Country | Notes |
|-------|----------|-------|-----------|---------|-------|
| US-03-AC-01 | P1 | e2e | `US-03-AC-01 summary shows policyholder, vehicle and plan with final price` | CO, CL | seed data; one run per Examples row; v3: seed plans "Plan Estándar" / "Plan Full" |
| US-03-AC-02 | P1 | e2e + unit | `US-03-AC-02 terms from Strapi per country gate the pay button` | CO, CL | e2e compares with Strapi API |
| US-03-AC-03 | P1 | e2e | `US-03-AC-03 approved payment locks controls and shows quote number` | CO, CL | v2: outline, regex uses `<CC>` |
| US-03-AC-04 | P1 | e2e | `US-03-AC-04 rejected payment keeps data and allows retry` | CO, CL | v2: outline |
| US-03-AC-05 | P1 | unit + e2e | `US-03-AC-05 masks document leaving last 4 characters` | CO, CL | unit table on mask fn; field selected by `maskInSummary` |
| US-03-AC-06 | P1 | e2e | `US-03-AC-06 edit data returns to step 1 with values` | CO, CL | v2: outline; promoted to P1 at HC1 |
| US-03-AC-07 | P1 | e2e | `US-03-AC-07 change plan preselects current plan` | CO, CL | v2: outline; promoted to P1 at HC1; v3: seed plans "Plan Estándar" / "Plan Full" |
| US-03-AC-08 | P1 | unit + e2e | `US-03-AC-08 double click produces a single payment` | CO | fake timers in unit |
| US-03-AC-09 | P1 | unit | `US-03-AC-09 quote number matches pattern` | CO, CL | fixed clock |
| US-03-AC-10 | P1 | e2e | `US-03-AC-10 clears wizard state after approval` | CO | |
| US-03-AC-11 | P1 | e2e | `US-03-AC-11 summary guard redirects to first incomplete step` | CL | |
| US-03-AC-12 | P1 | e2e | `US-03-AC-12 gateway has no card inputs` | CO | |
| US-03-AC-13 | P2 | e2e | `US-03-AC-13 summary shows error with retry when Strapi fails` | CO | route interception |
| US-03-AC-14 | P1 | unit | `US-03-AC-14 missing terms disable payment` | CO | mocked response |
| US-03-AC-15 | P2 | unit | `US-03-AC-15 unavailable plan shows change plan action` | CO | mocked response |
| US-03-AC-16 | P2 | unit | `US-03-AC-16 renders option labels, locale dates, omits empty optional` | CO, CL | |
| US-03-AC-17 | P2 | e2e | `US-03-AC-17 terms acceptance resets on re-entry` | CO | |
| US-03-AC-18 | P2 | e2e | `US-03-AC-18 confirmation without data redirects to step 1` | CO | |
| US-03-AC-19 | P2 | unit | `US-03-AC-19 cancel closes gateway and returns focus` | CO | |
| US-03-AC-20 | P2 | e2e + manual | `US-03-AC-20 completes payment with keyboard only` | CO, CL | manual check at HC4 |
| US-03-AC-21 | P2 | e2e | `US-03-AC-21 summary fits 360px viewport` | CO | |
| US-03-AC-22 | P1 | e2e (API) | `US-03-AC-22 public write to countries is denied with 401 or 403` | — | may be shared with first story touching Strapi; v3: 401 or 403 per ADR-003 |

## 10. Out of scope

- Real payment gateway, card data, real quote persistence or backend storage of the quote.
- Emailing or downloading the quote/policy.
- Recording which terms version was accepted.
- Country picker and not-found page (owned by SPEC-US-01 / ADR-002); step 1 and step 2 behavior (SPEC-US-01, SPEC-US-02).
- Pricing rule definition (SPEC-US-02); US-03 only reuses it.
- Rich-text terms (plain text only in v1).

## Changelog

| Version | Date | Change | Reason / source | ACs affected | Approval (HC1) |
|---------|------|--------|-----------------|--------------|----------------|
| 1 | 2026-11-23 | Initial spec | US-03; human decisions from phase-1 prompt | all | REJECTED – Andres Beltran – 2026-11-23 |
| 2 | 2026-11-23 | Replaced the `<cc>` placeholder in fixed scenarios with Scenario Outlines with CO/CL Examples (AC-03, AC-04, AC-06, AC-07; AC-03 regex now uses `<CC>`); gave fixed scenarios that said only "the summary" a concrete route; renamed the AC-01 Examples column `plan (seed)` → `plan` to match its placeholder; added P1/P2 tags and definition to every AC and a Priority column to the test mapping; recorded OQ-1..OQ-6 as human decisions (GAP-13, -14, -15, -16, -18, -22) and GAP-17, -19, -20, -21, -23, -24 as accepted; removed open questions; `maskInSummary` no longer pending; plans always re-fetched on summary entry; AC-06/AC-07 promoted to P1 and RUT examples replaced with 11.111.111-1 at HC1 | HC1 rejection: `<cc>` outlines, priority tags, OQ answers (human, Andres Beltran) | AC-03, AC-04, AC-06, AC-07 (changed); AC-01, AC-05, AC-08, AC-12..AC-17, AC-19..AC-21 (wording or route only); all (priority tag) | APPROVED – Andres Beltran – 2026-11-23 |
| 3 | 2026-11-23 | §4: form-fields request `populate[1]=validation` → `populate[1]=validations` (repeatable `{type, value, message}`), secondary sorts `key:asc` (form fields) and `name:asc` (plans), country request adds `populate[0]=copy`; `country.copy` as `shared.copy-entry`; all step-3 copy keys renamed to ADR-001 dotted convention (e.g. `retryLabel`→`common.retry`, `summaryTitle`→`summary.title`, `payLabel`→`payment.pay`) and new `summary.loading`, also in §6/§7; GAP-02: document types no longer on the country entry (Colombian document type is a `select` form-field, SPEC-US-01 GAP-15); "Plan Intermedio" replaced with SPEC-US-02 seed plans "Plan Estándar" (CO) / "Plan Full" (CL); AC-22 asserts 401 or 403 for anonymous writes; `adrs:` and traceability filled; "Decisions needed (ADR)" marked decided | Alignment with accepted ADR-001..004 (HC2) | AC-01, AC-07 (Examples plan names); AC-22 (expected status); AC-13 (copy keys only, behavior unchanged) | APPROVED – Andres Beltran – 2026-11-23 |
