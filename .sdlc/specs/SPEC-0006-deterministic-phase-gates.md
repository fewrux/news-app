---
id: SPEC-0006
intent: INT-0007
status: done
surface: operator
complexity: complex
created_at: 2026-05-29T20:05:00Z
tracker:
  provider: plane
  issues: [aff2f3b6-0aa9-4d3d-8ad6-a9e5687df695]
  url: "https://api.plane.so/integritas/projects/c3ef1967-15a0-4177-bfb3-64605e06a779/issues/aff2f3b6-0aa9-4d3d-8ad6-a9e5687df695"
provenance:
  agent_id: planner
  model: claude-sonnet-4-6
  prompt_hash: ""
  trace_id: ""
  inputs_digest: ""
---

# Spec — Deterministic phase-exit gates (ADR-0007)

## Summary

Ship `scripts/check-phase-exit.mjs` and per-phase validators under
`scripts/gates/`. Canonical artifacts: git for intent/spec/ADR; Plane comment
for verify; PR comment for review; GitHub Release for release. Hard gates only —
no `tolerate_missing`. Supersedes ADR-0001 review artifact location in part.

Affected paths: `.sdlc/`, `.cursor/`, `.github/workflows/ci.yml`, `scripts/`,
`package.json`.

## Behavior

- Each slash command ends with `node scripts/check-phase-exit.mjs --phase …` exit 0.
- `plane-sync post-evidence` embeds `sdlc:verify:v1` JSON in Plane comments.
- `post-review.mjs` posts `sdlc:review:v1` on PR; `ci/review-gate` parses it.
- `post-release.mjs` creates GitHub Release with `sdlc:release:v1`.
- PR body must include `SPEC-NNNN` for `ci/verify-gate`.

## Acceptance criteria

| ID   | Criterion | Verifier |
|------|-----------|----------|
| AC-1 | `scripts/check-phase-exit.mjs` dispatches all main-flow phases. | `node scripts/check-phase-exit.mjs --phase implement` |
| AC-2 | Specify gate validates SPEC template + AC verifiers on disk. | `node scripts/check-phase-exit.mjs --phase specify --artifact .sdlc/specs/SPEC-0006-deterministic-phase-gates.md` |
| AC-3 | `plane-sync post-evidence --payload` embeds verify marker in Plane comment. | `node scripts/plane-sync.mjs` help lists `--payload` |
| AC-4 | `ci/verify-gate` and `ci/review-gate` use check-phase-exit in CI. | `.github/workflows/ci.yml` |
| AC-5 | `sdlc.yaml` gates declare shell runners; no tolerate_missing on verify/tracker. | grep manual inspection |
| AC-6 | Slash commands verify/review/release reference external artifacts only. | inspection .cursor/commands/verify.md |
| AC-7 | ADR-0007 documents gate map and supersedes ADR-0001 review location. | `.sdlc/decisions/0007-deterministic-phase-gates.md` |
| AC-8 | lint, typecheck, build pass. | `npm run lint`, `npm run typecheck`, `npm run build` |

## Risks

- Plane/GitHub API required locally and in CI — intentional (dura lex).
- Existing PRs without Plane verify comments will fail verify-gate until updated.

## Out of scope

- Migrating historical `.sdlc/reviews/*.md` to PR comments.
- Doctor mechanical checks for new gate scripts (follow-up chore).
