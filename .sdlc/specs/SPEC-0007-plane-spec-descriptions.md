---
id: SPEC-0007
intent: INT-0008
status: done
surface: operator
complexity: normal
created_at: 2026-05-29T21:05:00Z
tracker:
  provider: plane
  issues: [3f2bbaf9-e6a2-4447-ab95-3eef8af445d9]
  url: "https://api.plane.so/integritas/projects/c3ef1967-15a0-4177-bfb3-64605e06a779/issues/3f2bbaf9-e6a2-4447-ab95-3eef8af445d9"
provenance:
  agent_id: planner
  model: claude-sonnet-4-6
  prompt_hash: ""
  trace_id: ""
  inputs_digest: ""
---

# Spec — Plane spec descriptions and PR→spec comments

## Summary

Fix `create-from-spec` to populate Plane `description_html` with four sections
(Summary, Behavior, Acceptance criteria, Technical notes). Change
`github-event` on `pull_request` to post an idempotent comment on the linked
spec issue instead of creating `[PR #N]` work items. Add `sync-spec` to refresh
descriptions on existing issues.

## Behavior

- Given a spec file, When `create-from-spec` runs, Then the Plane issue
  `description_html` contains Summary, Behavior, Acceptance criteria, and
  Technical notes rendered from the spec markdown.
- Given a PR whose body includes `SPEC-NNNN`, When `plane-sync.yml` fires,
  Then a comment is posted on that spec's `tracker.issues[0]` with
  `sdlc:pr:v1` marker (no new Plane issue).
- Given the same PR event action already has a comment with matching marker,
  When the workflow re-runs, Then it skips duplicate comments.

## Acceptance criteria

| ID   | Criterion | Verifier |
|------|-----------|----------|
| AC-1 | `create-from-spec` sends `description_html` built from four sections. | inspection scripts/plane-sync.mjs |
| AC-2 | `github-event` on pull_request posts to spec issue, not createIssue for PR. | inspection scripts/plane-sync.mjs |
| AC-3 | `sync-spec <spec-path>` PATCHes description on linked issue. | node scripts/plane-sync.mjs sync-spec --help or handler exists |
| AC-4 | Workflow checks out PR head for spec file lookup. | `.github/workflows/plane-sync.yml` |
| AC-5 | Spec template includes `## Technical notes`. | `.sdlc/specs/_template.md` |
| AC-6 | lint, typecheck, build pass. | npm run lint; npm run typecheck; npm run build |

## Technical notes

- Reuse existing `mdToHtml()` for Plane HTML (same as docs sync).
- Technical notes section: explicit `## Technical notes` in spec, or fallback
  from frontmatter (surface, complexity, intent) plus Risks / Out of scope.
- PR marker schema: `sdlc.pr.v1` with `pr_id`, `action`, `url`, `head_sha`.
