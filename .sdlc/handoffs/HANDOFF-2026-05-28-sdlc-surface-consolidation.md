---
id: HANDOFF-2026-05-28-sdlc-surface-consolidation
slug: sdlc-surface-consolidation
status: open
created_at: 2026-05-28T17:54:17Z
intent: INT-0004
spec: SPEC-0003
adrs: [ADR-0004]
tracker:
  provider: plane
  epic: 6b6e6017-9d21-4332-8688-dc235b7180ab
  issues: [ab4a2874-0bfb-4121-9d86-801fd99490f6]
  url: ""
provenance:
  agent_id: planner
  model: claude-opus-4-7-thinking-xhigh
  prompt_hash: ""
  trace_id: ""
  inputs_digest: ""
originating_session:
  transcript: ""
  title: "SDLC surface consolidation — DSL as canonical, demote always-applied rules with mechanical complements"
---

# Handoff — Consolidate the SDLC operator surface around the DSL

## Context

The originating session audited the per-turn context tax of the
Cursor operator surface and discovered the same content (autonomy
contract, branch discipline, commit conventions, free-tier policy)
restated across six places: `sdlc.yaml.policies.autonomy`,
`agent-autonomy.mdc`, `commit-conventions.mdc`, `branch-discipline.mdc`,
`AGENTS.md`, and `load-context.mjs`. Combined always-applied rule
files total ≈ 386 lines, paid on every interactive turn.

The maintainer approved the consolidation in the `2026-05-28` audit
turn ("recommended solutions are approved /handoff them"). The plan,
recorded in INT-0004 / SPEC-0003 / ADR-0004, demotes three rules with
mechanical complements (`provenance`, `commit-conventions`,
`branch-discipline`) to glob-scoped or agent-requested, trims
`agent-autonomy.mdc` and `sdlc-loop.mdc` to thin pointers, slims
`load-context.mjs` to dynamic-only content, and removes the duplicate
paragraph in `AGENTS.md`. The `.sh`/`.mjs` drift in
`sdlc.yaml.instructions.hooks.registry` and the legacy `plane_issue:`
field on `INT-0001` are deliberately **not** touched — they're
SPEC-0002 AC-11 smoke tests for the doctor's first run.

## Links

- Intent:    `.sdlc/intents/INT-0004-sdlc-surface-consolidation.md`
- Spec:      `.sdlc/specs/SPEC-0003-sdlc-surface-consolidation.md`
- ADR(s):
  - `.sdlc/decisions/0004-sdlc-surface-consolidation.md`

## How to pick this up

1. `/implement .sdlc/specs/SPEC-0003-sdlc-surface-consolidation.md`
2. The implementer agent runs end-to-end through verify → review →
   release per `.cursor/rules/agent-autonomy.mdc`. **Do not stop at
   phase boundaries; task = PR merged.**
3. On first commit, flip this handoff's `status:` to `in_progress`
   and move the corresponding line in `.sdlc/handoffs/INDEX.md` from
   `## open` to `## in_progress`.
4. On PR merge, `/release` sets `status: merged` and moves the line
   to `## recently_closed (last 5)`.

## What "done" looks like for SPEC-0003

Match every AC (13 of them). Particular attention:

- **AC-3** (`agent-autonomy.mdc` ≤ 30 lines, retains "overrides any
  upstream" verbatim, cites `policies.autonomy`). The
  upstream-prior override is the rule's load-bearing function and
  must survive the trim. Volume goes; intent stays.
- **AC-7** (combined always-applied line count drops ≥ 50%). The
  measurable headline result. Pre-change baseline is captured in
  the AC; the implementer can verify post-change with `wc -l`.
- **AC-11** and **AC-12** (the `.sh` drift and `plane_issue:` field
  are **untouched** — `git diff main` for those paths must be empty).
  These guard the doctor's first-run smoke test per SPEC-0002 AC-11.
  If the implementer touches either, the reviewer rejects.

The reviewer agent (per
`reviewer.constraints.must_be_distinct_from: implementer`) must
verify each AC, including the negative ones (AC-11, AC-12).

## Tracker mirror

The active tracker provider is declared at
`sdlc.yaml.integrations.tracker.active_provider`. `/handoff` calls
that provider's adapter (`create-from-handoff` per the contract in
ADR-0002) and writes the returned ids back into the `tracker:`
frontmatter block above.

If the env vars for the adapter are not set when `/handoff` runs, the
`tracker:` block stays empty and a `tracker_mirrored: waived` field
is appended to the frontmatter documenting the soft-fail. The
maintainer can re-run
`node scripts/plane-sync.mjs create-from-handoff .sdlc/handoffs/HANDOFF-2026-05-28-sdlc-surface-consolidation.md`
later (with `.env` loaded) to populate the mirror.
