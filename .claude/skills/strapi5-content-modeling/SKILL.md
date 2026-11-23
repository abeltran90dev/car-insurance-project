---
name: strapi5-content-modeling
description: How this project models and serves content in Strapi 5 (cms/): collection types vs components, draft & publish, filtering by country, REST query syntax, idempotent seeding for CO and CL, minimal Public role permissions, and token/CORS security. Use for any work in cms/, any Strapi data contract in a spec, ADRs about content, and any frontend code that calls Strapi.
---

# Strapi 5 content modeling (project conventions)

Every API fact here was checked against docs.strapi.io on 2026-11-23 (latest release then: **Strapi 5.62.0**). Statements marked **[unverified]** were not confirmed on the official docs. Check them in a running instance before relying on them. If you find a contradiction, the official docs win: fix this skill.

> The **multi-country strategy itself is decided in ADR-001** (architect, HC2). The baseline model below is the default the specs can assume until ADR-001 is accepted. After that, update this skill to match the ADR.

## 1. Vocabulary in 30 seconds

- **Collection type**: a table of entries with its own REST endpoints (`/api/plans`). Use it for things the business team lists, orders, publishes and filters: countries, form fields, plans.
- **Single type**: exactly one entry (`/api/site-setting`). Avoid it for per-country data, because you can't have one per country without i18n.
- **Component**: a reusable group of fields embedded in an entry. It has **no endpoint, no draft/publish state and no permissions of its own**. Use it for parts that only exist inside a parent (select options, validation rules, coverages, benefits). Use `"repeatable": true` for lists.
- **Dynamic zone**: a list of mixed component types. Not needed here; avoid it (harder to type and to populate).
- **Document / `documentId`**: in Strapi 5 an entry is a *document*, identified by a 24-char string `documentId` (not the numeric `id`). REST single-entry URLs use it: `GET /api/plans/:documentId`.

## 2. Baseline content model

| Content | Kind | Key attributes | Why |
|---------|------|----------------|-----|
| `country` | collection type | `code` (string, `CO`/`CL`), `name`, `currency` (`COP`/`CLP`), `numberLocale` (`es-CO`/`es-CL`), `legalAge` (integer), `termsTitle` (string), `termsBody` (text), `copy` (component `shared.copy-entry`, repeatable) | One place for everything country-level. Other types relate to it. |
| `form-field` | collection type | `key` (string, stable machine name), `label`, `type` (enumeration: `text`,`number`,`select`,`date`,`checkbox`), `required` (boolean), `helpText`, `errorMessage`, `order` (integer), `group` (enumeration: `policyholder`,`vehicle`), `maskInSummary` (boolean), `options` (component `form.option`, repeatable), `validations` (component `form.validation-rule`, repeatable), `country` (relation manyToOne → country) | The business team adds, removes and reorders fields; the frontend renders whatever is published. |
| `form.option` | component | `value` (string), `label` (string), `order` (integer) | Select options from Strapi (make, city). |
| `form.validation-rule` | component (repeatable) | `type` (enumeration: `required`,`minLength`,`maxLength`,`min`,`max`,`pattern`,`minAge`,`vehicleYear`,`rut`,`colombianId`), `value` (string; the frontend converts to number where needed), `message` (string) | ADR-001. Simple rules are data; complex ones (RUT check digit, age) are **named validators in code that Strapi selects**. |
| `shared.copy-entry` | component (repeatable) | `key` (string, `<area>.<camelCaseName>`, e.g. `common.retry`), `value` (text) | ADR-001. Per-country UI copy on `country.copy`. |
| `site-copy` | single type | `copy` (component `shared.copy-entry`, repeatable) | ADR-001. Country-independent copy (`picker.*`, `notFound.*`). |
| `plan` | collection type | `name`, `shortDescription`, `basePrice` (decimal), `currency`, `order` (integer), `recommended` (boolean), `active` (boolean), `coverages` (component `plan.coverage`, repeatable), `benefits` (component `plan.benefit`, repeatable), `country` (relation manyToOne → country) | Matches the US-02 business rules exactly. |
| `plan.coverage` / `plan.benefit` | components | `title`, `description` (and `amount` for coverage, if the spec asks) | Only exist inside a plan. |

Notes:
- **Draft & Publish on** for `form-field` and `plan`, so the business team can stage changes. `country` can turn it off: `unique` is **not enforced on draft saves** when D&P is on, so duplicate codes would only fail at publish ([models](https://docs.strapi.io/cms/backend-customization/models)).
- `active` (business switch) and *published* (CMS lifecycle) are different. The frontend requires both.
- With D&P on, the attribute name `status` is reserved: don't name a field `status`.
- Field and plan copy is Spanish and lives in Strapi. The frontend renders it as plain text.

## 3. Schema files (what the Content-type Builder generates)

- Content type: `cms/src/api/<api-name>/content-types/<name>/schema.json`.
- Component: `cms/src/components/<category>/<name>.json` (the category subfolder is required), referenced as `"component": "<category>.<name>"`.
- Draft & publish: `"options": { "draftAndPublish": true }`. **CLI-generated types default to `false`**: set it explicitly.
- Attribute types: `string, text, richtext, enumeration, email, password, uid, date, time, datetime, timestamp, integer, biginteger, float, decimal, boolean, json, media, relation, customField, component, dynamiczone` (+ `locale`/`localizations` with i18n). **There is no `blocks` type in the schema reference; use `text` (or `richtext`).**
- Relation: `{ "type": "relation", "relation": "manyToOne", "target": "api::country.country", "inversedBy": "plans" }`. The inverse side uses `mappedBy`. An inverse side without an owning side fails at boot.
- Component attribute: `{ "type": "component", "component": "plan.coverage", "repeatable": true }`.
- Enumeration: `{ "type": "enumeration", "enum": ["text","number","select","date","checkbox"] }`. **Verified on Strapi 5.63 (Phase 2):** this exact shape works.

Prefer creating types in the **admin Content-type Builder** (dev mode) and committing the generated files. That's less error-prone than hand-writing JSON.

## 4. Reading content: REST query cheat sheet

Responses are **flattened** in Strapi 5: `data[0].name`, not `data[0].attributes.name` ([REST](https://docs.strapi.io/cms/api/rest)).

| Need | Syntax | Source |
|------|--------|--------|
| Only published | default for REST GET (`status=published`); `status=draft` for drafts | [status](https://docs.strapi.io/cms/api/rest/status) |
| Filter by country (through relation) | `filters[country][code][$eq]=CO` | [filters](https://docs.strapi.io/cms/api/rest/filters) |
| Filter boolean | `filters[active][$eq]=true` (accepts `true/t/1`, `false/f/0`; other values → 400) | [filters](https://docs.strapi.io/cms/api/rest/filters) |
| Operators | `$eq $eqi $ne $nei $lt $lte $gt $gte $in $notIn $contains $notContains $containsi $notContainsi $null $notNull $between $startsWith(i) $endsWith(i) $or $and $not` | [filters](https://docs.strapi.io/cms/api/rest/filters) |
| Populate components/relations | Nothing is populated by default. `populate[0]=options&populate[1]=validations`. Nested: `populate[coverages][populate][0]=<nested>` | [populate](https://docs.strapi.io/cms/api/rest/populate-select) |
| Sort | `sort=order:asc`; multiple: `sort[0]=order:asc&sort[1]=name:asc` | [sort-pagination](https://docs.strapi.io/cms/api/rest/sort-pagination) |
| Page size | default 25 (`pagination[pageSize]`). Set `pagination[pageSize]=100` explicitly; new projects generate `rest.maxLimit: 100` in `config/api` | [sort-pagination](https://docs.strapi.io/cms/api/rest/sort-pagination), [api config](https://docs.strapi.io/cms/configurations/api) |

Project rules:
- **Never use `populate=*` in app code.** The docs advise against it in production. Populate exactly what the spec's data contract lists.
- `status` is a root-level param only (inside `populate` it returns 400).
- Each populated **relation** target needs `find` permission on the Public role. Components need nothing extra.
- Canonical requests:
  ```
  GET /api/form-fields?filters[country][code][$eq]=CO&sort[0]=order:asc&sort[1]=key:asc&populate[0]=options&populate[1]=validations&pagination[pageSize]=100
  GET /api/plans?filters[country][code][$eq]=CO&filters[active][$eq]=true&sort[0]=order:asc&sort[1]=name:asc&populate[0]=coverages&populate[1]=benefits&pagination[pageSize]=100
  GET /api/countries?filters[code][$eq]=CO&populate[0]=copy
  GET /api/site-copy?populate[0]=copy
  ```
- New projects generate `config/api.ts` with `strictParams: true` and `strictRelations: true` (verified 5.63): unknown query params are rejected, so the frontend must send only documented params.
- **`status=draft` is honored for anonymous `find`** (verified 5.63): any Public `find` lets a caller read drafts with `?status=draft`. Draft & Publish hides drafts from the app's queries, not from a determined caller. Don't put secrets in drafts.
- With curl, use `curl -g` so `[` `]` in query strings are not treated as glob ranges.
- Bracket lists are capped at 100 items by default (`arrayLimit`); stay well below that.

## 5. Seeding (CO + CL, idempotent, part of `docker compose up`)

Strategy: seed in the **`bootstrap({ strapi })`** function of `cms/src/index.ts`, which runs on every start after setup and before the server listens ([functions](https://docs.strapi.io/cms/configurations/functions)). Data lives in `cms/src/seed/*.json` (fictitious, Spanish UI copy).

```ts
// cms/src/index.ts (sketch)
export default {
  register() {},
  async bootstrap({ strapi }) {
    if (process.env.SEED_ON_BOOT !== 'true') return;
    const existing = await strapi.documents('api::country.country').findMany({
      filters: { code: 'CO' },
      pagination: { pageSize: 1 },   // pagination object, not a root pageSize
    });
    // Project practice (Phase 2): idempotent PER RECORD, not "skip if DB not empty":
    // look up country by code, field by key+country, plan by name+country (findFirst),
    // create only what is missing. A partial or evolved seed gets completed.
  },
};
```

Document Service facts ([document-service](https://docs.strapi.io/cms/api/document-service)):
- `strapi.documents(uid).create({ data, status: 'published' })` creates **and publishes**. Without `status`, it creates a draft.
- `strapi.documents(uid).publish({ documentId })` takes an object, not a bare ID.
- **Reads default to `draft`** in the Document Service (the opposite of REST). Pass `status: 'published'` when you mean published.
- Relations in `data`: pass the related `documentId` as a bare string (e.g. `country: coDocumentId`). **Verified on 5.63**, also with `strictRelations: true`.
- Document Service output is **not sanitized**. Don't return it from custom controllers without `strapi.contentAPI.sanitize.output`. Prefer the default controllers for the public API.

Alternative: `strapi import -f <file>` restores an export, but it **deletes all existing data first**, needs identical schemas, and doesn't restore admin users or API tokens ([import](https://docs.strapi.io/cms/features/data-management/import), [export](https://docs.strapi.io/cms/features/data-management/export)). We prefer bootstrap seeding: the seed is readable JSON in git and the reset behavior is explicit.

## 6. Permissions: minimal Public role

- All content types are **private by default**. The Public role exists by default and can't be deleted ([users-permissions](https://docs.strapi.io/cms/features/users-permissions), [REST](https://docs.strapi.io/cms/api/rest)).
- Internal API (verified 5.63, undocumented): role = `strapi.db.query('plugin::users-permissions.role').findOne({ where: { type: 'public' } })`; grant = `strapi.db.query('plugin::users-permissions.permission').create({ data: { action: 'api::plan.plan.find', role: role.id } })`.
- Anonymous write without permission returns **403** (verified 5.63 for POST, and PUT/DELETE on an existing documentId). PUT/DELETE on the bare collection path return 405 (no route), so denial tests must target a seeded documentId.
- Grant the Public role **only `find`** (and `findOne` only if a spec needs single-entry reads) on: `country`, `form-field`, `plan`, `site-copy` (ADR-003: `find` only, no `findOne`). Nothing else: no `create`/`update`/`delete`, no upload, no users-permissions endpoints beyond defaults.
- Justification to record in the ADR/README: the app is anonymous and read-only; the quote and payment are simulated client-side, so no write endpoint is ever needed.
### Project decision: permissions are set automatically in `bootstrap`

So that `docker compose up` stays one command with no clicks in the admin panel, the Public role permissions are **granted in `bootstrap`**. The architect records this in an ADR (alternatives: manual admin setup, `strapi import` of config, bootstrap). Know what you are relying on:

- The docs only describe the admin UI (Settings → Users & Permissions → Roles → Public). **Setting permissions in code is not documented.** It's commonly done by querying the internal `plugin::users-permissions.role` (type `public`) and creating rows in `plugin::users-permissions.permission` with action strings like `api::plan.plan.find`. That's an **[unverified] internal API** that may change between versions. Before writing it, check the model UIDs and the action format against the running instance (create one permission in the admin panel, then read it back with `strapi.db.query`).
- Implementation rules:
  1. One isolated function, `grantPublicReadPermissions(strapi)` in `cms/src/bootstrap/permissions.ts`, called from `bootstrap`.
  2. An **explicit allow-list** constant (e.g. `['api::country.country.find', 'api::form-field.form-field.find', 'api::plan.plan.find', 'api::site-copy.site-copy.find']`), never a pattern or a loop over all content types.
  3. Idempotent: create only missing permissions. It never grants anything outside the list. It logs what it granted, and warns (never revokes) about public permissions outside the list (ADR-003).
  4. It runs on every start, so a fresh container is always correct.
- **Mandatory test:** an automated test proves that an anonymous write is refused: `POST /api/plans` (and `PUT`/`DELETE` on an existing `documentId`, for each content type the app reads) is denied with **401 or 403** (ADR-003, decided at HC2). The test-writer adds it to the first story that touches Strapi. A positive check (`GET /api/plans` returns 200) proves the grant worked.
- After a Strapi upgrade, the 403 test and a GET smoke test must pass before merging.

## 7. Tokens, secrets, CORS

- **No API token in the frontend, of any type.** The Public role serves anonymous reads. A token in SPA code is visible to every visitor. (This is our inference: the docs advise read-only, narrowly scoped, rotated tokens kept in a secrets manager, but don't spell out the SPA case ([api-tokens](https://docs.strapi.io/cms/features/api-tokens)).) Token types are Read-only (`find`/`findOne` only), Full access and Custom. Strapi pre-generates a Full access and a Read-only token: never copy either into `frontend/`.
- Secrets come from env vars, documented in `cms/.env.example` with placeholders: `APP_KEYS`, `API_TOKEN_SALT`, `ADMIN_JWT_SECRET`, `JWT_SECRET`, `TRANSFER_TOKEN_SALT`, `DATABASE_CLIENT`, `DATABASE_FILENAME`, `HOST`, `PORT` ([environment](https://docs.strapi.io/cms/configurations/environment)). `ENCRYPTION_KEY` appears in the generated `.env`/`config/admin` but not in that table.
- CORS in `cms/config/middlewares.ts`: replace `'strapi::cors'` with `{ name: 'strapi::cors', config: { origin: [env('FRONTEND_ORIGIN', 'http://localhost:4200')] } }`. The default origin is `'*'`; restrict it. Middleware order matters ([middlewares](https://docs.strapi.io/cms/configurations/middlewares)).

## 8. Runtime

- Node: only Active/Maintenance LTS releases are supported (v22, v24, v26 at time of writing), not odd versions ([cli](https://docs.strapi.io/cms/installation/cli)). Pin the Docker base image to an LTS version.
- DB: SQLite by default (`DATABASE_FILENAME=.tmp/data.db`). That's enough here (no DB requirement). Mount a volume or accept a re-seed on a fresh container.

## 9. i18n (for the ADR, not the default)

i18n is **available but disabled by default**. It's enabled in Settings → Internationalization, then per content type. REST uses `?locale=es-CO`; an omitted locale returns the default locale ([i18n](https://docs.strapi.io/cms/features/internationalization), [locale](https://docs.strapi.io/cms/api/rest/locale)). Using locales `es-CO`/`es-CL` as the country axis is a legitimate ADR-001 alternative. Its trade-off: every localized entry must exist in each locale, which fits "same content translated" better than "different fields per country".

## Pages used

https://docs.strapi.io/cms/api/rest · /cms/api/rest/filters · /cms/api/rest/populate-select · /cms/api/rest/sort-pagination · /cms/api/rest/status · /cms/api/rest/locale · /cms/features/draft-and-publish · /cms/api/document-service · /cms/features/users-permissions · /cms/features/api-tokens · /cms/configurations/middlewares · /cms/configurations/api · /cms/configurations/functions · /cms/configurations/environment · /cms/backend-customization/models · /cms/features/internationalization · /cms/features/data-management · /cms/features/data-management/import · /cms/features/data-management/export · /cms/installation/cli · /release-notes
