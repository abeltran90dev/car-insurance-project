---
id: ADR-004
title: Where wizard state and personal data live in the browser
status: Accepted          # Proposed | Accepted | Superseded
date: 2026-11-23
deciders: Andres Beltran
related_specs: [SPEC-US-01, SPEC-US-02, SPEC-US-03]
supersedes:
superseded_by:
---

# ADR-004: Where wizard state and personal data live in the browser

## Context and problem statement

The wizard collects personal data (fictitious in this repo, but treated as real PII): name, date of birth, a national document number, and a plate. It must survive going back and forth between steps and a reload (US-01-AC-04, US-02-AC-11). Each country keeps its own state (SPEC-US-01 GAP-25), and the state is cleared after a successful payment (US-03-AC-10). There is no backend for quotes, and writing to Strapi is ruled out by ADR-003. The human chose `sessionStorage` keyed by country at HC1 (SPEC-US-01 GAP-09). This ADR records the alternatives and fixes the key, the stored shape, what is never stored, and the clearing rules. Where should wizard state live, and exactly what goes into it?

## Decision drivers

- PII minimization: personal data must not outlive the tab (SPEC-US-01 GAP-09).
- Reload and back navigation keep data (US-01-AC-04, US-02-AC-11).
- State isolated per country; the other country's state is kept on switch (US-01-AC-13, GAP-25).
- Cleared after approved payment; confirmation is not recoverable by reload (SPEC-US-03 GAP-22, US-03-AC-10, AC-18).
- No price snapshot: the price is always recomputed (SPEC-US-02 GAP-19, SPEC-US-03 GAP-15).
- No card data, ever (non-negotiable 6, US-03-AC-12).
- Simple to implement with signals in one store (`angular-conventions` §3).

## Considered options

1. **`sessionStorage`, one versioned entry per country**
2. **`localStorage`, one entry per country** (optionally with an expiry timestamp)
3. **Memory only** (signals in a root service, nothing persisted)
4. **Server-side draft quote** (written to Strapi or another backend)

## Decision outcome

**Chosen option:** "`sessionStorage`, one versioned entry per country", because it is the smallest storage that still survives reload in the same tab. It is partitioned by origin **and tab** and cleared when the tab closes (verified), which matches the PII driver. Memory-only fails the reload ACs, and `localStorage` outlives the tab.

### Key, shape and rules

- **Key:** `quote:v1:{CC}`, with `CC` the upper-case Strapi country code (`quote:v1:CO`). One entry per country; nothing global.
- **Stored shape (only this):**
  ```ts
  interface StoredQuote {
    v: 1;
    country: string;                 // 'CO' – must equal the key's code
    values: Record<string /* form-field key */, string | number | boolean | null>; // normalized per SPEC-US-01 GAP-21
    planDocumentId: string | null;   // SPEC-US-02 GAP-17
  }
  ```
- **Never stored (memory only or not at all):** prices of any kind (always `computeFinalPrice` from current data), plan details, Strapi configuration or copy (memory cache only, SPEC-US-01 §4.2), terms acceptance (memory, reset on every summary entry, SPEC-US-03 GAP-18), payment state, confirmation and quote number (memory only, SPEC-US-03 GAP-22), and any card data.
- **Writes:** step 1 values only on a valid "Continuar" (SPEC-US-01 GAP-22). `planDocumentId` on selection, so a reload of `/cl/planes` keeps it (US-02-AC-11). `planDocumentId = null` when the stored plan is no longer offered (US-02-AC-12). Writes happen through one `QuoteStore` (root service, signals) via a single `effect`; components never touch `sessionStorage`.
- **Reads / validation on load:** entry missing, unparsable, `v ≠ 1` or `country` ≠ key → discarded (removed) and treated as empty. Values for fields no longer published are ignored and dropped on the next write (SPEC-US-01 GAP-10). "Step 1 valid" is recomputed from stored values against current fields (SPEC-US-01 GAP-17); no `step` or `valid` flag is stored.
- **Clearing:** on approved payment, `removeItem('quote:v1:{CC}')` for that country **before** navigating to confirmation (US-03-AC-10). On country switch, nothing is cleared; the other country's entry stays until the tab closes or its own payment succeeds (GAP-25). On rejected payment, nothing changes (US-03-AC-04).
- **Storage unavailable** (`setItem`/`getItem` throws, e.g. quota or blocked storage): the store keeps working in memory and logs one `console.warn` without values. The reload ACs then degrade gracefully.
- **Logging:** never log values, keys with values, or the stored JSON (SPEC-US-01 GAP-07, SPEC-US-03 GAP-24).

### Consequences

- **Positive:** Data survives reload and back/forward within a tab and disappears when the tab closes. There is no PII at rest beyond the tab's life and no server-side PII.
- **Positive:** Per-country keys make US-01-AC-13 a property of the key scheme, not of extra logic. Clearing after payment is one `removeItem`.
- **Positive:** Storing only IDs and values (no prices, no config) removes a whole class of stale-data bugs. Configuration and prices are always current.
- **Negative:** While the tab is open, the data is readable by anyone with access to the device and by any script on the origin. XSS would expose it, so ADR-003's plain-text rendering rule is a dependency of this decision.
- **Negative:** No cross-tab continuity: a quote started in one tab is not available in a new tab (a page opened by another page starts as a **copy** of the opener's `sessionStorage`, verified; behavior on "duplicate tab" is browser-specific and **[unverified]**). A user who closes the tab loses the quote; there is no "resume later". The business cannot recover abandoned quotes.
- **Negative:** Typed-but-not-submitted values on step 1 are lost on reload (consequence of GAP-22, accepted at HC1).
- **Negative (cost to reverse):** Low. All access goes through `QuoteStore`, so swapping the storage backend (memory or `localStorage` with TTL) is a change in one service. The versioned key (`v1`) allows a shape change without reading old data incorrectly.

### Confirmation

- Unit (`QuoteStore`): key per country; version and country mismatch discarded; no price or acceptance written; storage-throws fallback.
- E2E: US-01-AC-04 (back keeps data), US-01-AC-13 (CL empty while CO filled), US-02-AC-11 (sessionStorage holds `planDocumentId` and no price), US-03-AC-10 (no `quote:v1:CO` after approval), US-03-AC-12 (no card-related keys), US-03-AC-18 (confirmation reload redirects).
- Review checklist: `localStorage`, `document.cookie` and `IndexedDB` are not used in `frontend/src`; `sessionStorage` appears only in `QuoteStore`.

## Pros and cons of the options

### `sessionStorage` per country (chosen)

- Good, because it survives reload and restore and is cleared on tab close (verified).
- Good, because it is per tab, so two tabs do not overwrite each other's quote.
- Good, because the API is synchronous and simple, with easy e2e inspection.
- Bad, because it is readable by same-origin scripts while open (XSS dependency).
- Bad, because it gives no "resume later" and no cross-tab continuity.

### `localStorage` per country (with expiry)

- Good, because it survives tab close and browser restart, so users could resume a quote.
- Good, because it is shared across tabs.
- Bad, because PII persists on the device after the user leaves, including on shared computers; an expiry is only enforced when the app runs again. This goes against the human's PII decision.
- Bad, because cross-tab sharing creates conflicts (two tabs editing the same country's quote) that need `storage` event handling.

### Memory only

- Good, because nothing is at rest: the strongest PII posture, and the simplest code.
- Bad, because a reload loses everything: US-02-AC-11 ("or reload") and US-01-AC-04 after a reload fail, and deep links after a refresh always bounce to step 1.
- Bad, because an accidental refresh during the summary loses the whole quote, which is poor UX.

### Server-side draft quote

- Good, because it supports cross-device resume and gives the business analytics on abandoned quotes.
- Bad, because it requires an anonymous write endpoint, which contradicts ADR-003 and non-negotiable 4 (no public writes).
- Bad, because it stores PII server-side, which needs retention rules, consent and cleanup jobs, all out of scope for a simulated flow.
- Bad, because it needs identity or session tokens to fetch the draft back.

## Links

- Specs: [SPEC-US-01](../specs/SPEC-US-01.md) (GAP-09, GAP-10, GAP-17, GAP-21, GAP-22, GAP-25; AC-04, AC-13, AC-20), [SPEC-US-02](../specs/SPEC-US-02.md) (GAP-03, GAP-17, GAP-19; AC-10, AC-11, AC-12), [SPEC-US-03](../specs/SPEC-US-03.md) (GAP-03, GAP-15, GAP-18, GAP-22; AC-10, AC-12, AC-17, AC-18)
- Related ADRs: ADR-002 (country code source), ADR-003 (no public writes; plain-text rendering)
- Sources (official docs, checked 2026-11-23):
  - https://developer.mozilla.org/en-US/docs/Web/API/Window/sessionStorage (partitioned by origin and tab; survives reload; cleared on tab close; opener copy semantics)
  - https://angular.dev/guide/signals (via `angular-conventions` skill §3: `effect` for side effects such as storage writes)
- Unverified: `sessionStorage` behavior on "duplicate tab" (browser-specific).
