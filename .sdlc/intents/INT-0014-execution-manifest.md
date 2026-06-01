---
id: INT-0014
slug: execution-manifest
kind: chore
status: accepted
created_at: 2026-06-01T17:31:00Z
provenance:
  agent_id: planner
  model: claude-sonnet-4-6
  prompt_hash: ""
  trace_id: ""
  inputs_digest: ""
plane_issue: ""
---

# Intent — Execution manifest (sdlc.execution.v1) and trustless verify

## Problem

There is no durable, machine-checkable record that a spec was fully executed
through all SDLC phases. Gates accept Plane comments at face value: a forged or
replayed comment can satisfy `validateVerify` without any local Playwright run
having occurred. Phase transitions happen in agent memory only — no audit trail
outside Plane issue threads. The `/verify` pathway for product-surface specs
has no mandatory harness: any script can write a Plane comment that passes the
gate. Post-evidence computes no content hashes, so a comment body cannot be
cross-checked against real filesystem artifacts.

## Users

- **Tester / implementer agent** — needs a single canonical harness
  (`run-verify-phase.mjs`) that creates a tamper-evident execution record.
- **Reviewer / releaser** — needs to confirm every phase gate passed and that
  verify evidence is bound to real filesystem artifacts, not a bare payload.
- **Maintainer** — wants a lightweight local audit trail without CI, committed
  files, or paid services; `.sdlc/runs/` (gitignored) fills this gap.

## Success metric

100% of product-surface spec executions that pass `gate.browser_evidence_on_plane`
have a `.sdlc/runs/{execution_id}.json` manifest with `phases.verify.harness_id`
set to `run-verify-phase.mjs` and `phases.verify.claims.video_count >= 1`.
Gate fails if manifest is missing or lacks harness ID. Measurable via
`gate.browser_evidence_on_plane` on the shipping PR for SPEC-0015 verify payload.

## Non-goals

- CI e2e re-runs for product PRs.
- Schema v2 for verify/review/release markers (keep `sdlc.verify.v1`).
- Doctor product/video audits (doctor scope stays SDLC/operator only).
- Committing `.sdlc/runs/` to the repo (gitignored; Plane comment is system of record).
- Distributed/multi-agent manifest coordination (single-machine, single-run only).
