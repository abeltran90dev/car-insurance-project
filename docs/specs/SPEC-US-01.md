---
id: SPEC-US-01
story: US-01
title: Policyholder and vehicle data form
status: Approved            # Draft | Approved — only the human approves
version: 2               # +1 on every change after an approval (see Changelog)
approved_by: Andres Beltran  # filled by the main session after APPROVED at HC1
approved_on: 2026-11-23  # YYYY-MM-DD
adrs: [ADR-001, ADR-002, ADR-003, ADR-004]
author: Andres Beltran (drafted outside Claude Code with the planning chat after two spec-writer runs were blocked; reviewed by the human; reviewed and completed by spec-writer)
related_specs: [SPEC-US-02, SPEC-US-03]
---

# SPEC-US-01 – Policyholder and vehicle data form

## Traceability

| Link | Reference |
|------|-----------|
| User story | [US-01](../user-stories/US-01.md) |
| Consumed by | [SPEC-US-02](SPEC-US-02.md) (step 1 values, `vehicleYear` field, country entry, "step 1 valid" for the guard) · [SPEC-US-03](SPEC-US-03.md) (step 1 values, field config incl. `maskInSummary` and `group`) |
| ADRs | [ADR-001](../adr/ADR-001-multi-country-content-model.md) (content model, copy, `site-copy`) · [ADR-002](../adr/ADR-002-country-resolution-in-frontend.md) (country resolution) · [ADR-003](../adr/ADR-003-strapi-public-permissions-bootstrap.md) (public permissions) · [ADR-004](../adr/ADR-004-wizard-state-in-browser.md) (wizard state) |
| Code | branch `feat/US-01-data-form` (filled after implementation) |
| Tests | see [Test mapping](#9-test-mapping) |
| Review | [REVIEW-US-01](../reviews/REVIEW-US-01.md) (after review) |

## 1. Scope

Step 1 of the wizard, at `/{cc}/datos`. Render a form for policyholder and vehicle data that is **built entirely at runtime from the Strapi configuration of the current country**. Fields, types, validations, copy and order come from Strapi; no field is hard-coded in Angular. The step is complete only when every field passes its configured validations.

In scope:
- Fetching the published form fields for the current country and rendering them in `order`.
- Field types: `text`, `number`, `select`, `date`, `checkbox`.
- Validation engine driven by Strapi configuration (section 5).
- Persisting entered data in the wizard state (sessionStorage, per country) and restoring it.
- Loading, empty and error states.
- Accessibility and responsive behavior for the form.
- Country resolution entry points owned by this story (SPEC-US-02 §10 assigns them to US-01): the root country picker `/` and the not-found page for an unknown country code (GAP-01, GAP-20).
- The definition of "step 1 valid" used by the guards of SPEC-US-02 and SPEC-US-03 (GAP-17).

Out of scope: see [section 10](#10-out-of-scope).

## 2. Gaps & resolutions

Source labels:
- **Human decision (Andres Beltran)**: decided in `docs/prompts/phase-1-prompt.md` ("Cross-cutting" and "US-01"), or confirmed explicitly by the human in an approved spec (reference given), or decided by the human at HC1 of this spec (2026-11-23, marked "at HC1").
- **Human draft**: resolution written by the human in this spec's draft; confirmed at HC1 of this spec.
- **Agent-found (spec-writer review)**: added while completing the draft; proposed resolution, confirmed or changed at HC1.

| ID | Gap (question the story does not answer) | Options | Resolution | Rationale |
|----|------------------------------------------|---------|------------|-----------|
| GAP-01 | How is the country chosen? | URL prefix / subdomain / selector in state | **Resolution: human decision (Andres Beltran).** Route prefix `/co`, `/cl` (step 1 is `/{cc}/datos`); root `/` shows a simple country picker; unknown code → not-found page with a link to the picker. Mechanism recorded in ADR-002. | One build, deep-linkable, testable. |
| GAP-02 | Which validations exist and how are they configured? | Free regex only / fixed list in code / configurable rules + named validators | **Resolution: human decision (Andres Beltran).** Validator list and rule shape in sections 4 and 5: `required`, `minLength`, `maxLength`, `min`, `max`, `pattern`, plus named validators `minAge`, `vehicleYear`, `rut`, `colombianId`. | Business team configures; complex rules are named validators in code that Strapi selects. |
| GAP-03 | Legal age value and calculation? | Fixed 18 in code / per country in Strapi | **Resolution: human decision (Andres Beltran).** 18 in both countries, configured per country in Strapi (`legalAge`), never hard-coded; age in completed years from date of birth at today's date. | Non-negotiable 2. |
| GAP-04 | "No more than 20 years old": inclusive or not? | Inclusive / exclusive | **Resolution: human decision (Andres Beltran).** Inclusive on both ends: `currentYear − 20 ≤ year ≤ currentYear + 1`, computed at runtime, never hard-coded. | Matches SPEC-US-02 age factors (age −1..20). |
| GAP-05 | Format of identity documents? | Regex in Strapi / named validators | **Resolution: human decision (Andres Beltran).** `rut` (Chilean RUT with modulo-11 check digit, accepts input with or without dots and dash; dash optional confirmed by the human at HC1) and `colombianId` (numeric, 6–10 digits); format only, no registry lookup. | Check digit can't be a regex. |
| GAP-06 | Field without an error message? | No message / generic fallback | **Resolution: human decision (Andres Beltran).** Fallback chain: rule `message` → field `errorMessage` → country generic error message (section 5). | User always sees a message. |
| GAP-07 | Unknown validator coming from Strapi? | Crash / block form / ignore | **Resolution: human decision (Andres Beltran).** Ignored and logged with `console.warn` (field key and validator name only, never the value); the form does not crash. | Config errors must not take the step down. |
| GAP-08 | When to show errors; focus handling? | On change / on blur / on submit | **Resolution: human decision (Andres Beltran).** After the field is touched (blur) or on "Continuar"; on "Continuar" with errors, focus moves to the first invalid field. | Avoids noisy errors while typing. |
| GAP-09 | Where is data kept and for how long? | memory / sessionStorage / localStorage | **Resolution: human decision (Andres Beltran).** Wizard state in `sessionStorage` (not `localStorage`: personal data must not outlive the tab), keyed by country; step 1 values keyed by Strapi field `key`; cleared after successful payment (SPEC-US-03); switching country starts a new quote for that country (other country's state per GAP-25). Storage shape in ADR-004. | PII minimization. |
| GAP-10 | A field removed from Strapi while data is stored? | Keep / discard | **Human draft:** stored value discarded; new fields start empty. | No stale data. |
| GAP-11 | Slow or failed Strapi responses? | No timeout / N seconds | **Resolution: human decision (Andres Beltran)** (10 s confirmed explicitly in SPEC-US-02 GAP-21): error state with "Reintentar" after an HTTP/network error or 10 s without a response. | Same value across steps; no infinite spinner. |
| GAP-12 | How does the summary know which value to mask? | Infer from validator / boolean flag | **Resolution: human decision (Andres Beltran)** (SPEC-US-03 GAP-13, formerly its OQ-1): boolean `maskInSummary` on `form-field`, default `false`; seed `true` for the document field in CO and CL. | Business team controls it. |
| GAP-13 | How does pricing find the vehicle year? | Fixed key / validator / flag | **Resolution: human decision (Andres Beltran)** (SPEC-US-02 GAP-12): the step 1 field whose validations include the named validator `vehicleYear`. | No hard-coded key. |
| GAP-14 | Order ties? | Undefined / secondary sort | **Human draft:** ties sorted by `key` ascending (in the Strapi request, section 4). | Deterministic order for tests. |
| GAP-15 | Where do copy, currency, locale and document types come from? | Frontend constants / Strapi | **Resolution: human decision (Andres Beltran).** UI copy in Spanish served from Strapi per country (labels, help texts, error messages, step title, button texts); currency and locale from the country entry. Only a minimal technical fallback lives in the frontend (Strapi unreachable). **Document types: human decision at HC1 (formerly OQ-3):** the Colombian document type stays a `select` form field configured in Strapi (options CC, CE); Chile has a single RUT field; the country entry does not carry document types. | Non-negotiables 1–2, language policy; still 100% Strapi and editable by the business team. |
| GAP-16 | Which async states must step 1 handle? | — | **Resolution: human decision (Andres Beltran).** Loading, error (with retry) and empty states are mandatory for every Strapi call. Loading state gets its own AC (US-01-AC-25, human decision at HC1, formerly OQ-5). | Robustness. |
| GAP-17 | Navigation guards: what does "step 1 valid" mean for later steps? | Flag set on Continue / re-validate stored values | **Resolution: human decision (Andres Beltran)** for the guard (cannot open step 2 without a valid step 1, nor step 3 without a selected plan; redirect to the first incomplete step). **Agent-found** definition: step 1 is valid when the stored values for the country, checked against the **currently published** fields, pass every configured validation (same engine as the form). | One predicate shared by SPEC-US-02/03 guards; handles config drift. |
| GAP-18 | Styling? | UI library / plain CSS | **Resolution: human decision (Andres Beltran).** Plain CSS, no UI library, mobile-first, visible focus styles. | — |
| GAP-19 | Unpublished fields; sort order? | — | **Resolution: human decision (Andres Beltran).** Unpublished (draft) fields are never shown. Fields are sorted by `order` (ties: GAP-14). | Business team stages changes safely. |
| GAP-20 | How is a country code "unknown"? Route case vs Strapi case? | Hard-coded list / Strapi lookup | **Agent-found.** Known countries are the `country` entries returned by Strapi (no list in code). The route segment is lower case (`co`); it is upper-cased to match `country.code` (`CO`). A code with no matching entry → not-found page. The picker lists every returned country by `name`. | Non-negotiable 1; a third country needs no code change. Mechanism confirmed in ADR-002. |
| GAP-21 | Value types and normalization in the wizard state? | Raw strings / typed values | **Agent-found.** Before validation and storage: `text` → trimmed string; `number` → number (empty → `null`); `select` → option `value` (string); `date` → ISO `YYYY-MM-DD` (browser local date); `checkbox` → boolean; RUT stored normalized (no dots, uppercase K, per section 5). A Feb 29 birthday completes a year on Mar 1 in non-leap years. | US-02 needs an integer year; US-03 formats dates and option labels. |
| GAP-22 | When are values written to the wizard state? | On every change / on successful "Continuar" | **Human draft** (section 6 of the draft): only on "Continuar" with a valid form. Values typed but not submitted are lost on reload. | Stored data is always valid; fewer PII writes. |
| GAP-23 | Misconfigured fields: unknown `type`, `select` with no options, duplicate `key`, `minAge` without parameter and no `legalAge`? | Crash / skip with warning / render anyway | **Resolution: human decision (Andres Beltran) at HC1 (formerly OQ-2), proposal accepted.** Field not rendered + `console.warn` (key and reason only, never a value) for unknown type and for select with no options; duplicate `key` → first by sort order kept, others skipped with a warning; `minAge` without any age value (no parameter and no country `legalAge`) → rule fails closed (field invalid) and warns. Covered by US-01-AC-24. | Form must not crash (consistent with GAP-07). |
| GAP-24 | Copy for the root picker and the not-found page (no country context yet)? | Frontend fallback / global Strapi entry | **Resolved by ADR-001 (HC2; changed in v2).** Country-independent copy lives in the `site-copy` single type (repeatable `shared.copy-entry`), fetched with `GET /api/site-copy?populate[0]=copy` (section 4.2). Keys: `picker.title`, `picker.intro`, `picker.loading`, `picker.error`, `notFound.title`, `notFound.message`, `notFound.backToPicker`, `common.retry` (section 4.3). Country names on the picker come from `country.name`. The frontend technical fallback is used only when Strapi is unreachable. | Non-negotiable 2 vs. no country selected. |
| GAP-25 | Switching country: is the other country's state kept or cleared? | Keep (isolated per key) / clear all | **Resolution: human decision (Andres Beltran) at HC1 (formerly OQ-1): keep.** State is keyed per country and tab-scoped (sessionStorage): `/cl/datos` starts empty while CO data stays until the tab closes or CO payment succeeds. | Literal reading of "keyed by country". |
| GAP-26 | Security: public permissions and CMS text rendering? | — | **Resolution: human decision (Andres Beltran)** (CLAUDE.md non-negotiable 4, ADR-003): Public role has only `find` on the types this step reads (`country`, `form-field`, `site-copy`), granted in `bootstrap`; anonymous writes are denied with 401 or 403 (ADR-003, human decision at HC2; changed in v2). **Human draft:** all CMS text rendered as plain text (no `innerHTML`); the frontend only sends GET requests with no token. | XSS and write protection. |
| GAP-27 | Accessibility and responsive behavior? | — | **Human draft** (sections 6–7): visible `<label>`, `aria-describedby`, `aria-invalid`, keyboard-only completion, one column on small screens, usable from 320 px. | Story says "simple form"; DoD requires keyboard and mobile. |

### Open questions (need a human answer before approval)

None. OQ-1, OQ-2, OQ-3 and OQ-5 were resolved by the human at HC1 (GAP-25, GAP-23, GAP-15, GAP-16); OQ-4 moved to the ADR dependencies (GAP-24, ADR-001).

### Decisions needed (ADR)

None open in v2. All four decisions below were taken in ADR-001..004 (HC2) and are reflected in this spec:

- **ADR-001 Multi-country content model:** repeatable validation rules `{ type, value, message }` (component `form.validation-rule`, `type` enumeration with the validator names of section 5, `value` stored as a string); copy as `<area>.<camelCaseName>` keys on `country.copy`; `legalAge` on `country`; picker and not-found copy in the `site-copy` single type (GAP-24).
- **ADR-002 Country resolution:** route prefix `/{cc}`, unknown-code detection from Strapi (GAP-01, GAP-20).
- **ADR-003 Public permissions:** `find` on `country`, `form-field`, `plan` and `site-copy` via the bootstrap allow-list; anonymous writes denied with 401 or 403 (GAP-26).
- **ADR-004 Wizard state:** sessionStorage key per country, stored shape (values keyed by field `key`, types per GAP-21), clearing rules (GAP-09, GAP-25: other country's state kept).

## 3. Country matrix (CO / CL)

All values below are **seed data** configured in Strapi, not code. Copy examples are Spanish seed; document examples are fictitious.

| Aspect | Colombia (CO) | Chile (CL) |
|--------|---------------|------------|
| Route | `/co/datos` | `/cl/datos` |
| `country.code` in Strapi (route segment upper-cased) | `CO` | `CL` |
| Locale / currency (`numberLocale` / `currency`) | `es-CO` / `COP` | `es-CL` / `CLP` |
| Identity document | Document type (select form field: CC — cédula de ciudadanía, CE — cédula de extranjería) + document number (`colombianId`) | RUT (`rut`) |
| Document example (fictitious) | `1111111111` | `11.111.111-1` |
| `maskInSummary` (GAP-12) | `true` on the document number field | `true` on the RUT field |
| Vehicle identifier | Placa | Patente |
| Vehicle year field | number field with validator `vehicleYear` | number field with validator `vehicleYear` |
| Legal age | 18 (configured on the country entry) | 18 (configured on the country entry) |
| Draft (unpublished) field for US-01-AC-05 | one draft form field (seed) | one draft form field (seed) |
| Copy | Spanish, from Strapi | Spanish, from Strapi |

The exact field list per country is seed data (Phase 2), not part of this spec. The spec only requires that both countries have different fields and a different order, to prove the form is data-driven. **The Phase 2 seed must include one draft (unpublished) form field per country** so US-01-AC-05 can be tested end to end.

## 4. Data contract with Strapi

Physical model per ADR-001 (changed in v2).

### 4.1 Content types

Each **form field** (`form-field`, collection type, Draft & Publish on) has:

| Attribute | Type | Required | Notes |
|---|---|---|---|
| `key` | string | yes | Stable identifier, unique per country. Used as the form control name and the key in the wizard state. |
| `label` | string | yes | Shown as the accessible label. |
| `type` | enum `text \| number \| select \| date \| checkbox` | yes | |
| `required` | boolean | yes | |
| `validations` | list of rules (component `form.validation-rule`, repeatable) | no | See section 5. |
| `helpText` | string | no | Linked to the input with `aria-describedby`. |
| `errorMessage` | string | no | Default error message for the field. |
| `order` | integer | yes | Ascending. Ties sorted by `key`. |
| `group` | enum `policyholder \| vehicle` | yes | Added for consistency with SPEC-US-03 GAP-14 (summary sections) and the skill baseline. Step 1 may use it to render two fieldsets. |
| `country` | relation manyToOne → `country` | yes | ADR-001. |
| `options` | list of `{ value, label, order }` | only for `select` | Options come from Strapi. |
| `placeholder` | string | no | Never used instead of a label. |
| `maskInSummary` | boolean | no (default `false`) | Used by SPEC-US-03 to mask the value in the summary. |

Each **validation rule** has: `type` (validator name; a Strapi enumeration per ADR-001), `value` (optional parameter, **stored as text in Strapi** so it can hold a `pattern` regex; the frontend mapper converts it to a number for `minLength`, `maxLength`, `min`, `max` and `minAge`, and a rule whose numeric `value` does not parse is ignored with a `console.warn` carrying the field key and validator name only; ADR-001, changed in v2) and `message` (optional; overrides the field's `errorMessage` for this rule).

The **country** entry provides at least: `code`, `name`, `numberLocale`, `currency`, `legalAge`, and the step copy in `copy` (repeatable `shared.copy-entry` `{ key, value }`; title, intro, "Continuar" text, generic error message; keys in 4.3). It does not carry document types (GAP-15).

The **`site-copy`** single type (ADR-001, added in v2) provides `copy` (repeatable `shared.copy-entry`) with the country-independent copy for the picker and the not-found page (GAP-24, keys in 4.3).

Only **published** fields are used by the app.

### 4.2 Requests

```
GET /api/site-copy?populate[0]=copy                                   # picker and not-found copy (GAP-24)
GET /api/countries?sort=name:asc&pagination[pageSize]=100            # root picker and country lookup (GAP-20)
GET /api/countries?filters[code][$eq]=CO&populate[0]=copy            # current country entry with its copy
GET /api/form-fields
  ?filters[country][code][$eq]=CO
  &sort[0]=order:asc&sort[1]=key:asc
  &populate[0]=options&populate[1]=validations
  &pagination[pageSize]=100
```

- `CO` is replaced by the route's country code in upper case.
- No `status` param: REST returns published documents only by default. Never `populate=*`. No auth header. GET only.
- Responses may be kept in memory for the session and shared with SPEC-US-02/03; they are never written to sessionStorage, so a reload always fetches the current configuration (US-01-AC-03).
- More than 100 fields per country is out of scope.

Example response (`/api/form-fields`, fictitious, one entry):

```json
{
  "data": [{
    "documentId": "f0rmfieldcl00000000000a1",
    "key": "documentNumber",
    "label": "RUT",
    "type": "text",
    "required": true,
    "helpText": "Ingresa tu RUT con dígito verificador.",
    "errorMessage": "Ingresa un RUT válido.",
    "placeholder": "11.111.111-1",
    "order": 2,
    "group": "policyholder",
    "maskInSummary": true,
    "options": [],
    "validations": [{ "type": "rut", "value": null, "message": null }]
  }],
  "meta": { "pagination": { "page": 1, "pageSize": 100, "pageCount": 1, "total": 1 } }
}
```

Frontend model (after mapping):

```ts
type FieldType = 'text' | 'number' | 'select' | 'date' | 'checkbox';
interface FieldOption { value: string; label: string; order: number; }
// value arrives as string | null from Strapi; the mapper converts numeric parameters (ADR-001)
interface ValidationRule { type: string; value: number | string | null; message: string | null; }
interface FormFieldConfig {
  key: string; label: string; type: FieldType; required: boolean;
  helpText: string | null; errorMessage: string | null; placeholder: string | null;
  order: number; group: 'policyholder' | 'vehicle'; maskInSummary: boolean;
  options: FieldOption[]; validations: ValidationRule[];
}
interface CountryConfig { code: string; name: string; numberLocale: string; currency: string; legalAge: number; copy: Record<string, string>; }
// Wizard state, step 1 part (per country, sessionStorage; shape per ADR-004)
type Step1Values = Record<string /* field key */, string | number | boolean | null>;
```

### 4.3 UI copy keys for step 1 (Spanish, seed)

Keys follow ADR-001's `<area>.<camelCaseName>` convention (changed in v2).

- **Per country (`country.copy`):** `form.title` ("Cotiza tu seguro de auto"), `form.intro` ("Completa tus datos y los de tu vehículo."), `form.loading` ("Cargando formulario…"), `form.error` ("No pudimos cargar el formulario."), `form.empty` ("Por ahora no podemos mostrar el formulario para tu país."), `form.genericError` ("Revisa este campo."), `common.continue` ("Continuar"), `common.retry` ("Reintentar").
- **Country-independent (`site-copy.copy`, GAP-24, added in v2):** `picker.title` ("Elige tu país"), `picker.intro` ("Selecciona el país donde quieres cotizar."), `picker.loading` ("Cargando países…"), `picker.error` ("No pudimos cargar los países."), `notFound.title` ("País no encontrado"), `notFound.message` ("No ofrecemos cotizaciones para este país."), `notFound.backToPicker` ("Volver a elegir país"), `common.retry` ("Reintentar").

If the copy itself is unavailable, only the minimal technical fallback in the frontend is used (error + retry).

### 4.4 Wizard state written by this step

Per GAP-09/GAP-21/GAP-22: on a valid "Continuar", the step 1 values (keyed by field `key`) are written to sessionStorage under the key for the current country (ADR-004). On load of step 1, stored values are restored for fields that still exist; values for fields no longer published are discarded; new fields start empty. Switching country does not clear the other country's stored state (GAP-25).

## 5. Validations

Supported validators (names are the contract with Strapi):

| Validator (`type`) | Parameter | Source | Rule (exact boundary) | Error message source | When shown |
|---|---|---|---|---|---|
| `required` | — | Strapi (`required: true` or rule) | Also implied by `required: true`. Checkbox: must be checked. | Precedence chain below | After blur or on "Continuar" |
| `minLength` / `maxLength` | integer | Strapi | Length of the trimmed string. | idem | idem |
| `min` / `max` | number | Strapi | Numeric value bounds (inclusive). | idem | idem |
| `pattern` | regex string | Strapi | Full match against the trimmed value. An invalid regex is ignored with a console warning. | idem | idem |
| `minAge` | integer (optional) | Named validator in code, selected by Strapi | Date of birth → age in completed years at today's date must be ≥ parameter; if no parameter, uses the country's `legalAge`. If neither exists, the rule fails closed (field invalid) and logs a warning (GAP-23). | idem | idem |
| `vehicleYear` | — | Named validator in code, selected by Strapi | Integer year with `currentYear − 20 ≤ year ≤ currentYear + 1`, both inclusive, computed at runtime. Also identifies the vehicle-year field for pricing (SPEC-US-02 GAP-12). | idem | idem |
| `rut` | — | Named validator in code, selected by Strapi | Chilean RUT: accepts input with or without dots and with or without a dash before the check digit (dash optional: human-confirmed at HC1) (`K` case-insensitive). Valid when the body is numeric and the check digit matches the standard public modulo-11 algorithm. Stored normalized (no dots, uppercase K). | idem | idem |
| `colombianId` | — | Named validator in code, selected by Strapi | Numeric only, 6 to 10 digits, no leading/trailing spaces after trim. Same rule for CC and CE. | idem | idem |

Rules:
- Error message precedence: rule `message` → field `errorMessage` → country generic error message (`form.genericError`).
- Unknown validator names are ignored and logged with `console.warn` (field key and validator name only, never the value). The form must still render.
- Parameters are stored as text in Strapi and converted by the frontend mapper (ADR-001); a numeric parameter that does not parse makes the rule ignored with a `console.warn` (field key and validator name only).
- Misconfigured fields are handled per GAP-23 (skip + warning, or fail closed for `minAge` without any age value).
- Validators are pure functions with unit tests; dates use the browser's local date.
- Example values in specs, tests and seed data are fictitious only (e.g. RUT `11.111.111-1`, cédula `1111111111`).

## 6. UI states

| State | Trigger | What the user sees | Copy source |
|-------|---------|--------------------|-------------|
| Loading | Country or form-fields request in flight | Loading indicator announced with `aria-live="polite"`; no form; no "Continuar" | Strapi (`form.loading`); technical fallback before country copy is loaded |
| Error | HTTP error, network error, or no response within 10 s | Error message and a "Reintentar" button that repeats the requests (back to Loading); "Continuar" is not available | Strapi (`form.error`, `common.retry`); technical fallback if Strapi is unreachable |
| Empty | The country has no published fields | Empty-state message; "Continuar" not available | Strapi (`form.empty`) or generic fallback |
| Success / default | ≥ 1 published field | Fields in `order` with labels, help texts; "Continuar" | Strapi |
| Invalid submit | "Continuar" with invalid fields | No navigation; all errors shown; focus on first invalid field | Strapi (precedence chain, section 5) |
| Valid submit | "Continuar" with a valid form | Values saved to the wizard state; navigation to `/{cc}/planes` | — |
| Country picker | `/` | One link per country returned by Strapi, labelled with its `name`, to `/{cc}/datos` | Strapi `country.name`; heading, intro, loading and error copy from `site-copy` (`picker.*`, `common.retry`; GAP-24) |
| Not found | Country code with no Strapi entry (GAP-20) | Not-found message and a link to the picker `/`; no form-fields request | `site-copy` (`notFound.*`; GAP-24); technical fallback if Strapi is unreachable |

Behavior notes (from the draft):
- **Persistence:** values are stored in sessionStorage under a key per country (ADR-004). Coming back to step 1 restores them. Values for fields that no longer exist in Strapi are discarded; new fields start empty. The other country's state is kept on country switch (GAP-25).
- **Security/content:** all CMS text is rendered as plain text (no HTML injection). The frontend only performs GET requests to Strapi, with no token.
- **Responsive:** one column on small screens; usable from 320 px width. Plain CSS, mobile-first, visible focus styles (GAP-18).

## 7. Accessibility

- **Rendering:** fields shown in `order`; each input has a visible `<label>`; help text and error are connected with `aria-describedby`; invalid fields get `aria-invalid="true"`; required fields expose the required state (`required` / `aria-required`).
- **When errors show:** after the field is touched (blur) or after pressing "Continuar".
- **Continuar:** if the form is invalid, no navigation happens, all errors are shown and focus moves to the first invalid field.
- **Loading:** announced with `aria-live="polite"`.
- **Keyboard:** the whole step (text, number, select, date, checkbox, "Continuar", "Reintentar") is completable with the keyboard only; focus is always visible.
- Placeholders are never used instead of labels.

## 8. Acceptance criteria

**Priority tags.** P1 = automated test required (original story ACs, plus derived ACs about validation, country filtering, security including the public write denial proof, and double submit). P2 = automated test if time allows, otherwise verified manually at HC4 and listed in the README.

Step 1 has no server write (it only navigates), so it has no double-submit AC; double submit is covered in SPEC-US-03.

```gherkin
# US-01-AC-01 — Form configured by country (original) [P1]
Scenario Outline: Form configured by country
  Given fields are configured and published in Strapi for Colombia and for Chile
  When I open "/<cc>/datos"
  Then I see only the published fields configured for <country>
  And they appear in the configured order
  Examples:
    | cc | country  |
    | co | Colombia |
    | cl | Chile    |

# US-01-AC-02 — Field validation (original) [P1]
Scenario: Field validation
  Given I am filling out the form
  When a field does not meet its configured validation
  Then I see the configured error message next to the field
  And I cannot move to the next step

# US-01-AC-03 — Configuration change without deployment (original) [P1]
Scenario: Configuration change without deployment
  Given the business team adds a new published field in Strapi
  When I reload the application
  Then the new field appears without code changes

# US-01-AC-04 — Keep data when going back (original) [P1]
Scenario: Keep data when going back
  Given I filled step 1 and moved on to step 2
  When I go back to step 1
  Then my data is still filled in

# US-01-AC-05 — Unpublished fields are not shown (derived from GAP-19) [P1]
Scenario: Unpublished fields are not shown
  Given a field for my country exists in Strapi as draft
  When I open step 1
  Then that field is not shown

# US-01-AC-06 — Select options come from Strapi (derived from story business rule "Select fields get their options from Strapi") [P1]
Scenario: Select options come from Strapi
  Given a select field has options configured in Strapi
  When I open the select
  Then I see exactly those options in the configured order

# US-01-AC-07 — Legal age (derived from GAP-03) [P1]
Scenario Outline: Legal age
  Given the country's legal age is 18
  When I enter a date of birth for a person who is <age> today
  Then the field is <result>
  Examples:
    | age                    | result  |
    | 17 (turns 18 tomorrow) | invalid |
    | 18 (turns 18 today)    | valid   |

# US-01-AC-08 — Vehicle year limits (derived from GAP-04) [P1]
Scenario Outline: Vehicle year limits
  When I enter the vehicle year <year>
  Then the field is <result>
  Examples:
    | year             | result  |
    | currentYear + 2  | invalid |
    | currentYear + 1  | valid   |
    | currentYear - 20 | valid   |
    | currentYear - 21 | invalid |

# US-01-AC-09 — Chilean RUT (derived from GAP-05) [P1]
Scenario Outline: Chilean RUT
  Given I am on "/cl/datos"
  When I enter the RUT "<rut>"
  Then the field is <result>
  Examples:
    | rut          | result  |
    | 11.111.111-1 | valid   |
    | 11111111-1   | valid   |
    | 111111111    | valid   |
    | 11.111.111-2 | invalid |
    | 11.111.111   | invalid |

# US-01-AC-10 — Colombian document number (derived from GAP-05) [P1]
Scenario Outline: Colombian document number
  Given I am on "/co/datos"
  When I enter the document number "<number>"
  Then the field is <result>
  Examples:
    | number      | result  |
    | 1111111111  | valid   |
    | 111111      | valid   |
    | 11111       | invalid |
    | 11111111111 | invalid |
    | 11111A1111  | invalid |

# US-01-AC-11 — Focus and announcement on invalid submit (derived from GAP-08) [P1]
Scenario: Focus and announcement on invalid submit
  Given some required fields are empty
  When I press "Continuar"
  Then focus moves to the first invalid field
  And each invalid field has aria-invalid="true" and its error linked by aria-describedby

# US-01-AC-12 — Keyboard-only completion (derived from GAP-27) [P1]
Scenario: Keyboard-only completion
  Given I use only the keyboard
  When I fill every field and press "Continuar"
  Then I reach step 2
  And every field has an accessible label

# US-01-AC-13 — State is isolated per country (derived from GAP-09) [P1]
Scenario: State is isolated per country
  Given I filled step 1 in "/co/datos"
  When I open "/cl/datos"
  Then the Chilean form is empty

# US-01-AC-14 — CMS text is rendered as plain text (derived from GAP-26) [P1]
Scenario: CMS text is rendered as plain text
  Given a label in Strapi contains HTML markup
  When the form renders
  Then the markup is shown as text and not interpreted

# US-01-AC-15 — Public role cannot write form fields, countries or site copy (derived from GAP-26, GAP-24) [P1] (changed in v2)
Scenario: Public role cannot write form fields, countries or site copy
  When an anonymous client sends POST, PUT or DELETE to the form-field endpoint
  Then Strapi responds 401 or 403
  And the same holds for POST, PUT or DELETE to the country endpoint
  And the same holds for PUT or DELETE to the site-copy endpoint
  And GET on the form-field, country and site-copy endpoints returns 200

# US-01-AC-16 — Unknown validator (derived from GAP-07) [P1]
Scenario: Unknown validator
  Given a field has a validator name the app does not know
  When the form renders
  Then the form still renders and the unknown rule is ignored
  And a warning is logged without the field value

# US-01-AC-17 — Loading and error states (derived from GAP-11, GAP-16) [P2]
Scenario: Loading and error states
  Given the request for fields fails or takes more than 10 seconds
  When I open step 1
  Then I see an error message and a "Reintentar" button
  And pressing "Reintentar" requests the fields again

# US-01-AC-18 — No fields configured (derived from GAP-16) [P2]
Scenario: No fields configured
  Given my country has no published fields
  When I open step 1
  Then I see an empty-state message and cannot continue

# US-01-AC-19 — Error message fallback (derived from GAP-06) [P1]
Scenario: Error message fallback
  Given a field has no rule message and no errorMessage
  When it fails validation
  Then I see the country's generic error message

# US-01-AC-20 — Removed field data is discarded (derived from GAP-10) [P2]
Scenario: Removed field data is discarded
  Given I stored data for a field that is later removed in Strapi
  When I reload step 1
  Then the removed field is not shown and its value is not kept

# US-01-AC-21 — Small screens (derived from GAP-27) [P2]
Scenario: Small screens
  Given a 320 px wide viewport
  When I fill the form
  Then fields are shown in one column without horizontal scrolling

# US-01-AC-22 — Country picker from Strapi (derived from GAP-01, GAP-20) [P1]
Scenario: Root shows the countries configured in Strapi
  Given Strapi returns the countries "Colombia" (CO) and "Chile" (CL)
  When I open "/"
  Then I see one link per country, labelled with its Strapi name
  When I activate "Chile"
  Then I am on "/cl/datos"

# US-01-AC-23 — Unknown country code (derived from GAP-01, GAP-20) [P1]
Scenario: Unknown country code shows not-found
  Given Strapi has no country with code "ZZ"
  When I open "/zz/datos"
  Then I see the not-found page with a link to "/"
  And no form-fields request is made

# US-01-AC-24 — Misconfigured fields do not break the form (derived from GAP-23) [P2]
Scenario Outline: Misconfigured field
  Given my country has the published fields "firstName" (valid) and a field "<key>" misconfigured as <case>
  When the form renders
  Then the field "firstName" is shown
  And <outcome>
  And a console warning is logged with the field key and the reason only, never a value
  Examples:
    | key       | case                                                                 | outcome                                                                 |
    | extra     | type "slider" (unknown)                                              | no input for "extra" is rendered                                        |
    | fuelType  | select with no options                                               | no input for "fuelType" is rendered                                     |
    | plate     | two fields share key "plate" (orders 3 and 5)                        | only one "plate" input is rendered, the one with order 3                |
    | birthDate | date with validator "minAge" without a value, country with no legalAge | the "birthDate" field is shown and is invalid for any entered date    |

# US-01-AC-25 — Loading state (derived from GAP-16) [P2]
Scenario: Loading state while the configuration loads
  Given the country and form-fields requests have not responded yet
  When I open "/co/datos"
  Then I see the loading message inside a region with aria-live="polite"
  And no form field and no "Continuar" button are shown
  When the form-fields response arrives
  Then the loading message is no longer shown
  And the fields and the "Continuar" button are shown
```

## 9. Test mapping

P1 rows require an automated test. P2 rows: automated if time allows; otherwise verified manually at HC4 and listed in the README. "unit (component)" = Angular component test in Vitest with mocked Strapi responses.

| AC ID | Priority | Test level | Test name (starts with AC ID) | Country | Notes |
|-------|----------|------------|-------------------------------|---------|-------|
| US-01-AC-01 | P1 | unit (component) | `US-01-AC-01 renders only the country's published fields in order` | CO, CL | Original. Country filtering |
| US-01-AC-02 | P1 | unit | `US-01-AC-02 shows configured error message and blocks continue` | CO, CL | Original. Validators, error precedence, form builder |
| US-01-AC-03 | P1 | unit (component) | `US-01-AC-03 renders a newly published field without code changes` | CO | Original |
| US-01-AC-04 | P1 | e2e | `US-01-AC-04 keeps step 1 data when going back` | CO | Original. Playwright, full flow for one country |
| US-01-AC-05 | P1 | e2e | `US-01-AC-05 hides unpublished fields` | CO, CL | Against running Strapi with a seeded draft field. **The Phase 2 seed must include one draft form field per country** (section 3) |
| US-01-AC-06 | P1 | unit (component) | `US-01-AC-06 renders select options from Strapi in order` | CO | |
| US-01-AC-07 | P1 | unit | `US-01-AC-07 validates legal age at today's date` | n/a | Validation. Fixed clock |
| US-01-AC-08 | P1 | unit | `US-01-AC-08 validates vehicle year limits` | n/a | Validation. Fixed clock |
| US-01-AC-09 | P1 | unit | `US-01-AC-09 validates Chilean RUT` | CL | Validation. Fictitious RUTs only |
| US-01-AC-10 | P1 | unit | `US-01-AC-10 validates Colombian document number` | CO | Validation. Fictitious numbers only |
| US-01-AC-11 | P1 | unit (component) | `US-01-AC-11 focuses first invalid field on continue` | CO | Validation (invalid submit) |
| US-01-AC-12 | P1 | e2e | `US-01-AC-12 completes step 1 with keyboard only` | CO | Keyboard is an explicit requirement. One keyboard-only e2e covers the whole wizard (steps 1–3); this test name covers step 1 within it |
| US-01-AC-13 | P1 | unit (component) | `US-01-AC-13 isolates wizard state per country` | CO, CL | Country filtering. Other country's state is kept (GAP-25) |
| US-01-AC-14 | P1 | unit (component) | `US-01-AC-14 renders CMS text as plain text` | n/a | Security (XSS) |
| US-01-AC-15 | P1 | e2e (API) | `US-01-AC-15 public write to form-fields, countries and site-copy is denied` | n/a | Security. Against running Strapi; shared with the ADR-003 test. Denial asserted as 401 or 403; GET asserted as 200. Changed in v2: adds `site-copy` and the 401-or-403 assertion |
| US-01-AC-16 | P1 | unit | `US-01-AC-16 ignores unknown validator with a warning` | n/a | Validation |
| US-01-AC-17 | P2 | unit (component) or manual | `US-01-AC-17 shows error state and retries` | CO | Timeout with fake timers |
| US-01-AC-18 | P2 | unit (component) or manual | `US-01-AC-18 shows empty state when no fields` | CO | |
| US-01-AC-19 | P1 | unit | `US-01-AC-19 falls back to country generic error message` | n/a | Validation |
| US-01-AC-20 | P2 | unit (component) | `US-01-AC-20 discards stored value of removed field` | CO | |
| US-01-AC-21 | P2 | e2e or manual | `US-01-AC-21 shows one column at 320 px` | CO, CL | Manual visual check at HC4 |
| US-01-AC-22 | P1 | e2e | `US-01-AC-22 lists countries from Strapi on the picker` | CO, CL | Country filtering / resolution |
| US-01-AC-23 | P1 | e2e | `US-01-AC-23 shows not-found for unknown country code` | n/a | Country resolution; fictitious code `zz` |
| US-01-AC-24 | P2 | unit (component) | `US-01-AC-24 skips misconfigured fields with a warning` | n/a | Mocked Strapi responses with the four misconfigurations; spy on `console.warn` and assert no value in the message |
| US-01-AC-25 | P2 | unit (component) or manual | `US-01-AC-25 shows loading state while configuration loads` | CO | Delayed mock response |

## 10. Out of scope

- Checking documents, plates or people against official registries (format/checksum validation only).
- Editing content from the app (Strapi admin is the only editor).
- Address autocomplete or dependent selects (e.g. model depends on make).
- More than 100 fields per country.
- Plans, pricing, summary, terms and payment (US-02, US-03).

## Changelog

| Version | Date | Change | Reason / source | ACs affected | Approval (HC1) |
|---------|------|--------|-----------------|--------------|----------------|
| 1 | 2026-11-23 | Initial spec drafted by the human (Andres Beltran) outside Claude Code in his Claude.ai planning chat after two spec-writer runs were blocked by a safety classifier; reviewed by the human; reviewed and completed by spec-writer (format, P1/P2 tags, consistency with SPEC-US-02/03); HC1 decisions applied before approval: OQ-1..OQ-5 resolved, AC-16/AC-19 → P1, new P2 ACs for misconfigured fields and loading state, AC-05 e2e with seeded draft field | US-01; human decisions in `docs/prompts/phase-1-prompt.md` and at HC1 (Andres Beltran, 2026-11-23) | all (new: US-01-AC-24, US-01-AC-25; retagged: US-01-AC-16, US-01-AC-19; test level: US-01-AC-05) | APPROVED – Andres Beltran – 2026-11-23 |
| 2 | 2026-11-23 | GAP-24 resolved by the `site-copy` single type (request `GET /api/site-copy?populate[0]=copy`, keys `picker.*`, `notFound.*`, `common.retry`; §4.1, §4.2, §4.3, §6); country request adds `populate[0]=copy`; copy keys follow `<area>.<camelCaseName>`; validation rule `value` stored as text and converted by the frontend mapper (§4.1, §5); `country` relation is manyToOne → `country`; GAP-26 and US-01-AC-15 cover `site-copy` and assert denial as 401 or 403; "Decisions needed (ADR)" closed; front matter `adrs` filled | Alignment with accepted ADR-001..004 (HC2) | US-01-AC-15 (changed: adds `site-copy`, 401 or 403; test name updated) | APPROVED – Andres Beltran – 2026-11-23 |
