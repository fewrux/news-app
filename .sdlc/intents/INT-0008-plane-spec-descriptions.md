---
id: INT-0008
slug: plane-spec-descriptions
kind: chore
status: accepted
created_at: 2026-05-29T21:00:00Z
provenance:
  agent_id: planner
  model: claude-sonnet-4-6
  prompt_hash: ""
  trace_id: ""
  inputs_digest: ""
plane_issue: ""
---

# Intent — Plane spec work items: rich descriptions + PR comments (not PR issues)

## Problem

Plane shows empty spec descriptions because `create-from-spec` sends plain
`description` instead of `description_html`. Separately, `plane-sync.yml`
creates duplicate `[PR #N]` work items on every PR event instead of commenting
on the linked spec issue.

## Users

Maintainer and agents tracking work in Plane — one issue per spec with readable
body and PR lifecycle as comments.

## Success metric

New spec issues render four sections in Plane UI; opening a PR posts exactly
one comment thread marker on the spec issue (no new PR work items).

## Non-goals

Bulk-closing historical `[PR #…]` Plane backlog (manual).
