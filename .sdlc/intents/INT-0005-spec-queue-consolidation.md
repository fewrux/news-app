---
id: INT-0005
slug: spec-queue-consolidation
kind: chore
status: accepted
created_at: 2026-05-28T20:00:00Z
provenance:
  agent_id: planner
  model: claude-sonnet-4-6
  prompt_hash: 8bb2eb9b4241f322
  trace_id: ""
  inputs_digest: ""
plane_issue: ""
---

# Intent — Consolidate cross-session queue into operational-context + spec status

## Problem

The SDLC currently maintains **three overlapping “what’s in flight” surfaces**:

1. `.sdlc/handoffs/INDEX.md` + `HANDOFF-*.md` cover sheets (SPEC-0001)
2. `.sdlc/memories/operational-context.md` (`In progress`, `Next up`, `Recently completed`, chores, blocked)
3. Spec frontmatter `status: approved | superseded` with no Plane-aligned lifecycle

These drift apart in practice (e.g. handoffs INDEX shows SPEC-0002 in progress while
operational-context lists doctor under `Next up` and `Recently completed` simultaneously).
Handoff cover sheets duplicate intent, spec, and ADR content. The flowchart implies
handoff is a planning phase parallel to `/spec` and `/adr`, which confuses agents.

The maintainer and agents need **one machine-parseable queue** keyed by **spec id**,
semantically aligned with **Plane issue states**, updated deterministically by slash
commands — not hand-maintained prose sections.

## Users

- **Maintainer (felip)** — one place to see todo vs in-progress work; Plane stays in sync.
- **Every agent session** — session-start hook surfaces todo specs without reading handoffs.
- **Implementer / releaser agents** — clear rules for when operational-context and Plane update.
- **Doctor (SPEC-0002)** — checkable invariants instead of handoff-index-sync.

## Success metric

Operational, verifiable after merge:

1. `.sdlc/handoffs/` is **removed**; no `/handoff` command; `AGENTS.md` no longer references handoffs.
2. `operational-context.md` contains **only** `## todo (max 10)` and `## in_progress (max 10)` (machine lines; no chores/blocked/recently_completed).
3. Spec `status` uses **Plane-aligned enum**: `draft | todo | in_progress | done | cancelled | blocked`.
4. `/spec` completion always sets `status: todo`, appends/upserts a line under `## todo`, and runs `create-from-spec` (Plane Todo).
5. `/implement` first commit sets `in_progress`, moves line todo → in_progress, runs `set-status in_progress`.
6. `/release` sets `done`, removes line from in_progress, runs `set-status done`.
7. `load-context.mjs` banner lists todo + in_progress spec ids from operational-context and blocked specs from frontmatter scan.
8. Doctor mechanical checks include `memory.status-sync` (spec status ↔ op-ctx ↔ Plane when API available).

## Non-goals

- Does **not** merge intent + spec into one artifact (intent stays human “why”; spec stays contract).
- Does **not** add a new SaaS dependency.
- Does **not** change product code under `app/` (SDLC infrastructure only).
- Does **not** retroactively rewrite historical review/release prose; migrate forward only.
