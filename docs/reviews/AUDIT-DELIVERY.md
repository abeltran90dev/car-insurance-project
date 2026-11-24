# AUDIT-DELIVERY: repository vs. assessment brief

| Field | Value |
|-------|-------|
| Date | 2026-11-23 |
| Auditor | `reviewer` subagent (Claude Code, opus), read-only |
| Branch audited | `chore/final-delivery` (working tree as on disk; HEAD `839f9b9`) |
| Brief | `docs/assessment/Technical assessment -Frontend.pdf` (9 pages, read in full) |
| Scope | PDF sections "Technical requirements" (p. 2–3), "Agentic flow requirements" (p. 3), "Step by step: from functional user story to QA handoff" (p. 4), "Deliverables and rules" (p. 4–5). Functional scope, user stories and evaluation criteria are out of scope, except where a row above refers to them. |
| Method | Each compound sentence in the four sections is split into atomic requirements. Each one is checked against repo files with Read/Grep/Glob. I ran no commands, builds or tests. Test and Docker results come from repo documents (README, review reports). Commit trailers can't be checked from repo files because the `.diff` inputs use `git log --oneline`. A requirement whose content is still a `TODO` in README.md or FLOW.md is marked `partial` or `not met` with the gap "pending Block 3/4". |

Status legend: `met` · `partial` · `not met`.

## 1. Technical requirements (PDF p. 2–3)

| # | Requirement | Status | Evidence | Gap |
|---|-------------|--------|----------|-----|
| A-01 | Front end: "Angular 21 or later" (p. 2) | met | `frontend/package.json:17` `"@angular/core": "^21.2.0"` | |
| A-02 | "standalone components" (p. 2) | met | No `NgModule` or `standalone: false` in `frontend/src` (grep). Components in `frontend/src/app/features/*`, `frontend/src/app/shared/*` | |
| A-03 | "signals" (p. 2) | met | `signal(`/`computed(` in `frontend/src/app/core/quote-store.ts`, `features/summary/summary.ts`, `features/plan-list/plan-list.ts`, `features/applicant-form/applicant-form.ts` (63 occurrences across 14 files, including control flow) | |
| A-04 | "built-in control flow (@if, @for)" (p. 2) | met | `@if`/`@for` in `applicant-form.html`, `plan-list.html`, `summary.html`. No `*ngIf`/`*ngFor` in `frontend/src` (grep) | |
| A-05 | "no NgModules" (p. 2) | met | Grep for `NgModule` in `frontend/src` returns nothing | |
| A-06 | Content backend: "Strapi 5 or later" (p. 2) | met | `cms/package.json:22` `"@strapi/strapi": "5.63.0"` | |
| A-07 | Forms: "Step 1 form generated dynamically from the Strapi configuration" (p. 2) | met | `cms/src/api/form-field/content-types/form-field/schema.json` (label, type enum text/number/select/date/checkbox, required, helpText, errorMessage, order, options, validations, country). Rendered from config in `frontend/src/app/features/applicant-form/form-field-config.ts`, `applicant-form.html`. REVIEW-US-01 HC4 row records a live Strapi change reflected after reload (`docs/reviews/REVIEW-US-01.md:15`) | |
| A-08 | "with typed validations" (p. 2) | met | `cms/src/components/form/validation-rule.json` (enumerated `type`). `frontend/src/app/features/applicant-form/validators.ts` (minAge, vehicleYear, rut, colombianId, …). Tests `validators.spec.ts`, `validators-rut.spec.ts`, `form-field-config.spec.ts`. No `any` in non-spec app code (grep) | |
| A-09 | Multi-country: "Content differentiation strategy by country, proposed by you" (p. 2) | met | `docs/adr/ADR-001-multi-country-content-model.md` (option (a): `country` collection type plus relations) | |
| A-10 | "…and documented in an ADR" (p. 2) | met | ADR-001 `status: Accepted`, 4 options with pros and cons, consequences. Also ADR-002 (country resolution in the frontend) | |
| A-11 | Security: "No Strapi token with write permissions may reach the browser" (p. 2) | met | `frontend/src/app/core/strapi-client.ts:18` (GET only, no Authorization header). Grep for `Authorization\|Bearer\|innerHTML\|bypassSecurityTrust` in `frontend/src` finds only that comment and one spec assertion. ADR-003 rule 5. Denial test `cms/tests/public-permissions.test.mjs` plus e2e `US-0x-AC-15/19/22` | |
| A-12 | "Public role permissions minimal" (p. 2) | met | `cms/src/bootstrap/permissions.ts:4-9`: explicit allow-list of `find` only on country, form-field, plan, site-copy. No findOne, no writes. Note: an anonymous `?status=draft` request reads unpublished entries. This is accepted as a known risk (README.md:88) | |
| A-13 | "…and justified" (p. 2) | met | ADR-003 (4 alternatives, rules, consequences, HC2 decisions). README.md:34 links it. README "Security notes" is still TODO (see A-48) | |
| A-14 | Testing: "Unit tests for the relevant logic" (p. 2) | met | 13 unit spec files, e.g. `core/country-config.spec.ts`, `applicant-form/validators*.spec.ts`, `plan-list/plan-list*.spec.ts`, `summary/summary*.spec.ts`, `summary/summary-guard.spec.ts`. README.md:73. Test totals are not yet in README (not a PDF requirement) | |
| A-15 | "at least one e2e test of the full flow for one country" (p. 2) | met | `frontend/e2e/full-flow-keyboard.spec.ts:28` `US-01-AC-12 US-03-AC-20 completes the full Colombia flow with keyboard only`. Per-story e2e in `frontend/e2e/us-0{1,2,3}-*.spec.ts` | |
| A-16 | Environment: "The whole project starts with a single command (for example docker compose up)" (p. 2) | met | `docker-compose.yml` (cms with healthcheck; frontend depends on a healthy cms). README.md:13-25: `docker compose up --build`, verified on a fresh clone on 2026-11-23 (commit `839f9b9`). No `.env` needed (README.md:32). On Windows with a lowercase drive letter the command needs a documented env-var workaround (README.md:17-23) | |
| A-17 | "…with seed data for both countries" (p. 2) | met | `cms/src/bootstrap/seed-data.ts:264,270` (CO, CL), `cms/src/bootstrap/seed.ts`, `SEED_ON_BOOT=true` (`docker-compose.yml:8`). README.md:33 | |
| A-18 | Accessibility: "The wizard can be completed using only the keyboard" (p. 3) | met | Automated for CO: `frontend/e2e/full-flow-keyboard.spec.ts:28`. CL checked manually at HC4 (README.md:115) | |
| A-19 | "…and fields have accessible labels" (p. 3) | met | `applicant-form.html:36,39,55,69` `<label [for]>` plus `[attr.aria-describedby]` (lines 34, 46, 65, 78). A11y fixes REVIEW-US-03-F09/F10 resolved | |
| A-20 | Responsive: "Works on mobile and desktop" (p. 3) | partial | Breakpoints in `frontend/src/styles.css:143`, `plan-list.css:123`, `summary.css:112`. US-01-AC-21 (320 px) checked manually at HC4 (README.md:99) | US-02-AC-21 and US-03-AC-21 are "Pending manual check" (README.md:108, 116). No automated viewport test (no `setViewportSize`/`devices[` in `frontend/e2e`) |
| A-21 | "List in the README any requirement you decide not to meet and why." (p. 3) | not met | README.md:118-120 | Section is a `TODO`. Pending Block 4 |

## 2. Agentic flow requirements (PDF p. 3)

| # | Requirement | Status | Evidence | Gap |
|---|-------------|--------|----------|-----|
| A-22 | An agentic flow: "a system of AI agents that takes the user stories to QA-ready code" (p. 3) | met | FLOW.md:14-48 (diagram), FLOW.md:54-65 (steps). Commit `4f969ef` "merge(US-03): Summary and payment — ready for QA". HC4 records: `docs/reviews/REVIEW-US-01.md:15`, commit `1dbaf06` | |
| A-23 | "…with people stepping in at the points you define" (p. 3) | met | CLAUDE.md "Human checkpoints" (HC1–HC4 with criteria and on-rejection). FLOW.md:67-76. Decisions recorded in spec front matter (`docs/specs/SPEC-US-0*.md:5-8`), ADR `deciders`, review "Human decision" columns | |
| A-24 | Subagents: "The flow uses subagents with separate responsibilities" (p. 3) | met | `.claude/agents/{spec-writer,architect,implementer,test-writer,reviewer}.md`. Tool lists differ (reviewer Read/Grep/Glob only, `.claude/agents/reviewer.md:4`). Subagent use visible in `docs/ai-sessions/raw/*/subagents/*.meta.json` | |
| A-25 | "Their definitions (instructions, allowed tools, inputs and outputs) are versioned in the repository" (p. 3) | met | Each agent file has `tools:`/`model:` front matter and `## Inputs` / `## Outputs` sections (grep: 2 matches in each of the 5 files) | |
| A-26 | Skills: "at least one custom skill, versioned in the repository, that encapsulates reusable project knowledge" (p. 3) | met | `.claude/skills/spec-authoring/SKILL.md`, `strapi5-content-modeling/SKILL.md`, `angular-conventions/SKILL.md`. Updated from experience (FLOW.md:114, 116) | |
| A-27 | Context file: "a global context file (AGENTS.md, CLAUDE.md or equivalent) with the conventions all agents must follow" (p. 3) | met | `CLAUDE.md` (non-negotiables, language, flow, HCs, gates, traceability, DoD, session logs) | |
| A-28 | ADRs: "Relevant architecture decisions are recorded in ADRs (MADR, Nygard or similar format)" (p. 3) | met | `docs/adr/ADR-001`…`ADR-005`, MADR structure, all `status: Accepted` | |
| A-29 | "…with context, alternatives considered and consequences" (p. 3) | met | e.g. ADR-001 (4 options, Consequences, Confirmation), ADR-003 (4 options), ADR-005 (4 options) | |
| A-30 | "At minimum, one on the multi-country strategy" (p. 3) | met | `docs/adr/ADR-001-multi-country-content-model.md` | |
| A-31 | Specs: "Each user story has its spec before it is implemented" (p. 3) | met | `docs/specs/SPEC-US-0{1,2,3}.md`, all `status: Approved` with versions 2, 3, 3 and a Changelog. Enforced by `.claude/hooks/spec-gate.mjs` via `.claude/settings.json`. Each review records the approved spec version (e.g. `REVIEW-US-03.md:6`) | |
| A-32 | Code review: "There is evidence of code review within the flow, with findings" (p. 3) | met | `docs/reviews/REVIEW-US-0{1,2,3}.md` (10, 6 and 10 findings) with inputs `docs/reviews/US-0{1,2,3}.diff`. Real defects found, e.g. REVIEW-US-03-F01 (blocker, NG0203) and F02 (payment possible without terms) | |
| A-33 | "…and how they were resolved" (p. 3) | met | Every finding row has a human decision and a status (Resolved/Accepted). "Fix now" rows have resolution commits (e.g. `REVIEW-US-03.md:26` → `0e598a7`). Accepted risks are mirrored in README.md:86-93. Note: `REVIEW-US-03.md:85` says "Re-review after fixes: pending" and no `US-NN-r2.diff` exists. That is a CLAUDE.md procedure item, not a PDF requirement | |
| A-34 | Traceability: "user story → spec → ADR → code → tests → review can be followed" (p. 3) | met | FLOW.md:92-94. Spec `adrs:` front matter (`SPEC-US-0*.md:9`). AC IDs in test names (e.g. `full-flow-keyboard.spec.ts:28`). Review "Spec conformance" tables map each AC to a test. Finding → resolution commit. `Refs:` trailers can't be confirmed from repo files (the `.diff` headers are `--oneline`, `REVIEW-US-03.md:83`) | |
| A-35 | SDD is suggested; if you use your own variant, "explain why" (p. 3) | partial | ADR-005 (own SDD variant vs Spec Kit, Kiro, no SDD, with consequences) | FLOW.md:100-102 "SDD variant justification" is `TODO`. Pending Block 3 (summarize ADR-005 there) |
| A-36 | "The tool is your choice … Justify your choice." (p. 3) | partial | ADR-005:36 ("reuses an already installed tool"), ADR-005:43-45 (subagent and hook capabilities) | FLOW.md:96-98 is `TODO`. ADR-005 compares SDD frameworks (Spec Kit, Kiro), not the tools the brief names (Cursor, GitHub Copilot, OpenCode, Codex). Pending Block 3 |

## 3. Step by step: from functional user story to QA handoff (PDF p. 4)

| # | Requirement | Status | Evidence | Gap |
|---|-------------|--------|----------|-----|
| A-37 | "deliver a FLOW.md file that explains your full flow, from receiving a functional user story until the increment is ready for QA" (p. 4) | partial | `FLOW.md` (steps 0–8, HCs, gates, traceability) | FLOW.md:3 still says "Skeleton…TODO sections are completed at the end". Pending Block 3 |
| A-38 | "Include a diagram of the flow (Mermaid or image)" (p. 4) | met | FLOW.md:14-48 (Mermaid flowchart with HC1–HC4, spec gate and spec change loop) | |
| A-39 | Per step: "Step" (name) (p. 4) | met | FLOW.md:54-65, column "Step" | |
| A-40 | Per step: "Description: what happens and why" (p. 4) | met | FLOW.md:54-65, column "Description" | |
| A-41 | Per step: "AI used? Yes/No" (p. 4) | met | FLOW.md:54-65, column "AI used?" | |
| A-42 | Per step: "AI, agent, subagent or skill used: tool, model and component" (p. 4) | partial | FLOW.md:56-63 name Claude Code, the subagent, model and skills | The Claude.ai planning chat is not listed in any step, though SPEC-US-01 was drafted there (FLOW.md:110, ADR-005:56). Step 0 gives "Opus 5.5" while steps 1–6 give only "opus"/"sonnet". Pending Block 3 |
| A-43 | Per step: "Deliverable produced: file or artifact (path in the repo)" (p. 4) | partial | FLOW.md:54-65, column "Deliverable produced" | Step 8 (FLOW.md:65) lists `docs/ai-sessions/raw/**` and says raw JSONL is copied. Raw `*.jsonl` is gitignored (`.gitignore:29`, `docs/ai-sessions/README.md:12`), so the path is not a repo deliverable. ADR-005:64 also says raw JSONL "are committed", which is stale. Pending Block 3 |
| A-44 | Per step: "Human in the loop: who steps in, what they review or approve, and what happens on rejection" (p. 4) | met | FLOW.md:56-65, column "Human in the loop" (approver, criteria, rejection path; "No checkpoint" stated with a reason for steps 3, 4, 6) | |
| A-45 | "in FLOW.md briefly answer: What you would do differently if a team of 5 developers used this flow" (p. 4) | not met | FLOW.md:104-106 | `TODO`. Pending Block 3 |
| A-46 | "…Which part of the flow did not work as expected and how you adjusted it" (p. 4) | met | FLOW.md:108-116 (6 entries, each with an adjustment, e.g. the classifier block on SPEC-US-01 and the `inject()`-after-`await` rule moved into the reviewer checklist) | FLOW.md:118 still has a trailing "TODO (remaining items at project end)" line to resolve in Block 3 |
| A-47 | "…At which points you decided not to use AI and why" (p. 4) | not met | FLOW.md:120-122. Steps 7 and 8 are marked "No" (FLOW.md:64-65) | Section is `TODO`. The step table gives no reasons. Human-only decisions (HC approvals, SPEC-US-01 drafting review, scans) are not explained. Pending Block 3 |

## 4. Deliverables and rules (PDF p. 4–5)

| # | Requirement | Status | Evidence | Gap |
|---|-------------|--------|----------|-----|
| A-48 | "Deliver a Git repository, public or private and shared with whoever sent you the test" (p. 4) | partial | Git repo, `main` holds US-01..03 merges (`4f969ef`) | Final-phase work is on `chore/final-delivery`, not yet merged. Sharing with the evaluator can't be checked from the repo |
| A-49 | "The Angular application code" (p. 4) | met | `frontend/` | |
| A-50 | "…and the Strapi project" (p. 4) | met | `cms/` (schemas, components, bootstrap, `cms/tests/public-permissions.test.mjs`) | |
| A-51 | "…with seed data for Colombia and Chile" (p. 4) | met | `cms/src/bootstrap/seed-data.ts:264,270`, `seed.ts` | |
| A-52 | "README.md with instructions to run the project" (p. 4) | met | README.md:9-50 (Docker, URLs, admin creation, local dev, troubleshooting), README.md:66-74 (tests) | README.md:3 still says "Skeleton". Multi-country (README.md:76-78) and Security (README.md:80-82) are `TODO`. Not required by this row; see A-21 |
| A-53 | "README.md with … any requirements not met" (p. 4) | not met | README.md:118-120 | `TODO`. Pending Block 4 (same gap as A-21) |
| A-54 | "FLOW.md with the step by step of the agentic flow" (p. 4) | partial | FLOW.md:52-65 | Same gaps as A-37, A-42, A-43, A-45, A-47. Pending Block 3 |
| A-55 | "…and its diagram" (p. 4) | met | FLOW.md:14-48 | |
| A-56 | "A global context file (AGENTS.md, CLAUDE.md or equivalent)" (p. 4) | met | `CLAUDE.md` | |
| A-57 | "Versioned subagent … definitions" (p. 4) | met | `.claude/agents/*.md` (5) | |
| A-58 | "Versioned … skill definitions" (p. 4) | met | `.claude/skills/*/SKILL.md` (3). The spec-gate hook is also versioned (`.claude/hooks/spec-gate.mjs`, `.claude/settings.json`) | |
| A-59 | "A specs folder, at least one spec per user story" (p. 4) | met | `docs/specs/SPEC-US-01.md`, `SPEC-US-02.md`, `SPEC-US-03.md` | |
| A-60 | "An ADRs folder, with at least the multi-country strategy ADR" (p. 4) | met | `docs/adr/ADR-001-multi-country-content-model.md` (plus ADR-002..005) | |
| A-61 | "Evidence of code reviews (reports, PR comments or similar)" (p. 4) | met | `docs/reviews/REVIEW-US-0{1,2,3}.md` with their `US-0{1,2,3}.diff` inputs | |
| A-62 | "…and how they were resolved" (p. 4) | met | Same as A-33 (Human decision, Resolution commit and Status filled for every finding) | |
| A-63 | "Unedited logs or exports of your sessions with the agents" (p. 4) | partial | Exports on disk: `docs/ai-sessions/2026-11-23-{phase-0,phase-1,phase-2,US-01,US-02,US-03}.txt`. Policy in `docs/ai-sessions/README.md` | `2026-11-23-US-01.txt` and `-US-02.txt` are untracked (git status). The final-phase export is missing. The Claude.ai planning-chat log is cited as present in `docs/ai-sessions/` (FLOW.md:110, ADR-005:56) but no such file exists. Raw JSONL is excluded by human decision, so the `.txt` exports must be complete. Pending final step |
| A-64 | Rule: "Use fictitious data only. Do not include real personal data…" (p. 5) | partial | Seed and test data are fictitious (e.g. `1111111111`, `11.111.111-1`, `example.test`, "texto de ejemplo"; REVIEW-US-03.md:81) | `docs/ai-sessions/README.md:24`: `2026-11-23-phase-0.txt` line 2638 contains the local part of the author's email. It was committed unedited by human decision. This is personal data under a strict reading, so it needs an explicit re-confirmation (or exclusion) before delivery. The newly added exports (US-01, US-02, final, Claude.ai chat) still need the CLAUDE.md email/secret scan |
| A-65 | Rule: "…or credentials in the repository" (p. 5) | met | `.env.example` has empty secrets. `.env`/`.env.*` gitignored (`.gitignore:15-16`). Strapi secrets are generated at container start (`docker-compose.yml:9-16`). No admin credentials (README.md:35). The rule was not re-checked against the uncommitted session exports (see A-64) | |
| A-66 | Rule: "If a tool requires a paid plan and you don't have access, use a free alternative and say so" (p. 5) | met | Conditional rule. No tool was substituted for lack of access (Claude Code is used throughout, ADR-005) | Optional: state the plan used in README "AI use" (Block 4) |

## Observations outside the PDF rows (informational, no status)

- Stale statements to fix while rewriting docs: ADR-005:64 says raw JSONL is committed. FLOW.md:65 lists `raw/**` as a deliverable. FLOW.md:110 and ADR-005:56 cite a Claude.ai log that is not yet in the repo.
- README.md:88: anonymous `GET /api/<type>?status=draft` returns draft entries. This is an accepted risk, and the proposed middleware fix is still open. The README "Requirements not met" / "Security" sections should mention it.
- `REVIEW-US-03.md:85` "Re-review after fixes: pending". REVIEW-US-03-F10 was logged by the main session, not by a reviewer run (`REVIEW-US-03.md:35`). There are no `US-NN-r2.diff` files, although CLAUDE.md "Review procedure" step 5 calls for them.
- README test totals (unit/e2e pass counts) are not yet recorded. The brief doesn't require them, but they back A-14/A-15 claims.

## Gaps summary

| ID | Gap | Suggested fix | Effort | Human decision |
|----|-----|---------------|--------|----------------|
| A-20 | Responsive behavior on mobile is unverified for steps 2 and 3 (US-02-AC-21, US-03-AC-21 pending manual check). No automated viewport test | Do the manual 360 px / desktop check in CO and CL and record it in README "Manual checks". Optionally add one Playwright test on a mobile viewport (e.g. the full flow at 360×740) | S | |
| A-21 / A-53 | README "Requirements not met" is `TODO` | Block 4: list each unmet or partially met item with a reason (e.g. draft exposure via `?status=draft`, P2 ACs verified only manually, accepted HC3 risks, Windows bake caveat), or state explicitly that none are unmet | S | |
| A-35 | SDD justification is in ADR-005 but FLOW.md section is `TODO` | Block 3: short summary in FLOW.md that links ADR-005 | S | |
| A-36 | Tool choice not justified against the tools the brief names. FLOW.md section `TODO` | Block 3: compare Claude Code against Cursor, Copilot, Codex and OpenCode on subagents with tool allow-lists, hooks (spec gate), skills and transcript export, and link ADR-005 | S | |
| A-37 / A-54 | FLOW.md is still marked "Skeleton" and has TODO sections | Block 3 rewrite. Remove the skeleton banner and every `TODO` | M | |
| A-42 | Step table omits the Claude.ai planning chat (used to draft SPEC-US-01). Model naming is inconsistent | Add the Claude.ai step or sub-step (tool, model, human role) and use exact model names in every row | S | |
| A-43 | Step 8 deliverable (`docs/ai-sessions/raw/**`) contradicts the gitignore decision. ADR-005:64 is stale | Fix the step 8 row to list the `/export` `.txt` files plus committed `.meta.json` only. Amend ADR-005's Confirmation text (it is Accepted, so decide whether that goes through HC2 or a superseding note) | S | |
| A-45 | "Team of 5 developers" answer missing | Block 3: write a short section (e.g. parallel story branches, CODEOWNERS on specs/ADRs, CI running the spec gate and reviewer checks, rotating approvers, shared skills) | S | |
| A-46 | Trailing "TODO (remaining items at project end)" in the "did not work" section | Block 3: add the final-phase items or remove the line | S | |
| A-47 | "Where AI was not used and why" missing | Block 3: list the human-only points with reasons (HC1–HC4 approvals, HC4 manual checks, the session-log scan and exclusion decisions, the Docker workaround verification, any manual Strapi admin edits) | S | |
| A-48 | Final-delivery work not merged. Sharing with the evaluator can't be checked from the repo | Merge `chore/final-delivery` to `main` after the final HC, and confirm repo access for the evaluator | S | |
| A-63 | Session logs incomplete: US-01/US-02 exports untracked, final-phase export and Claude.ai planning-chat log missing (the latter is cited by FLOW.md:110 and ADR-005:56) | Run the CLAUDE.md scan on all new exports, commit the clean ones (`docs(sessions): …`), add the Claude.ai log, list any excluded file in `docs/ai-sessions/README.md` | S | |
| A-64 | The committed `2026-11-23-phase-0.txt` contains the local part of the author's email (by prior human decision). New exports not yet scanned | Re-confirm or reverse the decision for the phase-0 file at delivery time. Scan the new exports before committing | S | |

Pending README/FLOW rewrites (Blocks 3/4) account for most gaps. The only app-level gap (A-20) is that mobile behavior on steps 2 and 3 is not verified.
