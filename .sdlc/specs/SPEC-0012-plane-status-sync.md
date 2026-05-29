---
id: SPEC-0012
intent: INT-0011
status: done
surface: operator
complexity: trivial
created_at: 2026-05-30T02:00:00Z
tracker:
  provider: plane
  issues: [6986823b-94fe-4e5e-a617-4c662ac4bb44]
  url: "https://api.plane.so/integritas/projects/c3ef1967-15a0-4177-bfb3-64605e06a779/issues/6986823b-94fe-4e5e-a617-4c662ac4bb44"
provenance:
  agent_id: planner
  model: claude-sonnet-4-6
  prompt_hash: ""
  trace_id: ""
  inputs_digest: ""
---

# Spec — Plane work item status sync with spec frontmatter

## Summary

Keep Plane spec issue states aligned with spec frontmatter `status`. Extend
`sync-spec` to PATCH state; add `sync-all-specs`, release hook, and CI on main.

## Behavior

- Given a spec with `status: done` and a linked Plane issue, When `sync-spec`
  or `sync-all-specs` runs, Then the Plane issue moves to Done.
- Given `post-release.mjs` with `spec_ids`, When Plane env is set, Then each
  spec issue is set to done after the GitHub Release is created.
- Given a push to `main` changing `.sdlc/specs/`, When CI runs, Then
  `sync-all-specs` updates all linked issues.

## Acceptance criteria

| ID   | Criterion | Verifier |
|------|-----------|----------|
| AC-1 | `sync-spec` PATCHes description and state from frontmatter. | inspection scripts/plane-sync.mjs |
| AC-2 | `sync-all-specs` iterates linked specs. | node scripts/plane-sync.mjs sync-all-specs |
| AC-3 | `post-release.mjs` calls set-status-by-id done for spec_ids. | inspection scripts/post-release.mjs |
| AC-4 | `.github/workflows/plane-spec-sync.yml` on push main. | file exists |
| AC-5 | lint, typecheck, build pass. | npm run lint; typecheck; build |

## Technical notes

- `create-from-spec` uses frontmatter status for initial Plane state (draft → todo).
- `parseFrontmatter` normalizes CRLF so `status:` is read on Windows-checked-out specs.
- Legacy `[PR #N]` and `[TEST]` items are out of scope — manual archive in Plane UI.
