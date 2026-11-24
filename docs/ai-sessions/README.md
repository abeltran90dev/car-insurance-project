# AI session logs

Unedited logs of every working session with Claude Code (required deliverable). The procedure is in [CLAUDE.md](../../CLAUDE.md#session-logs).

## Sessions

| File | Session | Tool |
|------|---------|------|
| [2026-11-23-planning-chat-claude-ai.md](2026-11-23-planning-chat-claude-ai.md) | Planning chat: phase prompts and the SPEC-US-01 draft written after two classifier blocks (FLOW.md §8) | Claude.ai web chat. **Added by the human at delivery.** |
| [2026-11-23-phase-0.txt](2026-11-23-phase-0.txt) | Phase 0: flow design (CLAUDE.md, agents, skills, spec-gate hook) | Claude Code `/export` |
| [2026-11-23-phase-1.txt](2026-11-23-phase-1.txt) | Phase 1: specs SPEC-US-01..03 and ADR-001..005 (HC1, HC2) | Claude Code `/export` |
| [2026-11-23-phase-2.txt](2026-11-23-phase-2.txt) | Phase 2: scaffold (Strapi, Docker, Angular shell) and the spec change loop | Claude Code `/export` |
| [2026-11-23-US-01.txt](2026-11-23-US-01.txt) | US-01 story cycle (implement, test, review, HC3, HC4) | Claude Code `/export` |
| [2026-11-23-US-02.txt](2026-11-23-US-02.txt) | US-02 story cycle | Claude Code `/export` |
| [2026-11-23-US-03.txt](2026-11-23-US-03.txt) | US-03 story cycle | Claude Code `/export` |
| `2026-11-23-final-delivery.txt` | Final phase: one-command start, delivery audit, FLOW/README, final checks | Claude Code `/export`. **Added by the human at the end of the session.** |

## Layout

| Location | Contents |
|----------|----------|
| `YYYY-MM-DD-<phase-or-story>.txt` | `/export` of the main session, unedited. These are the committed logs. |
| `raw/<session-id>.jsonl` | Raw main-session transcript, **local only (gitignored)** |
| `raw/<session-id>/subagents/agent-<id>.jsonl` | Raw subagent transcripts, **local only (gitignored)** |
| `raw/<session-id>/subagents/agent-<id>.meta.json` | Subagent metadata (agent type, model, task). Committed when the email scan is clean. |

## Raw transcripts: how the decision changed

- **Initial plan (Phase 0, recorded in [ADR-005](../adr/ADR-005-development-flow-and-tooling.md) "Confirmation", Accepted in Phase 1):** commit the `/export` file **and** the raw JSONL transcripts (main session and subagents).
- **Changed later on 2026-11-23 (standing decision, Andres Beltran):** raw transcripts are **excluded**. **Reason:** Claude Code injects the author's account email into every session and subagent context, so a raw transcript can't be committed without either editing it (which breaks "unedited") or publishing personal data. The `/export` files are the committed unedited logs, and `docs/ai-sessions/raw/**/*.jsonl` is in `.gitignore`.
- **Why ADR-005 still says otherwise:** Accepted ADRs are immutable in this project. At the final checkpoint (HC-final, 2026-11-23) the human chose to leave ADR-005 unchanged and record the change here and in [FLOW.md](../../FLOW.md) §3 instead.
- The two Phase 0 subagent transcripts were committed before this decision. They were scanned and do not contain the author's email: their only gmail matches are placeholder addresses quoted from the Angular and Strapi docs.

Every file is scanned before committing. A file that contains the author's personal email is **not committed and not edited**. It is listed below instead.

## Excluded files

| File | Session date | Reason |
|------|--------------|--------|
| `raw/8b4e4e42-1745-4f6d-a20c-992313014171.jsonl` (Phase 0 main session, raw) | 2026-11-23 | excluded: contains author's personal email |
| All other `raw/**/*.jsonl` | 2026-11-23 | excluded by the standing decision above (gitignored) |

## Notes

- `2026-11-23-phase-0.txt` line 2638 contains the local part of the author's email inside a scan command. The human decided to commit it unedited because the repo is private and this is the only readable Phase 0 log. **Re-confirmed at HC-final (Andres Beltran, 2026-11-23):** keep it. It is only the local part inside a scan command, the decision is documented, and rewriting history now is riskier than the exposure.
- **Final delivery scan (2026-11-23):** every tracked file plus the US-01/US-02 exports was scanned. No full email address in the repo matches the author's (checked by hash, so the address never appears in a log). The author's local part appears only at the line above. Hits for secret keywords are prose only ("no token", "no secrets"), and `.env.example` files have placeholders only. The exports added at the end (final delivery, planning chat) must be scanned by the human before committing.
