---
id: INT-0011
slug: ci-closeout-gate-skip
kind: fix
status: accepted
created_at: 2026-05-30T00:00:00Z
provenance:
  agent_id: planner
  model: claude-sonnet-4-6
  prompt_hash: ""
  trace_id: ""
  inputs_digest: ""
plane_issue: ""
---

# Intent — CI gates must pass on SDLC closeout PRs

## Problem

Housekeeping PRs that only mark a spec `status: done` fail `verify-gate` and
`review-gate` because Plane verify evidence and review comments live on the
implementation PR, not the closeout commit SHA.

## Success metric

Closeout PRs get green verify/review gates without re-posting evidence.

## Non-goals

Weakening verify/review gates on implementation PRs.
