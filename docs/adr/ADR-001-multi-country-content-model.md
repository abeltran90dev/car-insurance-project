---
id: ADR-001
title: Multi-country content model in Strapi and how Angular consumes it
status: Accepted          # Proposed | Accepted | Superseded
date: 2026-11-23
deciders: Andres Beltran
related_specs: [SPEC-US-01, SPEC-US-02, SPEC-US-03]
supersedes:
superseded_by:
---

# ADR-001: Multi-country content model in Strapi and how Angular consumes it

## Context and problem statement

One Angular build serves Colombia (CO) and Chile (CL). Everything a user sees comes from Strapi for the current country: form fields and their validations, select options, plans, terms, currency/locale, legal age, and all Spanish UI copy (CLAUDE.md non-negotiables 1–2). The countries differ in **structure**, not only in wording. CO has a document-type select plus a document number; CL has a single RUT field; plans, prices and terms differ too. The approved specs left open several points: the physical shape of validation rules (SPEC-US-01 §2 "Decisions needed" vs SPEC-US-03 §4), where UI copy and terms live, the naming of copy keys (SPEC-US-02 uses `common.retry`, SPEC-US-03 uses `retryLabel`), and where the copy for the root country picker and the not-found page lives when no country is selected yet (SPEC-US-01 GAP-24). How do we model country-specific content in Strapi so the business team can edit it without deployments, and how does Angular consume it at runtime?

## Decision drivers

- One build serves CO and CL; no code branches keyed on country content (non-negotiable 1).
- Form fields, options, validations, plans, prices and copy are 100% from Strapi (non-negotiable 2; US-01, US-02).
- Per-field Draft & Publish: an unpublished field must not appear (US-01-AC-05), and new fields appear on reload (US-01-AC-03).
- The countries differ in field set, order and validators, not only in translation (SPEC-US-01 §3).
- Adding a third country should need no code change and no deployment unless it needs a new named validator.
- The business team edits with the standard Strapi admin UI and no raw JSON.
- Read-only Public role with a small explicit allow-list (non-negotiable 4, ADR-003).
- Deadline: one day. Prefer the model the specs and the `strapi5-content-modeling` skill already assume.

## Considered options

1. **(a) `country` collection type, with `form-field` and `plan` related to it (manyToOne); copy and terms on the country entry**
2. **(b) Strapi i18n: locales `es-CO` / `es-CL` used as the country axis**
3. **(c) Separate content types per country** (`form-field-co`, `form-field-cl`, `plan-co`, …)
4. **(d) A single JSON configuration entry per country** (`country.config` of type `json` holding fields, plans and copy)

## Decision outcome

**Chosen option:** "(a) `country` collection type with relations", because it is the only option that models countries that differ **structurally** while keeping per-field and per-plan Draft & Publish (US-01-AC-05, US-02-AC-01). It also keeps country selection a data filter (`filters[country][code][$eq]=CO`, verified as supported deep filtering) rather than a code branch. A third country is just new entries. It is also the baseline the three approved specs already use, so it adds no spec churn beyond the alignments listed below.

### Model (physical shape)

| Type | Kind / D&P | Attributes |
|------|-----------|------------|
| `country` | collection type, **D&P off** (so `unique` on `code` is enforced on save) | `code` (string, required, unique, ISO 3166-1 alpha-2 **upper case**: `CO`, `CL`), `name` (string, required, shown on the picker), `numberLocale` (string, required, BCP 47 tag: `es-CO`, `es-CL`), `currency` (string, required, ISO 4217: `COP`, `CLP`), `legalAge` (integer, required in the schema, seed 18; the frontend still fails closed if it is missing, SPEC-US-01 GAP-23), `termsTitle` (string), `termsBody` (text, plain), `copy` (component `shared.copy-entry`, repeatable) |
| `form-field` | collection type, **D&P on** | `key`, `label`, `type` (enum `text, number, select, date, checkbox`), `required` (boolean), `helpText`, `errorMessage`, `placeholder`, `order` (integer), `group` (enum `policyholder, vehicle`, required), `maskInSummary` (boolean, default `false`), `options` (component `form.option`, repeatable), `validations` (component `form.validation-rule`, repeatable), `country` (relation manyToOne → `country`) |
| `form.option` | component | `value` (string), `label` (string), `order` (integer) |
| `form.validation-rule` | component | `type` (enumeration, exactly: `required, minLength, maxLength, min, max, pattern, minAge, vehicleYear, rut, colombianId`), `value` (string, optional), `message` (string, optional) |
| `plan` | collection type, **D&P on** | as SPEC-US-02 §4.1: `name`, `shortDescription`, `basePrice` (decimal), `currency`, `order`, `recommended`, `active`, `coverages`, `benefits` (components `plan.coverage` / `plan.benefit`), `country` (manyToOne → `country`) |
| `shared.copy-entry` | component | `key` (string, required), `value` (text, required) |
| `site-copy` | **single type**, D&P off | `copy` (component `shared.copy-entry`, repeatable): country-independent copy for `/` and the not-found page |

Sub-decisions required by the human at HC1:

1. **Validation rules = repeatable list `{ type, value, message }`** with validator names exactly as in SPEC-US-01 §5. `type` is a Strapi **enumeration**, so the business team picks from a dropdown and cannot mistype a name. The frontend still ignores unknown names with a warning (US-01-AC-16), because the enum and the code can drift. `value` is a **string** in Strapi (it must hold a regex for `pattern`). The frontend mapper parses it to a number for `minLength`, `maxLength`, `min`, `max` and `minAge`. A rule whose numeric `value` does not parse is ignored with a `console.warn` (field key and validator name only). The frontend model stays `value: number | string | null` (SPEC-US-01 §4.2). The boolean `required` attribute and a `required` rule mean the same thing.
2. **Copy key convention: `<area>.<camelCaseName>`**, all keys dotted. Areas: `common` (texts shared by several steps: `common.continue`, `common.back`, `common.retry`, `common.yes`, `common.no`), `form`, `plans`, `summary`, `payment`, `confirmation` (per-country copy on `country.copy`), and `picker`, `notFound` (on `site-copy`). SPEC-US-01 §4.3 and SPEC-US-02 §4.3 already comply. SPEC-US-03 §4 must be renamed (mapping in "Consequences").
3. **Picker and not-found copy (SPEC-US-01 GAP-24)** lives in the `site-copy` single type: `picker.title`, `picker.intro`, `picker.loading`, `picker.error`, `notFound.title`, `notFound.message`, `notFound.backToPicker`, `common.retry`. It is fetched with `GET /api/site-copy?populate[0]=copy`. The frontend's hard-coded Spanish is used only when Strapi is unreachable (CLAUDE.md language policy). Country names on the picker come from `country.name`. **Human decision at HC2 (Andres Beltran, 2026-11-23):** `site-copy` is accepted as a fourth public read-only type (`find` only, ADR-003 allow-list).
4. **Terms per country** are the `termsTitle` / `termsBody` attributes of `country`, not copy entries: they are content, can be long, and are rendered as plain text with `white-space: pre-line` (SPEC-US-03 GAP-20).
5. **`numberLocale` and `currency`** are on `country` and are the only inputs to `Intl.NumberFormat` / `Intl.DateTimeFormat`. If `Intl` throws (invalid tag or currency code), the country is treated as misconfigured: error state plus `console.warn`.
6. **`group` and `maskInSummary`** are on `form-field` as specified (SPEC-US-01 §4.1, SPEC-US-03 GAP-13/GAP-14).

### How Angular consumes it (one build, runtime country)

- The country code comes from the route (ADR-002). A root `CountryContext` service loads `GET /api/countries?filters[code][$eq]=CO&populate[0]=copy` and exposes a typed `CountryConfig` signal (`code, name, numberLocale, currency, legalAge, termsTitle, termsBody, copy: Record<string,string>`).
- Feature services request `form-fields` and `plans` filtered by `country.code` and map raw Strapi responses to the domain models in SPEC-US-01/02 in one mapper per type. Components never see Strapi shapes, so a later model change stays inside the mappers.
- Copy lookup goes through one pure function, `copy(config, key)`. A missing key logs `console.warn(key)`. For keys with a technical fallback (loading, generic error, retry) the fallback is shown; otherwise the key name is shown, which is a visible defect caught by the seed check below.
- Nothing in the code is keyed on `'CO'`/`'CL'`. The codes only appear in seed data and tests.

### Adding a third country (e.g. `PE`)

In the admin: create a `country` entry (code, name, locale, currency, legal age, terms, all copy keys), then create and publish its `form-field` and `plan` entries related to it. No code change, no deployment, no permission change. Two exceptions: if it needs a validator that does not exist yet (e.g. a new national ID algorithm), that is a code change **plus** an enum value in `form.validation-rule` (one deployment of both); and if it uses a language other than Spanish, `site-copy` (picker, not-found) stays in Spanish.

### Consequences

- **Positive:** Countries can differ in fields, order, options, validators, plans and terms with no code branching. US-01-AC-01/03/05 and US-02-AC-01 are satisfied by plain REST filters plus Draft & Publish.
- **Positive:** Editing experience. The business team sees one "Form fields" list and one "Plans" list, filterable by country, edits each field with a form (dropdowns for type, group and validator), stages changes as drafts, and edits copy and terms inside the country entry. No JSON.
- **Positive:** Smallest Public allow-list: `find` on `country`, `form-field`, `plan`, `site-copy` (components need no permission). Recorded in ADR-003.
- **Negative:** Copy keys are free-text `key` strings. An editor can rename or delete a key, and the UI then shows the key name. Mitigation: a unit test checks that the seed contains every key in the frontend's `COPY_KEYS` registry, plus a missing-key console warning. Copy has no per-entry draft/publish: a copy edit goes live on save, because `country` has D&P off.
- **Negative:** The business team **cannot** add a new validator type, a new field type, per-country pricing factors (SPEC-US-02 GAP-13), rich-text terms, or a picker in a language other than Spanish without a code change. Ordering is an integer `order`, not drag and drop. A field saved without a country relation is silently invisible. Whether Strapi 5 can mark a relation as required in the schema is **[unverified]**; mitigation: seed review and an admin how-to in the README.
- **Negative:** Deep filtering through a relation can cost performance at scale (Strapi docs warning). Irrelevant at fewer than 100 entries per country.
- **Negative (cost to reverse):** Moving to i18n (b) or JSON (d) later means migrating all entries and rewriting the seed. The frontend impact is limited to the three mappers and the request builders.
- **Follow-up (spec change loop after HC2, then skill updates):**
  - **SPEC-US-03 §4** uses `populate[1]=validation` (single component with a `rule` enum). It must become `populate[1]=validations` with the repeatable `{type, value, message}` shape, and its form-fields sort must add `sort[1]=key:asc` (and the plans sort `sort[1]=name:asc`, matching SPEC-US-02).
  - **SPEC-US-03 §4 copy keys** renamed: `summaryTitle`→`summary.title`, `policyholderTitle`→`summary.policyholderTitle`, `vehicleTitle`→`summary.vehicleTitle`, `planTitle`→`summary.planTitle`, `estimatedPriceLabel`→`summary.priceLabel`, `editDataLabel`→`summary.editData`, `changePlanLabel`→`summary.changePlan`, `termsAcceptLabel`→`summary.termsAccept`, `termsUnavailableMessage`→`summary.termsUnavailable`, `planUnavailableMessage`→`summary.planUnavailable`, `loadErrorMessage`→`summary.error`, (new) `summary.loading`, `payLabel`→`payment.pay`, `gatewayTitle`→`payment.gatewayTitle`, `simulateApproveLabel`→`payment.simulateApprove`, `simulateRejectLabel`→`payment.simulateReject`, `gatewayCancelLabel`→`payment.cancel`, `processingText`→`payment.processing`, `paymentRejectedMessage`→`payment.rejected`, `confirmationTitle`→`confirmation.title`, `quoteNumberLabel`→`confirmation.quoteNumberLabel`, `newQuoteLabel`→`confirmation.newQuote`, `yesLabel`→`common.yes`, `noLabel`→`common.no`, `retryLabel`→`common.retry`.
  - **SPEC-US-03 GAP-02** says "document types from the country entry", which contradicts SPEC-US-01 GAP-15 (the country carries no document types). Align it to SPEC-US-01.
  - **SPEC-US-01:** GAP-24 resolved by `site-copy` (add the request, the keys above, and the `site-copy` denied/200 check to US-01-AC-15). §4.2 country request adds `populate[0]=copy`. Rule `value` is a Strapi string parsed by the mapper. `country` relation is "manyToOne → country".
  - **SPEC-US-02 / SPEC-US-03:** the country request adds `populate[0]=copy`. Fill `adrs:` in the front matter of all three specs.
  - **`strapi5-content-modeling` skill** §2 and §4: replace `form.validation` and the `rule` enum (`cl-rut`, …) with `form.validation-rule` as above; add `shared.copy-entry` and `site-copy`; update the canonical requests. **`angular-conventions` skill** §5: validator names as above.

### Confirmation

- Unit: mapper tests for `form-field` (rule `value` parsing, unknown `type`), `country` (copy array → record) and `plan`. A seed completeness test: every key in `COPY_KEYS` exists in each country's seed copy and in the `site-copy` seed.
- E2E: US-01-AC-01 and US-02-AC-01 run for CO and CL against the seeded stack. US-01-AC-05 uses a seeded draft field.
- Review checklist: no string literal `'CO'`/`'CL'`/`'co'`/`'cl'` in `frontend/src/app` outside tests; no hard-coded Spanish beyond the technical fallback.

## Pros and cons of the options

### (a) `country` collection type + relations (chosen)

`form-field` → manyToOne `country`; `GET /api/form-fields?filters[country][code][$eq]=CL`.

- Good, because it represents structural differences per country (different fields and validators) naturally.
- Good, because each field and plan has its own Draft & Publish (US-01-AC-05).
- Good, because a third country is data only, and the frontend filters by code without branching.
- Good, because it is already the baseline in the specs and the skill, so it costs the least on a one-day deadline.
- Bad, because country-level copy lives in a key/value list (typo risk on keys) and has no draft stage.
- Bad, because a missing relation makes an entry invisible without an error.

### (b) i18n locales `es-CO` / `es-CL` as countries

Enable i18n on `form-field`, `plan` and a copy type; `GET /api/form-fields?locale=es-CL`.

- Good, because it is a first-class Strapi feature: the admin has a locale switcher, there is "fill in from another locale", shared (non-localized) fields exist, and single types can be localized (verified).
- Good, because copy for each country lives naturally in the locale version of a single type.
- Bad, because i18n is designed for translations of the **same** document. Our countries have different documents (CO document-type select has no CL counterpart). Country and language are conflated: a future `en` translation per country would need `en-CO`-style locales.
- Bad, because an omitted `locale` silently returns the **default** locale (verified). One missing parameter serves CO content to a CL user instead of failing.
- Bad, because custom locales cannot be created (verified: "It is not possible to create custom locales"). The country axis is limited to Strapi's predefined locale list, and deleting a locale irreversibly deletes its content (verified).
- Bad, because `legalAge`, `currency` and the country list for the picker still need a country entity or config, so it does not remove (a), it adds to it.

### (c) Separate content types per country

`form-field-co`, `form-field-cl`, `plan-co`, `plan-cl`, each with its own endpoint.

- Good, because each country is completely isolated in the admin and in the API.
- Good, because the queries are simple (no relation filter).
- Bad, because the frontend needs a code → endpoint map, which is a code branch keyed on country (against non-negotiable 1 in spirit).
- Bad, because a third country needs new schemas, a deployment, a new allow-list in ADR-003, and new seed code. Every schema change is duplicated per country.
- Bad, because the business team sees N copies of every list, and shared improvements must be made N times.

### (d) Single JSON config entry per country

`country.config` (`json`) holds `{ fields: [...], plans: [...], copy: {...} }`.

- Good, because it is one request per country, and the shape is completely flexible with no schema changes.
- Good, because the frontend mapping is trivial.
- Bad, because the business team edits raw JSON in the admin, with no field-level form, no dropdowns, and no validation. One syntax or shape error takes down the whole country.
- Bad, because there is no per-field or per-plan Draft & Publish: the whole JSON is one entry, so US-01-AC-05 cannot be expressed.
- Bad, because there is no relational filtering or ordering in Strapi; the frontend does it all and must validate the whole blob defensively.

## Links

- Specs: [SPEC-US-01](../specs/SPEC-US-01.md) (§2 GAP-15, GAP-23, GAP-24; §4; §5), [SPEC-US-02](../specs/SPEC-US-02.md) (§4), [SPEC-US-03](../specs/SPEC-US-03.md) (§4, GAP-02, GAP-13, GAP-14, GAP-20)
- Related ADRs: ADR-002 (country resolution), ADR-003 (public permissions), ADR-004 (wizard state)
- Sources (official docs, checked 2026-11-23):
  - https://docs.strapi.io/cms/features/internationalization (disabled by default; per-field localization and shared fields; custom locales not possible; deleting a locale deletes its content)
  - https://docs.strapi.io/cms/api/rest/locale (omitted `locale` → default locale; single types localizable)
  - https://docs.strapi.io/cms/api/rest/filters (deep filtering on relations; `$eq`/`$eqi`; performance warning)
  - https://docs.strapi.io/cms/features/draft-and-publish (configurable per content type)
  - https://docs.strapi.io/cms/api/rest/status (REST defaults to `published`)
  - `strapi5-content-modeling` skill §1–§4, §9 (components, schema files, `unique` not enforced on draft saves)
- Unverified: whether a relation can be marked required in the Strapi 5 schema; whether enumeration values may contain dots (not needed: copy keys are strings, not enums).
