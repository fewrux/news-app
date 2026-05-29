---
id: SPEC-0008
intent: INT-0009
status: in_progress
surface: operator
complexity: trivial
created_at: 2026-05-29T22:05:00Z
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

# Spec — Fix Plane description HTML for soft-wrapped list items

## Summary

Fix `mdToHtml()` so indented list continuation lines are merged before HTML
conversion. Prevents Plane from rendering broken bullets when spec markdown wraps
Given/When/Then lines across multiple lines.

## Behavior

- Given spec markdown with a bullet whose text wraps on indented continuation
  lines, When `buildSpecDescriptionHtml` runs, Then each bullet becomes a
  single `<li>` (no intervening `<p>` between list segments).
- Given SPEC-0007 linked in Plane, When `sync-spec` runs after the fix, Then
  the issue description renders without stray asterisk bullets.

## Acceptance criteria

| ID   | Criterion | Verifier |
|------|-----------|----------|
| AC-1 | `mdToHtml` joins indented list continuations before parsing. | inspection scripts/plane-sync.mjs |
| AC-2 | HTML for SPEC-0007 behavior section has one `<li>` per bullet, no split `<p>`. | node smoke script or curl GET issue after sync-spec |
| AC-3 | lint, typecheck, build pass. | npm run lint; npm run typecheck; npm run build |

## Technical notes

- Preprocess in `joinListContinuations()` called at top of `mdToHtml()`.
- Continuation: line matching `^\s{2,}\S` following a list item, not a new marker.
- Backfill linked specs via `sync-spec` after merge.
