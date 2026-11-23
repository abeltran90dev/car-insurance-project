# CLAUDE.md — global context (applies to every agent and session)

## Project

A multi-country (Colombia `CO`, Chile `CL`) car insurance quoting wizard: data form → plan list → summary and simulated payment. One Angular frontend; all form fields, plans and copy come from Strapi per country. The grade weighs the agentic flow (65%) over the app (35%), so the process artifacts matter as much as the code.

- Assessment brief: [docs/assessment/Technical assessment -Frontend.pdf](docs/assessment/Technical%20assessment%20-Frontend.pdf)
- User stories (verbatim, read-only): [US-01](docs/user-stories/US-01.md) · [US-02](docs/user-stories/US-02.md) · [US-03](docs/user-stories/US-03.md)
- Flow description: [FLOW.md](FLOW.md)

## Stack

| Layer | Tech |
|-------|------|
| Frontend | Angular 21 LTS (`frontend/`) |
| Content backend | Strapi 5+ (`cms/`) |
| Environment | Docker Compose: `docker compose up` starts everything, with seed data for CO and CL |
| Unit tests | Angular CLI default runner (Vitest) |
| E2E tests | Playwright |

Project knowledge lives in skills. Load the relevant one before working in that area:
`spec-authoring` (specs) · `strapi5-content-modeling` (anything in `cms/` or the Strapi data contract) · `angular-conventions` (anything in `frontend/`).

## Non-negotiables

1. **One build serves CO and CL.** No per-country builds, environment files or code branches keyed on hard-coded country content.
2. **Form fields and plans are 100% from Strapi.** No hard-coded field lists, labels, options, validation messages, plans or prices in the frontend.
3. **No NgModules.** Standalone components, signals, built-in control flow.
4. **No Strapi token with write permissions in the frontend.** Public content is read through the Public role with `find`/`findOne` only. Those permissions are set automatically in Strapi's `bootstrap` (decision recorded in an ADR), and a test proves that a public write returns 403.
5. **Fictitious data only.** No real personal data, documents, plates or credentials anywhere in the repo, including seeds and tests.
6. **No real payment gateway and no card data.** Price calculation and payment are simulated.
7. Secrets live in `.env` (gitignored). Only `.env.example` with placeholder values is committed.

## Language policy

- **English**: code, identifiers, comments, docs, specs, ADRs, reviews, commits, test names.
- **Spanish**: end-user UI copy, served from Strapi per country. The frontend contains no user-facing copy except a minimal technical fallback when Strapi is unreachable.

## Flow per user story

```
User story → [spec-writer] → HC1 human approves spec
          → [architect] → HC2 human approves ADR(s) (only if a new decision is needed)
          → [implementer] → [test-writer] → [reviewer]
          → HC3 human triages findings → [implementer] fixes → re-run tests
          → HC4 human sign-off: ready for QA

Spec change loop (any time after HC1):
  change needed → [spec-writer] bumps version, status: Draft, changelog entry → HC1 again
               → (spec gate blocks code for that story until re-approved)
```

Order of work: first all specs (US-01..03) and ADRs, then implementation US-01 → US-02 → US-03. The multi-country decision affects every screen and is taken once, up front. Because specs are written up front, implementation will expose changes to later specs. Those go through the spec change loop, never straight into code.

Subagent definitions: `.claude/agents/`. The main session orchestrates. It delegates to subagents and does not write specs, ADRs, production code or reviews itself.

## Human checkpoints (HC)

The human approver is **Andres Beltran** (use this name in `approved_by` and ADR `deciders`).

At every checkpoint the main session **stops**, summarizes what to review (paths and key points), and waits for an explicit `APPROVED` or `REJECTED: <reason>`. On rejection it re-runs the responsible subagent with the reason as input. **Nothing advances without `APPROVED`.** Silence, "looks good" or a question is not approval: ask again.

| HC | Human reviews | Approval criteria | On rejection |
|----|---------------|-------------------|--------------|
| HC1 | Spec | Every AC is testable; gaps in the story are listed and resolved; country-specific behavior is explicit | Back to spec-writer |
| HC2 | ADR | Real alternatives, justified choice, consequences stated | Back to architect |
| HC3 | Review report | Per finding: fix now / accept risk (with reason) / out of scope | Selected findings go to implementer |
| HC4 | Running app + green tests | ACs verified manually in both countries where relevant | Back to implementer with notes |

Record each human decision in the artifact it applies to (spec front matter, ADR status, review table "Human decision" column, story DoD checklist).

## Status gates

- Specs: front matter `status: Draft | Approved`, `version`, `approved_by`, `approved_on`, plus a **Changelog** table at the end. Only the human approves. The main session writes `Approved` only after receiving `APPROVED` at HC1.
- **Spec versioning:** any change to an `Approved` spec (wording, AC, contract, anything) bumps `version`, sets `status: Draft`, clears `approved_by`/`approved_on`, and adds a Changelog row (version, date, change, reason, ACs affected). It then goes through HC1 again. Only spec-writer edits specs; on re-approval the main session fills the approval fields and records the approval in the Changelog row.
- ADRs: `status: Proposed | Accepted | Superseded`. The main session sets `Accepted` only after `APPROVED` at HC2.
- **The implementer must refuse to implement a story whose spec is not `status: Approved`**, or that depends on an ADR that is still `Proposed`.

### Spec gate hook (enforced, not just instructed)

`.claude/settings.json` registers a `PreToolUse` hook on `Write|Edit|NotebookEdit` that runs `.claude/hooks/spec-gate.mjs` (Node). It blocks any write under `frontend/` or `cms/` unless:

| Branch | Rule |
|--------|------|
| `feat/US-XX-<slug>` | Allowed only if `docs/specs/SPEC-US-XX.md` has `status: Approved` |
| `chore/scaffold-<slug>` | Infrastructure only (project scaffolding, config, Docker). Writes under `frontend/src/app/features/` are blocked |
| `main`, detached HEAD, any other branch | Blocked |

Writes outside `frontend/` and `cms/` (docs, specs, ADRs, reviews) are not gated. When the hook blocks, the agent must stop and report. It must not work around the gate.

**Known limitation:** the hook sees file tools only. `Bash` (e.g. `ng new`, `ng generate`, `npx create-strapi-app`, shell redirects) is not gated. So generators run only on `chore/scaffold-*` or on a `feat/` branch with an approved spec, and the reviewer checks that the commit range matches the branch rule.

## Traceability conventions

| Artifact | ID / convention | Example |
|----------|-----------------|---------|
| User story | `US-NN` | `US-01` |
| Spec | `SPEC-US-NN`, at `docs/specs/SPEC-US-NN.md` | `SPEC-US-01` |
| Acceptance criterion | `US-NN-AC-NN` | `US-01-AC-02` |
| ADR | `ADR-NNN`, at `docs/adr/ADR-NNN-<slug>.md` | `ADR-001` |
| Review finding | `REVIEW-US-NN-FNN`, in `docs/reviews/REVIEW-US-NN.md` | `REVIEW-US-01-F03` |
| Branch | `feat/US-NN-<slug>` (story); `chore/scaffold-<slug>` (infrastructure only) | `feat/US-01-data-form` |
| Review input | `docs/reviews/US-NN.diff` | `docs/reviews/US-01.diff` |
| Commit | Conventional Commits with story scope, plus a `Refs:` trailer | see below |
| Test name | Starts with the AC ID | `US-01-AC-02 shows configured error message` |

```
feat(US-01): render fields from Strapi config

Refs: SPEC-US-01, ADR-001
```

- One logical change per commit. Fix commits for review findings reference the finding: `Refs: SPEC-US-01, REVIEW-US-01-F03`.
- Each review finding records the hash of the commit that resolved it.
- Non-story work uses scopes such as `chore(flow)`, `chore(env)`, `docs(adr)`.

## Review procedure (main session)

1. Before invoking the reviewer, write the review input file `docs/reviews/US-NN.diff` from the story's commit range:
   ```bash
   { echo "# US-NN review input  base=<base-sha> head=<head-sha>"; echo "## Commits"; git log --oneline <base>..<head>;
     echo "## Changed files"; git diff --name-status <base>..<head>;
     echo "## Diff"; git diff <base>..<head>; } > docs/reviews/US-NN.diff
   ```
2. Invoke the reviewer with the story ID, the path of the `.diff` file and the test-writer's run summary. The reviewer reads the diff from the file, not from the prompt.
3. Save the reviewer's report verbatim to `docs/reviews/REVIEW-US-NN.md`. Commit both files (`docs(US-NN): add review report`).
4. **Every bug the test-writer reported becomes a review finding** (the reviewer logs it with source `test-writer`), so it goes through HC3 like any other finding.
5. Re-reviews after fixes regenerate the `.diff` for the fix range (`US-NN-r2.diff`, …).

## Definition of Done (per story)

- [ ] Spec `SPEC-US-NN` is `Approved` (HC1); every ADR it depends on is `Accepted` (HC2).
- [ ] Every AC is implemented and has at least one test whose name starts with its AC ID; unit and e2e suites are green.
- [ ] Works for CO and CL with seed data, and from `docker compose up` on a clean checkout.
- [ ] Loading, empty and error states are handled as specified; keyboard-only completion and accessible labels are verified; layout works on mobile and desktop.
- [ ] No hard-coded country content; no write token in the frontend; fictitious data only.
- [ ] Review `REVIEW-US-NN` exists, with its input `US-NN.diff`; every test-writer bug is a finding; every finding has a human decision (HC3); "fix now" findings have a resolution commit.
- [ ] For any story that touches Strapi permissions: the test proving a public write returns 403 passes.
- [ ] HC4 sign-off given; README/FLOW.md updated if behavior or setup changed.
- [ ] The session is exported (see below).

## Session logs

These unedited logs are a required deliverable. At the end of every working session:

1. **Readable export:** run `/export` and save it as `docs/ai-sessions/YYYY-MM-DD-<phase-or-story>.txt`. Don't edit it.
2. **Raw transcripts (local only):** copy the session's raw JSONL files, including subagents, unchanged. **Raw transcripts are excluded from the repo: they contain the author's account email, which Claude Code injects into every session; the `/export` files are the committed unedited logs.** `docs/ai-sessions/raw/**/*.jsonl` is gitignored (standing decision, Andres Beltran, 2026-11-23). The `.meta.json` files are committed only if the email scan is clean.
   ```bash
   SRC=~/.claude/projects/c--Proyectos-car-insurance-project
   DST=docs/ai-sessions/raw
   mkdir -p "$DST"
   cp "$SRC/<session-id>.jsonl" "$DST/"                                  # main session
   [ -d "$SRC/<session-id>/subagents" ] && mkdir -p "$DST/<session-id>" \
     && cp -r "$SRC/<session-id>/subagents" "$DST/<session-id>/"         # subagent transcripts + .meta.json
   ```
   Layout observed on 2026-11-23: the main transcript is `<session-id>.jsonl`; each subagent gets `<session-id>/subagents/agent-<id>.jsonl` plus `agent-<id>.meta.json`. Find the session ID by modification time (`ls -t "$SRC"/*.jsonl | head -1`). Subagent coverage is verified again after the first real subagent run.
3. **Before committing, scan both the `/export` files and the raw files, without editing them:** `grep -rlniE "@gmail|@[a-z0-9-]+\.(com|co|cl)\b" docs/ai-sessions/` (emails), then `grep -rniE "api[_-]?key|secret|password|token" docs/ai-sessions/` (review hits by hand).
   - A file containing the **author's personal email** is **not committed and not edited**. Its name goes in [docs/ai-sessions/README.md](docs/ai-sessions/README.md) under "Excluded files" with the reason `excluded: contains author's personal email`. The file stays local only.
   - Any other real hit (a secret, or someone else's personal data): don't commit it, don't edit it, stop and ask the human.
   - The repo is private. Exclusion still applies.
4. Commit: `docs(sessions): add <phase-or-story> session logs`.
