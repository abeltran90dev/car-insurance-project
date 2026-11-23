---
name: angular-conventions
description: Angular 21 (LTS) conventions for frontend/ in this project: standalone components, signals for state, built-in control flow, typed reactive forms built from Strapi config, inject(), OnPush, feature folders, the loading/error pattern, testing setup and the accessibility checklist for the wizard. Use for any code or review work in frontend/.
---

# Angular conventions (project)

Checked against angular.dev on 2026-11-23. The site was at **v22.3**; v22 is the active release and **v21 is LTS** (LTS until 2027-06). **This project uses Angular 21 (LTS)**: scaffold with `@angular/cli@21` and pin `^21` in `package.json`. Where angular.dev describes v22-only behavior, the v21 rule is stated below. Items marked **[unverified]** weren't confirmed on angular.dev; check the linked page before use.

## 1. Components

- **Standalone only.** Standalone is the default since v19, so don't write `standalone: true` or create any NgModule ([components](https://angular.dev/guide/components)).
- **OnPush:** always set `changeDetection: ChangeDetectionStrategy.OnPush`. It only becomes the default in v22 ([skipping-subtrees](https://angular.dev/best-practices/skipping-subtrees)), so on v21 it **must** be explicit. Zoneless is the default since v21. Never add `provideZoneChangeDetection` or zone.js ([zoneless](https://angular.dev/guide/zoneless)).
- **DI with `inject()`**, never constructor parameters ([style guide](https://angular.dev/style-guide)).
- Inputs and outputs: `input()`, `input.required<T>()`, `output<T>()`, `model()`. Mark them `readonly` ([inputs](https://angular.dev/guide/components/inputs), [outputs](https://angular.dev/guide/components/outputs)). Signal queries `viewChild()`/`viewChildren()` **[unverified]**: see [queries](https://angular.dev/guide/components/queries).
- Template-only members are `protected`. Use `[class.x]`/`[style.x]` bindings, not `ngClass`/`ngStyle`. Name handlers by intent (`saveDraft()`, not `onClick()`) (style guide).
- Host bindings: use the `host: {}` metadata object rather than `@HostBinding`/`@HostListener` (project choice; **[unverified]** as an official style rule, see [host-elements](https://angular.dev/guide/components/host-elements)).
- No logic in templates beyond simple expressions; derive with `computed()`.

## 2. Templates: built-in control flow only

```html
@if (fields(); as list) { … } @else { … }
@for (field of fields(); track field.key) { … } @empty { … }
@switch (field.type) { @case ('select') { … } @default { … } }
```

- Always `track` a stable key (`key`, `documentId`), never `$index` for Strapi data ([control-flow](https://angular.dev/guide/templates/control-flow)).
- No `*ngIf`/`*ngFor`/`*ngSwitch`. `@let` is allowed for local aliases (**[unverified]**, see [variables](https://angular.dev/guide/templates/variables)).

## 3. State: signals

- Local and shared state uses `signal`, `computed` and `linkedSignal` ([signals](https://angular.dev/guide/signals), [linked-signal](https://angular.dev/guide/signals/linked-signal)). Use `effect` only for side effects that leave Angular (e.g. writing to `sessionStorage`), never to copy one signal into another.
- Wizard state lives in **one root service** (`QuoteStore`) exposing readonly signals plus intent methods (`setApplicant()`, `selectPlan()`, `reset()`). Components never mutate store internals.
- Persistence: the store writes a versioned snapshot (`{ v: 1, country, values, planDocumentId }` under key `quote:v1:{CC}`, per ADR-004) to `sessionStorage` from one `effect` and rehydrates on init. Drop the snapshot if its version or country doesn't match. The spec decides the exact fields.
- RxJS only where it's natural (router events, HTTP internals). Convert to signals at the boundary.

## 4. Data loading and the loading/error pattern

- HTTP: the current (v22) docs say `HttpClient` uses fetch by default and list only `withXhr()` ([http setup](https://angular.dev/guide/http/setup)). **[unverified] for v21**: on v21, register `provideHttpClient(withFetch())` in `app.config.ts`, after checking the v21 docs (v21.angular.dev/guide/http/setup) when scaffolding. Record the result here.
- Read Strapi content with `httpResource()` or `resource()` inside a feature `*-api.ts` service ([http-resource](https://angular.dev/guide/http/http-resource), [resource](https://angular.dev/guide/signals/resource)). Read-only GETs only.
- Map raw Strapi responses to **typed domain models** in one mapper function (`toFormFieldConfig()`), unit-tested. Components never see raw Strapi shapes. No `any`. Unknown field types and invalid configs are dropped and logged with `console.warn`, never crash the form.
- Every remote view handles all four states, driven by `status()`/`isLoading()`/`error()`/`hasValue()`:

```html
@if (plans.isLoading()) { <app-loading /> }
@else if (plans.error()) { <app-load-error (retry)="plans.reload()" /> }
@else if (plans.hasValue() && plans.value().length === 0) { <app-empty-state … /> }
@else if (plans.hasValue()) { … }
```

- Guard `value()` reads with `hasValue()`: `value()` throws in the error state.
- Copy for loading, empty and error states comes from Strapi. Only the "Strapi unreachable" fallback may be a minimal hard-coded Spanish string.

## 5. Forms: typed reactive forms built from Strapi

- Use **typed reactive forms**: `FormGroup<T>`, `FormControl<T>`, `NonNullableFormBuilder` / `fb.nonNullable` ([typed-forms](https://angular.dev/guide/forms/typed-forms)). No `Untyped*`.
- The step 1 form is **generated at runtime** from `FormFieldConfig[]`: one control per field `key`. Validators come from a pure `buildValidators(config)` function: `required`, `min`/`max`, `minLength`/`maxLength`, `pattern`, plus **named validators** selected by the `type` of each entry in the field's `validations` list (`minAge`, `vehicleYear`, `rut`, `colombianId`; ADR-001). Each validator returns an error key, and the error **message is that rule's Strapi `message`** (country fallback if missing; SPEC-US-01). Unknown `type` → ignored with a console warning.
- Field components are chosen with `@switch (field.type)`, one small component per type.
- Signal Forms (`@angular/forms/signals`, `form()`, `FormField`) exist from v21 ([signal forms](https://angular.dev/guide/forms/signals/overview)). We **don't** use them unless an ADR decides otherwise: their stability label wasn't confirmed, and typed reactive forms are the stated requirement.

## 6. Routing and structure

- Routes: `/:country/datos`, `/:country/planes`, `/:country/resumen`, `/:country/confirmacion` (decided in ADR-002: async `canMatch` resolves the code against Strapi; an unknown code renders not-found in place, keeping the URL). Lazy-load with `loadComponent` (**[unverified]**, see [loading-strategies](https://angular.dev/guide/routing/loading-strategies)).
- Read route params as inputs with `withComponentInputBinding()` ([read-route-state](https://angular.dev/guide/routing/read-route-state)).
- Step guards are functional `CanActivateFn` that return a `UrlTree` (redirect to the first incomplete step), not `false` + navigate ([route-guards](https://angular.dev/guide/routing/route-guards)).
- **Folders by feature, not by type** (no `components/`, `services/` folders). File names have no type suffix: `plan-list.ts`, `plan-list.html`, `plan-list.spec.ts` ([style guide](https://angular.dev/style-guide)).

```
frontend/src/app/
  core/        country resolution, strapi http, quote-store, error handling
  shared/      ui atoms (loading, empty, error, field wrappers), pipes (money, mask)
  features/
    applicant-form/   step 1
    plan-list/        step 2
    summary/          step 3 (+ payment, confirmation)
  app.routes.ts, app.config.ts
frontend/e2e/  Playwright specs
```

## 7. Formatting

- Money: `Intl.NumberFormat(country.numberLocale, { style: 'currency', currency: country.currency, maximumFractionDigits: 0 })`, wrapped in a pure `money` pipe. COP and CLP have no decimals in practice; rounding is defined in the spec.
- Masking: pure `maskDocument(value)` function, unit-tested (e.g. show the last 3 or 4 characters; the spec decides).

## 8. Testing

- Unit tests run on **Vitest**, the Angular CLI default (`@angular/build:unit-test` builder) ([testing](https://angular.dev/guide/testing)). TestBed is zoneless by default.
- Test pure functions directly (mapper, validators, price rule, mask). Test components through the DOM with roles and labels. Mock HTTP with `provideHttpClientTesting`.
- E2E with Playwright against the seeded stack. Test names start with the AC ID.

## 9. Accessibility checklist (every step)

- [ ] Every control has a visible `<label for>` (or `aria-labelledby`) with Strapi's `label`. Placeholders are not labels.
- [ ] Help text and error text have ids and are linked with `[attr.aria-describedby]` (help id + error id when shown). Invalid controls set `[attr.aria-invalid]="true"`. Required controls set `required`/`aria-required`.
- [ ] Errors appear next to the field on blur and on submit. On a failed submit, focus moves to the **first invalid field**.
- [ ] **Focus management between steps:** after navigating to a step, move focus to that step's `<h1>` (`tabindex="-1"`). Don't leave focus on `body` ([a11y](https://angular.dev/best-practices/a11y)).
- [ ] Use a live region for async status (loading done, payment processing or failed). CDK `LiveAnnouncer` is acceptable (**[unverified]** import path `@angular/cdk/a11y`, see [cdk a11y](https://material.angular.dev/cdk/a11y/overview)).
- [ ] **Keyboard-only completion:** native `<input>`, `<select>`, `<button>`, radio groups for plan choice (arrow keys), no click handlers on `div`s, visible `:focus-visible` styles, logical tab order, no traps.
- [ ] The stepper shows the current step with `aria-current="step"`.
- [ ] The pay button uses a native `disabled` state plus visible text/`aria-busy` while processing.
- [ ] Color contrast ≥ 4.5:1. The "recommended" plan isn't marked by color alone (badge text too).
- [ ] Responsive: single column ≤ 600px, touch targets ≥ 44px, no horizontal scroll at 320px.
- [ ] CMS text is rendered with interpolation (escaped). No `[innerHTML]` without sanitization and an ADR.
