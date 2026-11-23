# AI session logs

Unedited logs of every working session with Claude Code (required deliverable). The procedure is in [CLAUDE.md](../../CLAUDE.md#session-logs).

| Location | Contents |
|----------|----------|
| `YYYY-MM-DD-<phase-or-story>.txt` | `/export` of the main session, unedited |
| `raw/<session-id>.jsonl` | Raw main-session transcript copied from `~/.claude/projects/…`, unedited |
| `raw/<session-id>/subagents/agent-<id>.jsonl` (+ `.meta.json`) | Raw subagent transcripts, unedited |

Every file is scanned before committing. A file that contains the author's personal email is **not committed and not edited**; it is listed below instead.

## Excluded files

| File | Session date | Reason |
|------|--------------|--------|
| `raw/8b4e4e42-1745-4f6d-a20c-992313014171.jsonl` (Phase 0 main session, raw) | 2026-11-23 | excluded: contains author's personal email |
