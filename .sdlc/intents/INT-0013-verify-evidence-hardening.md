---
id: INT-0013
slug: verify-evidence-hardening
kind: chore
status: accepted
created_at: 2026-06-01T12:00:00Z
provenance:
  agent_id: planner
  model: claude-sonnet-4-6
  prompt_hash: ""
  trace_id: ""
  inputs_digest: ""
plane_issue: ""
---

# Intent — Mandatory product video evidence and hardened verify gates

## Problem

Product-surface `/verify` can pass gates without durable browser video: Playwright
records video only on retry (`on-first-retry`), `post-evidence --payload` skips
video upload, and `validateVerify` does not require `video_attached`. Reviewers
and releasers lack consistent human-readable Markdown summaries alongside gate
markers. Doctor scope must stay operator-only — no product PR video audits.

## Users

- **Tester agent** — needs deterministic first-pass video capture and mechanical
  collect → post → gate loop.
- **Reviewer / releaser** — needs readable Markdown evidence on Plane, PR, and
  GitHub Release without schema v2 churn.
- **Maintainer** — wants PLANE_* loaded from `.env` for local verify runs.

## Success metric

100% of merged product-surface specs post Plane verify comments with
`browser_evidence.video_attached: true` and a `.webm` attachment; operator specs
continue to waive video. Measurable via `gate.browser_evidence_on_plane` on the
shipping PR (SPEC-0014 verify payload).

## Non-goals

- Re-enabling CI e2e workflows.
- Schema v2 for verify/review/release markers.
- Doctor checks that fetch Plane for product PR video on merged app PRs.
- Product-lane code changes (this is operator-surface only).
