---
id: ADR-005
title: Development flow (SDD variant) and agentic tooling
status: Accepted          # Proposed | Accepted | Superseded
date: 2026-11-23
deciders: Andres Beltran
related_specs: [SPEC-US-01, SPEC-US-02, SPEC-US-03]
supersedes:
superseded_by:
---

# ADR-005: Development flow (SDD variant) and agentic tooling

## Context and problem statement

The assessment weighs the agentic flow at 65% and the app at 35% (CLAUDE.md). The whole delivery, from flow design to QA-ready increments for three stories, happens in **one day**, with one human approver. The flow must turn each story into a verifiable spec, record decisions, implement, test and review it, keep the human in control at defined checkpoints, and leave auditable artifacts (specs, ADRs, reviews, session logs). Which spec-driven development (SDD) process and which tool do we use?

## Decision drivers

- Fits one day, with near-zero setup and learning cost.
- Human checkpoints with explicit `APPROVED` / `REJECTED: <reason>` and status gates that are **enforced**, not just requested.
- Traceability story → spec (AC IDs) → ADR → commits → tests → review findings.
- Separation of concerns: the reviewer cannot silently fix; tests come from the spec, not the code.
- Project knowledge (Strapi 5, Angular 21) verified against official docs and reusable across agents.
- Raw session logs must be exportable as a deliverable.

## Considered options

1. **Own lightweight SDD variant on Claude Code**: `CLAUDE.md` + 5 subagents + 3 skills + a `PreToolUse` spec-gate hook + 4 human checkpoints
2. **GitHub Spec Kit** (`specify` CLI; constitution → specify → plan → tasks → implement → converge)
3. **Kiro specs** (`requirements.md` → `design.md` → `tasks.md` per feature)
4. **No formal SDD**: one agent session per story, prompt-driven, with a human code review at the end

## Decision outcome

**Chosen option:** "Own lightweight SDD variant on Claude Code", because it puts the human checkpoints, gates and traceability conventions **exactly** where this assessment grades them, and enforces the critical gate with a hook. It reuses an already installed tool, so setup is hours, not a day. Spec Kit and Kiro bring a fixed artifact pipeline (spec → plan → tasks) that we would have to bend to fit our ADR, review-finding and HC conventions, with less control over agent roles and tool permissions.

### Design (as built in Phase 0)

| Element | Choice | Why |
|---------|--------|-----|
| Global context | `CLAUDE.md` (non-negotiables, flow, HCs, gates, traceability, DoD) | Every agent reads the same rules |
| Subagents (`.claude/agents/`) | `spec-writer` (opus, Read/Grep/Glob/Write), `architect` (opus, + WebFetch, no Edit/Bash), `implementer` (sonnet, + Edit/Bash), `test-writer` (sonnet, must not change production code, reports `TW-BUG`s), `reviewer` (opus, **Read/Grep/Glob only**) | Own context window, tool allow-list and model per subagent (verified). Opus for reasoning-heavy work (specs, trade-offs, review), sonnet for code speed and cost. A read-only reviewer cannot "fix quietly". |
| Skills | `spec-authoring`, `strapi5-content-modeling`, `angular-conventions` | Versioned, doc-verified knowledge loaded on demand, with `[unverified]` markers |
| Enforcement | `PreToolUse` hook on `Write\|Edit\|NotebookEdit` → `spec-gate.mjs` blocks writes under `frontend/`/`cms/` unless the branch is `feat/US-XX-*` with an `Approved` spec, or `chore/scaffold-*` for infrastructure | PreToolUse hooks can block a tool call (exit 2 or `permissionDecision: deny`) and match tool names like `Write\|Edit` (verified) |
| Human checkpoints | HC1 spec, HC2 ADR, HC3 findings triage, HC4 sign-off | Matches the grading criteria; each decision is recorded in the artifact |
| Spec change loop | `version+1`, `status: Draft`, Changelog row, HC1 again; the gate re-locks the story's code | Specs written up front will change during implementation |

### Consequences

- **Positive:** Each graded concern (gaps, decisions, testability, review, human control) has a named artifact and an ID scheme, so the trail is auditable from story to commit.
- **Positive:** The spec gate is enforced by the tool. An agent on `main` or on a story whose spec is not `Approved` physically cannot write app code (verified on 2026-11-23 with 13 scripted cases and one live block, FLOW.md).
- **Positive:** Subagent isolation keeps the main session as orchestrator; reviewer and test-writer independence is structural (tool lists), not just a matter of instruction.
- **Negative:** It is a bespoke process: no community templates, no upgrade path, and its rules live in prose (`CLAUDE.md`, agent files) that the model can misread. Only the spec gate is hard-enforced.
- **Negative:** The hook sees file tools only. `Bash` (generators, shell redirects) bypasses it; this is mitigated by the CLAUDE.md branch rule and the reviewer's commit-range check, not by enforcement.
- **Negative:** Lock-in to Claude Code (subagent and hook formats, model availability, safety classifiers). This already happened in Phase 1: **two `spec-writer` runs for SPEC-US-01 were stopped by a safety classifier**, likely triggered by national-ID validation content (RUT check digit, Colombian ID), even with fictitious data. The main session did not retry or work around it and escalated to the human. **Adjustment:** Andres Beltran drafted SPEC-US-01 outside Claude Code (Claude.ai planning chat, logged in `docs/ai-sessions/`), and `spec-writer` then reviewed and completed it before HC1 (recorded in FLOW.md "What did not work as expected"). The flow survived because the HC and spec format are tool-independent, but SPEC-US-01's authorship trail is split across two tools.
- **Negative:** One human approver is a bottleneck: every HC blocks progress. On a one-day deadline this trades speed for control, deliberately.
- **Negative (cost to reverse):** Medium. Specs, ADRs and reviews are plain Markdown and portable. Agents, skills and the hook would need rewriting for another tool (e.g. a Spec Kit constitution plus templates).

### Confirmation

- FLOW.md documents every step, the HCs and this adjustment; specs and ADRs carry status and approval fields; commits carry `Refs:` trailers.
- Each story's DoD checklist (CLAUDE.md) is ticked at HC4; review reports list every `TW-BUG` as a finding with a human decision.
- Session logs (export plus raw JSONL including subagents) are committed per session after the secrets/email scan.

## Pros and cons of the options

### Own lightweight SDD on Claude Code (chosen)

- Good, because the checkpoints, IDs and artifacts are shaped to the assessment, with no adaptation layer.
- Good, because the spec gate is enforced by a hook, and tool permissions are restricted per subagent.
- Good, because setup is fast and it uses a tool already in use; the raw transcripts are available as a deliverable.
- Bad, because the process is bespoke and partly prose-enforced, and the `Bash` gap remains.
- Bad, because it depends on one vendor's classifier and features (it already blocked one run).

### GitHub Spec Kit

- Good, because it is an established open-source SDD toolkit with a clear command sequence (`/speckit-constitution`, `-specify`, `-plan`, `-tasks`, `-implement`, `-converge`) and a project "constitution" (verified).
- Good, because it is agent-agnostic through integrations (Copilot shown in its docs; Claude Code support not confirmed on the page read).
- Bad, because its pipeline (spec → plan → tasks) has no native ADR-with-alternatives step, no review-finding triage, and no hard gate. These would need custom extensions or presets on day one.
- Bad, because it requires Python 3.11+, `uv` and the `specify` CLI (verified), plus learning its conventions within the same day.
- Bad, because there are fewer per-role tool restrictions (e.g. a read-only reviewer) out of the box.

### Kiro specs

- Good, because it is a spec-first product: each feature gets `requirements.md`, `design.md` and `tasks.md`, with a phased flow and parallel task "waves" (verified).
- Good, because the design phase partly covers what our ADRs do.
- Bad, because it is a different tool and environment (IDE/CLI/web) from the one already set up. The whole flow and transcripts would move there, with a learning cost on a one-day deadline.
- Bad, because the fixed three-file structure does not map 1:1 to our artifacts (Gherkin ACs with IDs, ADRs with ≥ 3 alternatives, review findings with HC3 decisions).
- Bad, because "Quick Spec" generates all three files without approval gates (verified), so human gates would again be convention, not enforcement.

### No formal SDD (prompt-driven, review at the end)

- Good, because it is the fastest to start, with no process overhead.
- Bad, because there is no gap analysis, no testable ACs before code, and no recorded decisions. The 65% "agentic flow" grade would have little to show.
- Bad, because the human only sees code at the end; expensive misunderstandings (country model, permissions) surface late.

## Links

- Specs: [SPEC-US-01](../specs/SPEC-US-01.md) (Changelog v1: authorship after classifier block), [SPEC-US-02](../specs/SPEC-US-02.md), [SPEC-US-03](../specs/SPEC-US-03.md)
- Related: [FLOW.md](../../FLOW.md), [CLAUDE.md](../../CLAUDE.md), `.claude/agents/`, `.claude/skills/`, `.claude/hooks/spec-gate.mjs`, `docs/prompts/phase-0-prompt.md`
- Sources (official docs, checked 2026-11-23):
  - https://code.claude.com/docs/en/sub-agents (own context window, per-subagent tools and model, `.claude/agents/`)
  - https://code.claude.com/docs/en/hooks (PreToolUse can block via exit 2 or JSON `permissionDecision: deny`; matcher `Write|Edit`)
  - https://github.com/github/spec-kit (commands, requirements, installation)
  - https://kiro.dev/docs/specs/ (requirements/design/tasks files, phases, Quick Spec without approval gates)
- Unverified: Spec Kit's Claude Code integration (not stated on the page read); whether Kiro uses EARS notation (not stated on the page read).
