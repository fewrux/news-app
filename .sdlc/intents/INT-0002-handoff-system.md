---
id: INT-0002
slug: handoff-system
kind: chore
status: accepted
created_at: 2026-05-28T16:30:00Z
provenance:
  agent_id: planner
  model: claude-opus-4-7-thinking-xhigh
  prompt_hash: 530a7bf5f6907e8f
  trace_id: ""
  inputs_digest: ""
plane_issue: ""
---

# Intent — Cross-session handoff system

## Problem

Approved design decisions disappear at session boundaries. A brainstorm-style
chat that ends with "perfect, let's build it" produces *no durable artifact*
between the moment of approval and the moment an implementer touches code.
Today the maintainer carries that context in their head — or starts each new
session by re-explaining what was decided. Three concrete failures result:

1. **Drift on resumption.** When the implementer session starts hours or days
   later — possibly with a different model, possibly a different tool
   harness — there is no contract to anchor against. The implementer
   re-derives the design, often differently.
2. **Tool lock-in by accident.** The transcript lives inside one IDE
   (`agent-transcripts/<uuid>.jsonl`). Switching to Claude Code, Codex CLI,
   or Aider for the implementation loses the thread entirely.
3. **No queue.** Plane tickets exist, but they are populated ad-hoc and only
   inside one vendor. The repo itself has no machine-readable answer to
   "what's pending pickup?"

The SDLC already has intents, ADRs, and specs — these are the right shapes
for capturing decisions. What is missing is the **handoff** as a first-class
artifact: a small cover sheet that bundles a session's intent + decisions +
spec, marks the work as ready for pickup, and surfaces in every new session.

## Users

- **The maintainer (felip)** — needs to close a brainstorming session
  confident the work will be picked up faithfully, without having to babysit
  the next session.
- **The implementer agent in a fresh session** — Cursor, Claude Code, Codex,
  whatever — needs to know, before its first message, that pending work
  exists, where its contract is, and how to dispatch itself.
- **The doctor agent (INT-0003)** — needs a machine-readable queue to verify
  against (every entry in `INDEX.md` must map to a real handoff file; every
  `status: open` handoff must have a real spec; etc.).
- **The future maintainer reading git log six months out** — needs the
  handoff doc to explain why a given PR exists, without having to find the
  originating transcript.

## Success metric

Operational, not telemetric (this is SDLC infrastructure):

1. A fresh session in any agent harness reads the `## open` section of
   `.sdlc/handoffs/INDEX.md` (surfaced by the `sessionStart` hook in Cursor,
   referenced from `AGENTS.md` for other harnesses) and can name every
   pending handoff with its linked spec, ADR(s), and tracker epic — without
   the maintainer typing anything.
2. The PR that ships this intent **uses** the system: its final commit runs
   `/handoff` against the pre-written SDLC doctor artifacts (INT-0003,
   ADR-0003, SPEC-0002) and produces a real, parseable
   `HANDOFF-2026-05-28-sdlc-doctor.md` plus an INDEX entry.
3. Switching the project's tracker integration from Plane to Jira (or
   GitHub Projects, or Linear) requires no change to the handoff artifact
   shape, the `/handoff` command, the load-context hook, or any spec. Only
   `sdlc.yaml.integrations.tracker.active_provider` and a sibling
   `scripts/<provider>-sync.mjs` change. ADR-0002 ratifies the abstraction.

## Non-goals

- Does **not** automate execution. Tier 0 (manual pull) is the target;
  Tier 1 (scheduled poll) and Tier 2 (webhook dispatch) are mentioned in
  ADR-0002 § "Future automation tiers" as the upgrade path but are not
  implemented here. The handoff is the queue; humans dequeue by opening
  a session.
- Does **not** implement the SDLC doctor. Doctor's design artifacts
  (INT-0003, ADR-0003, SPEC-0002) ship in this PR so the handoff system
  has real first-flight input, but the doctor's code is the next session's
  work, dispatched via `/handoff`.
- Does **not** replace ` /intent`, `/spec`, or `/adr`. `/handoff` composes
  on top of them: a typical session uses `/intent` → `/adr?` → `/spec` →
  `/handoff` to close out, in that order. `/handoff` may invoke the others
  to fill gaps if the maintainer chose to skip them mid-session.
- Does **not** introduce a new vendor. Plane remains the active tracker.
  This intent only abstracts the integration so Plane is configuration,
  not contract.
