# AI session logs

Unedited logs of every working session with Claude Code (required deliverable). The procedure is in [CLAUDE.md](../../CLAUDE.md#session-logs).

| Location | Contents |
|----------|----------|
| `YYYY-MM-DD-<phase-or-story>.txt` | `/export` of the main session, unedited |
| `raw/<session-id>.jsonl` | Raw main-session transcript, **local only (gitignored)** |
| `raw/<session-id>/subagents/agent-<id>.jsonl` | Raw subagent transcripts, **local only (gitignored)** |
| `raw/<session-id>/subagents/agent-<id>.meta.json` | Subagent metadata, committed when the email scan is clean |

**Standing decision (Andres Beltran, 2026-11-23):** raw transcripts excluded: contain the author's account email (Claude Code injects it into every session and subagent context); `/export` files are the committed unedited logs. `docs/ai-sessions/raw/**/*.jsonl` is in `.gitignore`. The two Phase 0 subagent transcripts were committed before this decision; they were scanned and do not contain the author's email (their only gmail matches are placeholder addresses quoted from the Angular and Strapi docs).

Every file is scanned before committing. A file that contains the author's personal email is **not committed and not edited**; it is listed below instead.

## Excluded files

| File | Session date | Reason |
|------|--------------|--------|
| `raw/8b4e4e42-1745-4f6d-a20c-992313014171.jsonl` (Phase 0 main session, raw) | 2026-11-23 | excluded: contains author's personal email |

## Notes

- 2026-11-23-phase-0.txt line 2638 contains the local part of the author's email inside a scan command; committed unedited by human decision because the repo is private and this is the only readable Phase 0 log.
