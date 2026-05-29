---
id: INT-0007
slug: deterministic-phase-gates
kind: chore
status: accepted
created_at: 2026-05-29T20:00:00Z
provenance:
  agent_id: planner
  model: claude-sonnet-4-6
  prompt_hash: ""
  trace_id: ""
  inputs_digest: ""
plane_issue: ""
---

# Intent — Hard deterministic phase-exit gates with external artifact stores

## Problem

Main SDLC flow phases (ideate through release) mostly relied on agent
self-certification. Only implement lint/typecheck/build and a partial review
gate were merge-blocking. Verify and review artifacts lived in `.sdlc/reports/`
and `.sdlc/reviews/` while the maintainer approved moving canonical evidence to
Plane, PR comments, and GitHub Releases — with **no local waivers** for hard gates.

## Users

- **Agent harness** — needs mechanical phase boundaries so the next slash command
  does not start until the previous phase exits 0.
- **Maintainer** — wants autonomous retry loops without human approval per step.

## Success metric

Every main-flow phase has a `check-phase-exit.mjs` validator; CI enforces verify
and review gates; zero `tolerate_missing` on tracker/verify gates. Measurable:
`ci/verify-gate` and `ci/review-gate` green on the shipping PR.

## Non-goals

- Product-surface Playwright in CI (still Cursor `/verify` per ADR-0006).
- Mechanical operate/learn phase gates (incident owner deferred).
