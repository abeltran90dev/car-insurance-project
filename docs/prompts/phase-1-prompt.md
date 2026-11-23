# Phase 1 — Specs and ADRs

Goal of this session: produce the three specs (US-01, US-02, US-03) and the ADRs they need, through HC1 and HC2. **No application code.** Deadline for the whole assessment is today 23:59, so keep outputs concise and complete; no extra rounds beyond what the flow requires.

## Step 1 — Specs (spec-writer, in parallel)

Run the `spec-writer` subagent three times **in parallel**, one per story (`docs/user-stories/US-01.md`, `US-02.md`, `US-03.md`), each producing `docs/specs/SPEC-US-XX.md` with `status: Draft`, following the `spec-authoring` skill.

The spec-writer must still detect gaps on its own. For the gaps listed below, I have already decided the resolution: the spec-writer records them as `GAP-NN` with **"Resolution: human decision (Andres Beltran)"** and uses them. Any gap not covered here stays as an open question for me.

### Human decisions on known gaps

**Cross-cutting**
- Country resolution: route prefix `/co` and `/cl` (e.g. `/co/datos`, `/co/planes`, `/co/resumen`, `/co/confirmacion`). Root `/` shows a simple country picker. Unknown country code → not-found page with a link to the picker. Final mechanism is recorded in an ADR.
- UI copy in Spanish, served from Strapi per country (labels, help texts, error messages, step titles, button texts where practical). Currency, locale and document types come from the country entry.
- Wizard state persisted in `sessionStorage` (not `localStorage`: personal data must not outlive the tab), keyed by country. Cleared after successful payment. Switching country starts a new quote.
- Loading, error (with retry) and empty states are mandatory for every Strapi call.
- Navigation guards: cannot open step 2 without a valid step 1, nor step 3 without a selected plan; redirect to the first incomplete step.
- Styling: plain CSS (no UI library), mobile-first, visible focus styles.

**US-01**
- Legal age: 18 in both countries (configured per country in Strapi, not hard-coded). Age computed from date of birth against today's date.
- Vehicle year: valid if `currentYear - 20 <= year <= currentYear + 1` (both limits inclusive), computed at runtime, never hard-coded.
- Validation types supported by the form engine (configured in Strapi per field): `required`, `minLength`, `maxLength`, `min`, `max`, `pattern`, plus named special validators `minAge`, `vehicleYear`, `rut` (Chilean RUT with modulo-11 check digit, accepts with or without dots/dash), `colombianId` (numeric, 6–10 digits). Unknown validator names from Strapi are ignored and logged to the console as a warning (the form must not crash).
- Error message shown is the one configured in Strapi for that field; generic fallback per country if missing.
- Errors appear after the field is touched or on "Continue"; on "Continue" with errors, focus moves to the first invalid field.
- Unpublished fields are never shown. Fields are sorted by `order`.

**US-02**
- Simulated pricing rule (documented in the spec and in the UI as "precio estimado"): `final = basePrice × ageFactor`, where vehicle age 0–5 years → 1.00, 6–10 → 1.15, 11–20 → 1.30. Rounded to whole currency units (both COP and CLP have no decimals in display).
- Price formatting with `Intl.NumberFormat` using the country's locale and currency (`es-CO`/`COP`, `es-CL`/`CLP`).
- If more than one plan is flagged as recommended, only the first by `order` is highlighted.
- Only one plan selectable (radio-group semantics, keyboard accessible).

**US-03**
- Masking: show only the last 4 characters of the document number (e.g. `******5678`); RUT keeps its check digit visible among those 4.
- "Edit data" returns to step 1 with data kept; "Change plan" returns to step 2 with the current plan preselected.
- Terms text per country from Strapi; pay button disabled until the checkbox is checked.
- Simulated payment: a mock gateway screen inside the app with two buttons, "Simular pago aprobado" and "Simular pago rechazado", and a ~1.5 s simulated processing delay. Payment button locked while processing (no double submit).
- Success: confirmation screen with quote number `COT-{CC}-{YYYYMMDD}-{6 random alphanumerics}`. Rejection: clear error message, user stays on summary with all data kept and can retry.
- No card data is ever requested or stored.

## HC1 — stop here

When the three specs exist, STOP and give me, per spec: gaps found (marking which ones the agent found beyond my list), open questions, and decisions that need an ADR. Wait for `APPROVED` or `REJECTED: <reason>` per spec. Only after my `APPROVED`, set `status: Approved`, `approved_by: Andres Beltran`, `approved_on: <today>`.

## Step 2 — ADRs (architect)

After HC1, run the `architect` subagent with the approved specs. Expected ADRs (the architect may merge or add if justified):

- **ADR-001 Multi-country content strategy in Strapi and Angular** (mandatory). Compare at least: (a) a `country` collection type with relations from form fields, plans and terms; (b) Strapi i18n locales `es-CO`/`es-CL` as countries; (c) separate content types per country; (d) a single JSON config entry per country. Include how Angular consumes it (one build, runtime country), how a third country would be added, and the impact on the business team's editing experience.
- **ADR-002 Country resolution in the frontend** (route prefix vs subdomain vs selector/state only).
- **ADR-003 Strapi public permissions and security** (automatic bootstrap allow-list, read-only public role, no tokens in the browser, CORS, 403 test).
- **ADR-004 Wizard state and personal data in the browser** (sessionStorage vs localStorage vs memory only).
- **ADR-005 Development flow: own SDD variant vs Spec Kit/Kiro, and Claude Code as tool** (why own lightweight variant fits a 1-day delivery and the subagent design).

## HC2 — stop here

STOP and summarize each ADR in 3–4 lines (options, choice, main consequence). Wait for my `APPROVED` or `REJECTED: <reason>` per ADR. After approval set `status: Accepted` and `deciders: Andres Beltran`.

## Close

After HC2, update the FLOW.md traceability table if needed, commit to `main` with
`docs(specs): add SPEC-US-01..03 and ADR-001..005` (trailer `Refs: US-01, US-02, US-03`) and push. Then remind me to `/export` this session.
