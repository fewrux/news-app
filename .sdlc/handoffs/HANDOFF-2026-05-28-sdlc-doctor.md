---
id: HANDOFF-2026-05-28-sdlc-doctor
slug: sdlc-doctor
status: merged
created_at: 2026-05-28T16:45:00Z
intent: INT-0003
spec: SPEC-0002
adrs: [ADR-0003]
tracker:
  provider: plane                 # set to active_provider on /handoff success
  epic: b9a9731b-a904-43e2-94de-06faf629e274                     # provider-native id; written back by adapter script
  issues: [d4a5f7b8-11a1-40b0-9315-25ed1aab86a7]                   # provider-native ids; written back by adapter script
  url: ""                      # provider-native deep link; optional
provenance:
  agent_id: planner
  model: claude-opus-4-7-thinking-xhigh
  prompt_hash: 2cb55e466d8ffd59
  trace_id: ""
  inputs_digest: ""
originating_session:
  transcript: ""               # uuid not visible from inside the session
  title: "sdlc health doctor + handoff system design"
---

# Handoff — SDLC drift detection (the doctor)

## Context

The originating session (maintainer + planner) brainstormed an SDLC
health checker, then split the work in two: ship the cross-session
**handoff system** in one PR (SPEC-0001, this PR), then use that
system to dispatch the **doctor implementation** (SPEC-0002, this
handoff). Doing it in this order is intentional dogfood — the
handoff system's first user is the doctor.

The three interlocking decisions were locked in during the session
and recorded as ADR-0003: lean derived-first baseline (Option 1C),
read-only autonomy with a single `--refresh-baseline` exception
(Option 2C), advisory-then-required `ci/doctor` cadence (Option 3C).
The doctor's identity card (`.cursor/agents/doctor.md`) is already in
place; the executable behavior (script, slash command, skill, CI
workflow) is the deliverable here.

The tracker abstraction (ADR-0002) is also in place, so the doctor's
mechanical layer has a stable contract to enforce
(`struct.tracker-adapter-contract-conformance`).

## Links

- Intent:    `.sdlc/intents/INT-0003-sdlc-doctor.md`
- Spec:      `.sdlc/specs/SPEC-0002-sdlc-doctor.md`
- ADR(s):
  - `.sdlc/decisions/0003-sdlc-doctor.md` (this handoff's primary decision)
  - `.sdlc/decisions/0002-tracker-adapter-contract.md` (referenced by `struct.*` checks)

## How to pick this up

1. `/implement .sdlc/specs/SPEC-0002-sdlc-doctor.md`
2. The implementer agent runs end-to-end through verify → review →
   release per `.cursor/rules/agent-autonomy.mdc`. **Do not stop at
   phase boundaries; task = PR merged.**
3. On first commit, flip this handoff's `status:` to `in_progress`
   and move the corresponding line in `.sdlc/handoffs/INDEX.md` from
   `## open` to `## in_progress`.
4. On PR merge, `/release` sets `status: merged` and moves the line
   to `## recently_closed (last 5)`.

## What "done" looks like for SPEC-0002

Match every AC in SPEC-0002 (13 of them), with particular attention to
the canonical list of mechanical checks under `## Checks (mechanical
layer — the canonical list AC-2 binds to)`. The first real run of the
doctor is expected to produce two `fail` findings:
`struct.hook-registry-matches-config` (`.sh` vs `.mjs`) and
`artifact.legacy-plane-issue` (the INT-0001 `plane_issue:` field). Each
becomes its own cleanup intent — they are **not** in scope for the
doctor's own PR.

## Tracker mirror

The active tracker provider is declared at
`sdlc.yaml.integrations.tracker.active_provider`. `/handoff` calls
that provider's adapter (`create-from-handoff` per the contract in
ADR-0002) and writes the returned ids back into the `tracker:`
frontmatter block above.

If the env vars for the adapter were not set when `/handoff` ran, the
`tracker:` block stays empty and a `tracker_mirrored: waived` field
is appended to the frontmatter documenting the soft-fail. The
maintainer can re-run
`node scripts/plane-sync.mjs create-from-handoff .sdlc/handoffs/HANDOFF-2026-05-28-sdlc-doctor.md`
later (with `.env` loaded) to populate the mirror.
