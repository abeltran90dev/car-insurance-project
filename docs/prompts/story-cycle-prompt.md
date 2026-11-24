# Story cycle — implement one user story end to end

Usage: `Read docs/prompts/story-cycle-prompt.md and run it for US-XX.`

Run the full flow for the given story, following CLAUDE.md, the approved spec `docs/specs/SPEC-US-XX.md`, the accepted ADRs and the skills. **Deadline 23:59 today: implement P1 acceptance criteria only.** P2 criteria are not implemented as separate work; if they come for free, fine, otherwise they are listed in the README as "manual check / pending". One review round only.

## 1. Branch

From an up-to-date `main`, create `feat/US-XX-<slug>`. Confirm the spec-gate hook allows writes (spec must be `Approved`).

## 2. Implement (implementer)

Run the `implementer` subagent with the spec, the related ADRs and the skills. It works under `frontend/src/app/features/<feature>/` (and `cms/` only if the spec needs it), replaces the placeholder route component, and makes small commits:
`feat(US-XX): <what>` with trailer `Refs: SPEC-US-XX, ADR-00N`.
It must handle loading, error and empty states as the spec says, and keep everything keyboard accessible with labels.

## 3. Tests (test-writer)

Run the `test-writer` subagent. It writes automated tests for every **P1** AC, with test names starting with the AC ID, runs the whole unit suite and reports the result. Bugs it finds are reported as `TW-BUG-NN` (it does not change production code).

**Only for US-03:** it also writes the Playwright e2e of the full flow for Colombia (`/co/datos` → plans → summary → simulated approved payment → confirmation), completed **using only the keyboard**, against the running Docker stack. This covers US-01-AC-12 and the assessment's e2e requirement.

## 4. Review (reviewer)

The main session writes the commit list, changed files and diff to `docs/reviews/US-XX.diff`, then runs the `reviewer` subagent. Save its report as `docs/reviews/REVIEW-US-XX.md` (every `TW-BUG` must appear as a finding with source `test-writer`).

## HC3 — stop here

STOP and show me the findings table (ID, severity, one-line description, recommendation). Wait for my decision per finding: `fix`, `accept: <reason>` or `out of scope`. Default proposal to save time: fix every critical/high finding; accept low ones with a reason.

## 5. Fix round (implementer)

Run the `implementer` with only the findings I marked `fix`. One commit per finding (or a few grouped), message `fix(US-XX): <what> (REVIEW-US-XX-Fnn)`. The test-writer re-runs the suite (and the e2e for US-03). Fill the "Human decision", "Resolution commit" and "Status" columns in the review report.

## 6. Run it for me

Rebuild the stack (`docker compose up --build -d`) and give me a short manual checklist (max 8 items) to verify the P1 ACs in the browser, in **both** countries where the spec has a country difference.

## HC4 — stop here

STOP and wait for my `APPROVED` (ready for QA) or `REJECTED: <reason>`. On rejection, go back to step 5 with my notes.

## 7. Close

After `APPROVED`: merge `feat/US-XX-<slug>` into `main` with a merge commit `merge(US-XX): <title> — ready for QA`, push, and remind me to `/export` (file `docs/ai-sessions/2026-11-23-US-XX.txt`).

Keep every message to me short: results, evidence, what you need from me.
