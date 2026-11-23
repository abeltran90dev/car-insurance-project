# REVIEW-US-XX – <story title>

| Field | Value |
|-------|-------|
| Story | [US-XX](../user-stories/US-XX.md) |
| Spec | [SPEC-US-XX](../specs/SPEC-US-XX.md) (version N) |
| ADRs checked | ADR-NNN, … |
| Branch | `feat/US-XX-<slug>` |
| Commit range | `<base-sha>..<head-sha>` |
| Review input | [US-XX.diff](US-XX.diff) (changed files + diff, written by the main session) |
| Test summary reviewed | unit: N passed / N failed · e2e: N passed / N failed |
| Reviewer | reviewer subagent (Claude Code, opus), read-only |
| Review date | YYYY-MM-DD |
| Human triage (HC3) | Andres Beltran, YYYY-MM-DD |

## Findings

Source: `review` (found by the reviewer) · `test-writer` (bug reported by the test-writer; every one must be logged here).
Severity: `blocker` (violates an AC, a non-negotiable or security; must fix) · `major` (likely bug or significant deviation) · `minor` (quality issue with low risk) · `nit` (style).

Human decision (HC3): `fix now` · `accept risk: <reason>` · `out of scope: <reason>`.
Status: `Open` · `Resolved` · `Accepted` · `Deferred`.

| ID | Source | Severity | File:line | Finding | Recommendation | Human decision | Resolution commit | Status |
|----|--------|----------|-----------|---------|----------------|----------------|-------------------|--------|
| REVIEW-US-XX-F01 | review | major | `frontend/src/app/…:42` | <what is wrong, with evidence; rule/AC/ADR violated> | <concrete fix> | | | Open |
| REVIEW-US-XX-F02 | test-writer | major | `frontend/src/app/…:17` | <bug as reported (AC, failing test) + reviewer's cause analysis> | <concrete fix> | | | Open |

## Test-writer bugs

| Bug (as reported in the test run summary) | AC | Failing test | Finding ID |
|-------------------------------------------|----|--------------|------------|
| <symptom> | US-XX-AC-NN | `US-XX-AC-NN …` | REVIEW-US-XX-F02 |

(Write "None reported" if the test-writer reported no bugs.)

## Spec conformance

| AC ID | Implemented | Tested (test name) | Notes |
|-------|-------------|--------------------|-------|
| US-XX-AC-01 | yes / partial / no | `US-XX-AC-01 …` | |

## Summary

- Overall assessment (2–4 sentences).
- Areas checked with no findings: spec conformance / tests / ADRs & CLAUDE.md / security / a11y / robustness / code quality.
- Re-review after fixes: <date, result per "fix now" finding>.
