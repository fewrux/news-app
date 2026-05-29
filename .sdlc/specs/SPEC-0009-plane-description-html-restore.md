---
id: SPEC-0009
intent: INT-0010
status: done
surface: operator
complexity: trivial
created_at: 2026-05-29T23:05:00Z
tracker:
  provider: plane
  issues: [6563fdd1-7e45-4eb4-9856-7673be6f0b71]
  url: "https://api.plane.so/integritas/projects/c3ef1967-15a0-4177-bfb3-64605e06a779/issues/6563fdd1-7e45-4eb4-9856-7673be6f0b71"
provenance:
  agent_id: planner
  model: claude-sonnet-4-6
  prompt_hash: ""
  trace_id: ""
  inputs_digest: ""
---

# Spec — Restore HTML conversion for Plane work item descriptions

## Summary

Revert the SPEC-0008 markdown-first path. Plane `description_html` requires
HTML from `mdToHtml()` (with `joinListContinuations()` for soft-wrapped bullets).
Backfill linked spec issues via `sync-spec`.

## Behavior

- Given a spec file, When `create-from-spec` or `sync-spec` runs, Then Plane
  receives HTML from `buildSpecDescriptionHtml()` (not raw markdown).
- Given soft-wrapped Given/When/Then bullets, When converted, Then each bullet
  is a single `<li>` with no intervening `<p>` tags.

## Acceptance criteria

| ID   | Criterion | Verifier |
|------|-----------|----------|
| AC-1 | Spec sync uses `mdToHtml(buildSpecDescriptionMarkdown(...))`. | inspection scripts/plane-sync.mjs |
| AC-2 | `joinListContinuations` runs before HTML parse in `mdToHtml`. | inspection scripts/plane-sync.mjs |
| AC-3 | SPEC-0007 Plane issue backfilled via `sync-spec` shows `<h2>` not `##`. | curl GET issue after sync |
| AC-4 | lint, typecheck, build pass. | npm run lint; npm run typecheck; npm run build |

## Technical notes

- `createIssue` sends `description_html` (HTML string).
- `sync-docs` unchanged — already uses `mdToHtml()`.
