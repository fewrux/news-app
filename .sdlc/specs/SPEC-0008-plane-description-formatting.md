---
id: SPEC-0008
intent: INT-0009
status: in_progress
surface: operator
complexity: trivial
created_at: 2026-05-29T22:05:00Z
tracker:
  provider: plane
  issues: [8e655977-d950-4241-a3a6-820d1bb5d866]
  url: "https://api.plane.so/integritas/projects/c3ef1967-15a0-4177-bfb3-64605e06a779/issues/8e655977-d950-4241-a3a6-820d1bb5d866"
provenance:
  agent_id: planner
  model: claude-sonnet-4-6
  prompt_hash: ""
  trace_id: ""
  inputs_digest: ""
---

# Spec — Send markdown to Plane work items (no HTML conversion)

## Summary

Stop converting spec markdown to HTML before posting to Plane. Send the four-section
markdown body directly via `description_html`; Plane's editor ingests markdown
natively. Keep `mdToHtml()` only for `sync-docs` (Plane pages).

## Behavior

- Given a spec file, When `create-from-spec` or `sync-spec` runs, Then Plane
  receives raw markdown (Summary, Behavior, Acceptance criteria, Technical notes)
  without an HTML conversion step.
- Given soft-wrapped Given/When/Then bullets in spec markdown, When synced to
  Plane, Then list items render as single bullets (not split by stray asterisks).

## Acceptance criteria

| ID   | Criterion | Verifier |
|------|-----------|----------|
| AC-1 | `create-from-spec` / `sync-spec` post markdown, not `mdToHtml()` output. | inspection scripts/plane-sync.mjs |
| AC-2 | `createIssue` accepts `description` (markdown) param. | inspection scripts/plane-sync.mjs |
| AC-3 | `sync-docs` still uses `mdToHtml()` for Plane pages. | inspection scripts/plane-sync.mjs |
| AC-4 | lint, typecheck, build pass. | npm run lint; npm run typecheck; npm run build |

## Technical notes

- Plane REST API field is still named `description_html`; content is markdown.
- `buildSpecDescriptionMarkdown()` builds the four-section body unchanged.
- Backfill linked specs via `sync-spec` after merge.
