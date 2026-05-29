---
id: INT-0006
slug: cursor-e2e-evidence
kind: chore
status: accepted
created_at: 2026-05-29T12:00:00Z
provenance:
  agent_id: planner
  model: claude-sonnet-4-6
  prompt_hash: ""
  trace_id: ""
  inputs_digest: ""
plane_issue: ""
---

# Intent — Cursor-local e2e evidence on Plane

## Problem

Playwright e2e runs in GitHub Actions produce video/trace artifacts that expire
after seven days and are disconnected from the Plane issue that tracks the work.
Agents can open PRs before behavioral verification completes. Product and
operator (SDLC) changes can land in the same PR, muddying review and evidence
requirements.

## Users

- **Implementer / tester agents** need a clear verify-before-PR flow in Cursor.
- **Reviewer agent** needs durable evidence on the tracker ticket, not ephemeral
  CI artifacts.
- **Maintainer** needs auditability without re-running e2e in CI on every push.

## Success metric

For product-surface specs merged after this change: 100% have a Plane issue
comment with browser evidence posted during `/verify` before the draft PR opens.
Zero merged PRs touch both product and operator path lanes (doctor clean on
`process.cross-lane-diff`).

## Non-goals

- Changing Playwright test authoring conventions beyond evidence routing.
- Adding paid storage outside Plane free tier.
- Running e2e in CI as a fallback (explicitly removed).
