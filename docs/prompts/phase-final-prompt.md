# Final phase — close, document and deliver

Goal: leave the repository ready to deliver before 23:59 today. US-01, US-02 and US-03 are merged into `main` and ready for QA. Follow CLAUDE.md. Work on `chore/final-delivery`, keep messages to me short, and push after each block so `main` is always deliverable.

## Block 1 — One-command start (time box: 20 min)

`docker compose up --build` fails on my Windows machine ("failed to execute bake"). The assessment requires a single command.
1. From a clean state (`docker compose down -v`), try `docker compose up --build` with `COMPOSE_BAKE=false` (PowerShell: `$env:COMPOSE_BAKE="false"`). Also check whether anything in `docker-compose.yml` or the Dockerfiles can make the plain command work without environment variables.
2. Whatever works, document it in README "How to run": the plain command for macOS/Linux, and the exact Windows workaround if still needed, with the reason (Docker Compose bake issue on this host).
3. Show me the evidence (containers healthy, app and admin answering).

## Block 2 — Deliverables audit (reviewer)

Run the `reviewer` subagent in **audit mode**: compare the repository against the PDF in `docs/assessment/` (sections "Technical requirements", "Agentic flow requirements", "Step by step", "Deliverables and rules"). Output `docs/reviews/AUDIT-DELIVERY.md` with one row per requirement: requirement, status (met / partial / not met), evidence (path or commit), gap. Then STOP and show me the gaps.

## HC-final — stop here

Wait for my decisions on the gaps (fix now / list in README as not met). Fix only what I mark.

## Block 3 — FLOW.md (complete, clear, honest)

FLOW.md must contain, in this order:
1. **Overview**: one paragraph on what the flow does (user story → QA-ready increment).
2. **Mermaid diagram** of the final flow: subagents, the 4 human checkpoints, the spec change loop, the test-writer bug route, and the spec-gate hook.
3. **Step table** with the required columns (Step, Description, AI used?, AI/agent/subagent/skill used — tool, model and component, Deliverable with repo path, Human in the loop — who, what is approved, what happens on rejection). Include Step 0 (flow design) and the final delivery step.
4. **Tool choice**: why Claude Code (subagents with per-agent tool restrictions, skills, hooks, CLAUDE.md, session export) versus Cursor/Copilot/Codex.
5. **SDD choice**: own lightweight variant vs Spec Kit/Kiro (link ADR-005).
6. **Evidence of human control**: short list with links to the concrete moments, e.g. Phase 0 rejection with 6 changes, HC1 rejections of SPEC-US-02/03, P1/P2 scope decision, SPEC-US-01 OQ answers, overrides of the agent's proposals (US-01 F04, US-02 F02, US-03 F09), the `?status=draft` risk decision, the clean reset decision, manual HC4 checks including live Strapi changes.
7. **What would change with a team of 5 developers**: e.g. one branch/PR per story with reviewer output posted as PR comments, CI running tests + permissions test + spec-gate as a required check, CODEOWNERS for specs/ADRs, a shared skills library, rotating human approvers, parallel stories with explicit dependency on shared ADRs, cost/model policy per agent.
8. **What did not work as expected and how it was adjusted**: classifier blocks on SPEC-US-01 (human drafted it in the Claude.ai planning chat), seed not matching the spec (caught in Phase 2 verification), skills partly wrong at first (verified against official docs and corrected), the `inject()` after `await` blocker despite the skill rule (reviewer checklist + test pattern added), a fix that caused a regression (US-03 F02 → F10, caught by tests), Docker bake on Windows, the stray `localhost` dev server, the hook not gating Bash commands, the author's email in raw transcripts (standing decision).
9. **Where AI was deliberately not used and why**: all approval/rejection decisions at HC1–HC4, scope decision P1/P2, manual browser verification at HC4, creating the Strapi admin user, repository and GitHub setup, the decision not to commit raw transcripts. State honestly that SPEC-US-01 was drafted with AI (Claude.ai planning chat), not by hand.
10. **Traceability**: a table per story: US → spec (version) → ADRs → main commits → tests (file + AC IDs) → review report → merge commit.

## Block 4 — README.md (final)

Sections: what the app is (3 lines), quick start (one command + Windows note), URLs, creating the Strapi admin, how to run unit / e2e / permissions tests, architecture in brief (diagram or bullets: Angular → nginx `/api` proxy → Strapi read-only public role), multi-country strategy summary (link ADR-001) and how to add a third country, security summary (link ADR-003), simulated pricing rule, simulated payment, repository map (where specs, ADRs, reviews, agents, skills, logs are), **requirements not met / partially met** (P2 criteria pending manual check, accepted risks incl. `?status=draft`, anything from the audit), and how AI was used (link FLOW.md).

## Block 5 — Logs and final checks

1. Confirm `docs/ai-sessions/` has the exports for phase 0, phase 1, phase 2, US-01, US-02, US-03 and this session (I will export at the end), and the README there explains the raw-transcript exclusion. Add a placeholder entry for `2026-11-23-planning-chat-claude-ai.md` (I will add the file).
2. Scan the whole repo one last time for emails and secrets.
3. Run all tests one last time (unit, e2e, permissions) and paste the totals into README.

## Close

STOP and show me a final summary. After my `APPROVED`: merge `chore/final-delivery` into `main`, tag `v1.0.0`, push with tags, and remind me to `/export` and add the planning-chat log.
