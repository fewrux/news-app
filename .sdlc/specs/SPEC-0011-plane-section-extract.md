---
id: SPEC-0011
intent: INT-0010
status: in_progress
surface: operator
complexity: trivial
created_at: 2026-05-30T01:00:00Z
tracker:
  provider: plane
  issues: [bb58108a-8757-4eb9-b59a-9ff16c0a245c]
  url: "https://api.plane.so/integritas/projects/c3ef1967-15a0-4177-bfb3-64605e06a779/issues/bb58108a-8757-4eb9-b59a-9ff16c0a245c"
provenance:
  agent_id: planner
  model: claude-sonnet-4-6
  prompt_hash: ""
  trace_id: ""
  inputs_digest: ""
---

# Spec — Fix Plane description section extraction

## Summary

Fix `extractSpecSection` (invalid `\Z` in JS) and list HTML splitting so Plane
work items render clean bullets and correct Technical notes content.

## Behavior

- Given a spec with `## Technical notes` as the last section, When synced, Then
  Plane shows the spec's technical notes (not frontmatter fallback).
- Given multiple bullets, When converted to HTML, Then one `<ul>` with all `<li>` items.

## Acceptance criteria

| ID   | Criterion | Verifier |
|------|-----------|----------|
| AC-1 | `extractSpecSection` uses index-based parsing (no `\Z`). | inspection scripts/plane-sync.mjs |
| AC-2 | SPEC-0009 sync produces one `<ul>` per list section. | curl GET issue after sync-spec |
| AC-3 | lint, typecheck, build pass. | npm run lint; typecheck; build |

## Technical notes

- `\Z` is not end-of-string in JavaScript regex.
- Fallback metadata list items joined with `\n` not `\n\n`.
