---
id: ADR-NNN
title: <short decision title, phrased as the problem solved>
status: Proposed          # Proposed | Accepted | Superseded
date: YYYY-MM-DD
deciders: Andres Beltran, architect (Claude Code subagent)
related_specs: [SPEC-US-XX]
supersedes:               # ADR-NNN, if any
superseded_by:            # ADR-NNN, if any
---

# ADR-NNN: <title>

## Context and problem statement

What forces are at play (business, technical, regulatory)? What problem needs a decision, and why now? Link the spec sections or gaps that raised it. 2–5 sentences, ideally ending in a question.

## Decision drivers

- <driver 1, e.g. "one build serves CO and CL" (CLAUDE.md non-negotiable)>
- <driver 2, e.g. "the business team edits fields without deployment" (US-01)>
- …

## Considered options

1. <Option A>
2. <Option B>
3. <Option C>

## Decision outcome

**Chosen option:** "<Option X>", because <justification tied to the decision drivers>.

### Consequences

- **Positive:** <what gets better or easier>
- **Positive:** …
- **Negative:** <what gets worse, harder or riskier; what the business team cannot do; cost to reverse>
- **Negative:** …

### Confirmation

How we will check the decision is implemented and still holds (tests, review checklist item, e2e assertion).

## Pros and cons of the options

### <Option A>

<short description, ideally with an example>

- Good, because …
- Good, because …
- Bad, because …

### <Option B>

- Good, because …
- Bad, because …

### <Option C>

- Good, because …
- Bad, because …

## Links

- Specs: [SPEC-US-XX](../specs/SPEC-US-XX.md)
- Related ADRs: …
- Sources (official docs used to verify capabilities): <URL>, …
