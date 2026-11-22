# Phase 0 — Agentic flow setup

You are helping me set up the agentic development flow for a technical assessment. In THIS session we only build the flow (context file, subagents, skills, templates and folder structure). **Do not scaffold Angular or Strapi and do not write application code yet.**

## 1. Read the input first

- Read the assessment PDF in `docs/assessment/`. It defines the app, the technical requirements, the agentic flow requirements, the deliverables and the evaluation criteria.
- Extract the three user stories **verbatim** into `docs/user-stories/US-01.md`, `US-02.md` and `US-03.md` (story, context, business rules, acceptance criteria). These files are the input of the flow and the first link of traceability.

## 2. Target repository structure

Create the structure below (empty folders get a `.gitkeep`):

```
/
├── CLAUDE.md                 # global context, rules for all agents
├── README.md                 # skeleton only for now
├── FLOW.md                   # skeleton + first Mermaid diagram of the flow
├── .claude/
│   ├── agents/               # subagent definitions
│   └── skills/               # custom skills
├── docs/
│   ├── assessment/           # original PDF (already there)
│   ├── user-stories/         # US-01..03 verbatim
│   ├── specs/                # one spec per user story
│   ├── adr/                  # ADRs (MADR format)
│   ├── reviews/              # code review reports per story
│   └── ai-sessions/          # unedited exported agent sessions
├── frontend/                 # Angular app (later phase)
└── cms/                      # Strapi project (later phase)
```

## 3. Design decisions (mine — implement them as written)

### 3.1 Flow per user story

```
User story → [spec-writer] → HC1 human approves spec
          → [architect] → HC2 human approves ADR(s) (only if a new decision is needed)
          → [implementer] → [test-writer] → [reviewer]
          → HC3 human triages findings → [implementer] fixes → re-run tests
          → HC4 human sign-off: ready for QA
```

Order of work: first ALL specs (US-01..03) and ADRs, then implementation US-01 → US-02 → US-03. Reason: the multi-country decision affects every screen and must be taken once, up front.

### 3.2 Human checkpoints (HC)

At every checkpoint the main session must STOP, summarize what to review, and wait for my explicit answer: `APPROVED` or `REJECTED: <reason>`. On rejection the responsible subagent is re-run with my reason as input. Nothing advances without `APPROVED`.

| HC | What the human reviews | Approval criteria | On rejection |
|----|------------------------|-------------------|--------------|
| HC1 | Spec | Every acceptance criterion is testable; gaps in the story are listed and resolved; country-specific behavior explicit | Back to spec-writer |
| HC2 | ADR | Real alternatives, justified choice, consequences stated | Back to architect |
| HC3 | Review report | Decide per finding: fix now / accept risk (with reason) / out of scope | Selected findings go to implementer |
| HC4 | Running app + green tests | Acceptance criteria verified manually in both countries where relevant | Back to implementer with notes |

### 3.3 Status gates in files

- Specs have a front-matter `status: Draft | Approved` and `approved_by`/`approved_on`. Only the human sets `Approved` (the main session writes it only after my `APPROVED`).
- ADRs have `status: Proposed | Accepted | Superseded`.
- **The implementer must refuse to implement a story whose spec is not `Approved`.**

### 3.4 Subagents (`.claude/agents/*.md`)

Each file has YAML front matter (`name`, `description`, `tools`, `model`) and a body with: Role, Inputs, Steps, Outputs (exact paths), Rules / must-not.

| Agent | Responsibility | Tools | Model | Input → Output |
|-------|----------------|-------|-------|----------------|
| `spec-writer` | Turns a user story into a verifiable spec; detects gaps and ambiguities and proposes resolutions | Read, Grep, Glob, Write | opus | `docs/user-stories/US-XX.md` → `docs/specs/SPEC-US-XX.md` |
| `architect` | Identifies decisions that need an ADR; writes ADRs with real alternatives and consequences | Read, Grep, Glob, Write, WebFetch | opus | Approved specs → `docs/adr/ADR-NNN-*.md` |
| `implementer` | Implements an approved spec in Angular/Strapi following CLAUDE.md and skills; atomic commits | Read, Write, Edit, Grep, Glob, Bash | sonnet | Approved spec + ADRs → code + commits |
| `test-writer` | Writes unit and e2e tests mapped 1:1 to acceptance criteria; runs them; must NOT change production code (reports bugs instead) | Read, Write, Edit, Grep, Glob, Bash | sonnet | Spec + code → tests + test run summary |
| `reviewer` | Reviews the story's changes against spec, ADRs, CLAUDE.md, security and a11y. **Read-only: cannot edit or run anything**, returns a report that the main session saves | Read, Grep, Glob | opus | Spec + diff + test summary → `docs/reviews/REVIEW-US-XX.md` |

Justification to record in each agent file (one or two lines): why this split (separation of concerns, a reviewer that cannot "silently fix", tests derived from the spec and not from the code), why these tools, why this model (opus for reasoning-heavy, sonnet for code generation speed/cost).

### 3.5 Custom skills (`.claude/skills/<name>/SKILL.md`)

1. **`spec-authoring`** — spec template (front matter, traceability header, scope, gaps & resolutions, country matrix CO/CL, data contract with Strapi, validations, UI states loading/empty/error, a11y, acceptance criteria in Gherkin with IDs like `US-01-AC-02`, test mapping, out of scope) and a **gap-detection checklist** (country resolution, validation details, edge cases, persistence, security, accessibility, responsive, error states).
2. **`strapi5-content-modeling`** — how this project models content in Strapi 5: collection types vs components, draft & publish, filtering by country, seed strategy, minimal public role permissions (read-only `find`/`findOne` only on what the app needs), no write tokens in the browser. **Verify every Strapi API detail against the official Strapi 5 docs (docs.strapi.io) using WebFetch, not memory, and cite the pages used.** I have no prior Strapi experience, so this skill must be accurate and practical.
3. **`angular-conventions`** — Angular 21+: standalone components only, signals for state, `@if`/`@for`/`@switch`, typed reactive forms, `inject()`, OnPush, folder structure by feature, loading/error handling pattern, a11y checklist (labels, `aria-describedby` for errors, focus management between wizard steps, keyboard-only completion). Verify version-specific APIs against angular.dev.

Each skill: front matter (`name`, `description` that says when to use it) + concise, actionable body.

### 3.6 CLAUDE.md (global context)

Must contain:
- Project summary (2–3 lines) and links to the PDF and user stories.
- Stack and versions: Angular 21+, Strapi 5+, Docker Compose, Playwright for e2e.
- Non-negotiables: one build for CO and CL; form and plans 100% from Strapi; no NgModules; no Strapi token with write permissions in the frontend; fictitious data only; no real payment gateway or card data; simulated price and payment.
- The flow (3.1), checkpoints (3.2) and status gates (3.3).
- Language policy: code, docs, commits, specs and ADRs in **English**; end-user UI copy in **Spanish** (served from Strapi per country).
- Traceability conventions:
  - IDs: `US-01`, `SPEC-US-01`, `US-01-AC-02`, `ADR-001`, `REVIEW-US-01-F03`.
  - Branch per story: `feat/US-01-<slug>`.
  - Commits: Conventional Commits with story scope, e.g. `feat(US-01): render fields from Strapi config`, plus trailer `Refs: SPEC-US-01, ADR-001`.
  - Test names start with the AC ID, e.g. `US-01-AC-02 shows configured error message`.
  - Review findings record the fixing commit hash.
- Definition of Done per story.
- Reminder: export each session with `/export` into `docs/ai-sessions/` without editing.
- Keep it concise (it is loaded in every session).

### 3.7 Templates

- `docs/adr/0000-template.md` in MADR format (context, decision drivers, considered options, decision outcome, consequences positive/negative, links).
- `docs/reviews/0000-template.md`: header with story/spec/commit range, findings table (ID, severity, file:line, finding, recommendation, human decision, resolution commit, status), summary.

### 3.8 FLOW.md skeleton

Title, a Mermaid diagram of 3.1 including the HCs, and the per-step table with the columns required by the assessment (Step, Description, AI used?, AI/agent/subagent/skill used, Deliverable, Human in the loop), filled for the steps defined so far. Add a "Step 0 — Flow design" row: human decisions, drafting by Claude Code, human review. Leave TODO headings for: tool choice justification, SDD variant justification, team of 5, what didn't work, where AI was not used.

## 4. Constraints for this session

- Do not install dependencies or scaffold Angular/Strapi.
- Do not commit yet.
- When everything is created, STOP and give me:
  1. The file tree you created.
  2. A short summary of each agent and skill.
  3. Any decision of mine above you think is weak or risky, with your reasoning (do not change it yourself).
  4. Any open question.

Then wait for my `APPROVED` or `REJECTED: <reason>`. After `APPROVED`, make one commit: `chore(flow): set up agentic flow (agents, skills, context, templates)`.
