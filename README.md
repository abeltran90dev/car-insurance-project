# Multi-country car insurance quote (CO / CL)

> Skeleton. Completed as the project is built.

A single Angular application that quotes car insurance for Colombia and Chile in a 3-step wizard (data form → plan list → summary and simulated payment). Every form field, plan and piece of copy is configured per country in Strapi 5.

Built with an AI-driven, spec-driven flow. See [FLOW.md](FLOW.md) and [CLAUDE.md](CLAUDE.md).

## Quick start

TODO: `docker compose up`, URLs (frontend, Strapi admin), seeded countries, how to switch country.

## Repository layout

| Path | Contents |
|------|----------|
| `frontend/` | Angular app (TODO) |
| `cms/` | Strapi 5 project with seed data for CO and CL (TODO) |
| `docs/user-stories/` | Input user stories, verbatim |
| `docs/specs/` | One spec per story (source of truth) |
| `docs/adr/` | Architecture decision records (MADR) |
| `docs/reviews/` | Code review reports and their resolution |
| `docs/ai-sessions/` | Unedited exported agent sessions |
| `.claude/agents/` | Subagent definitions |
| `.claude/skills/` | Custom skills |

## Running tests

TODO: unit (Vitest) and e2e (Playwright) commands.

## Multi-country strategy

TODO: summary and link to ADR-001.

## Security notes

TODO: Public role permissions and their justification; no tokens in the browser.

## Requirements not met

TODO: list any requirement from the assessment that is not met, and why.
