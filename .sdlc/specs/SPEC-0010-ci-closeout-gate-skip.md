---
id: SPEC-0010
intent: INT-0011
status: in_progress
surface: operator
complexity: trivial
created_at: 2026-05-30T00:05:00Z
tracker:
  provider: ""
  issues: []
  url: ""
provenance:
  agent_id: planner
  model: claude-sonnet-4-6
  prompt_hash: ""
  trace_id: ""
  inputs_digest: ""
---

# Spec — Skip verify/review gates on SDLC closeout PRs

## Summary

Add `scripts/is-sdlc-closeout.mjs` and teach `ci/verify-gate` and
`ci/review-gate` to pass when a PR only updates spec `status:` to `done` (and
optional `operational-context.md`). Implementation PRs still require Plane verify
and PR review markers at HEAD.

## Behavior

- Given a PR whose diff is only spec status `done` (+ optional ops-context),
  When CI runs verify-gate/review-gate, Then jobs exit 0 with closeout skip message.
- Given an implementation PR, When verify-gate runs, Then head_sha must match
  Plane verify payload (unchanged).

## Acceptance criteria

| ID   | Criterion | Verifier |
|------|-----------|----------|
| AC-1 | `is-sdlc-closeout.mjs` detects SPEC status-only diffs. | node script on fixture SHAs |
| AC-2 | `ci.yml` verify-gate skips Plane check on closeout. | inspection `.github/workflows/ci.yml` |
| AC-3 | `ci.yml` review-gate skips PR review check on closeout. | inspection `.github/workflows/ci.yml` |
| AC-4 | lint, typecheck, build pass. | npm run lint; typecheck; build |

## Technical notes

- Jobs use `fetch-depth: 0` for accurate `git diff base...head`.
- Prefer marking spec `done` on the implementation branch before merge when possible.
