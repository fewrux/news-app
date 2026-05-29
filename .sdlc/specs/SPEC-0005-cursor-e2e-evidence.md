---
id: SPEC-0005
intent: INT-0006
status: done
surface: operator
complexity: complex
created_at: 2026-05-29T12:00:00Z
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

# Spec — Cursor-local e2e evidence, single-lane PRs, no CI e2e

## Summary

Move browser verification to the Cursor `/verify` phase for **product-surface**
specs: run Playwright locally, post video + summary as a **Plane issue comment**
before opening a draft PR. Remove `.github/workflows/e2e-evidence.yml` and
`ci/e2e` from branch protection. Introduce **product vs operator lanes** with a
mechanical `classify-diff` script; cross-lane PRs are blockers. Operator-surface
specs (this spec) waive browser evidence.

## Behavior

### Lanes

- **Product lane:** `app/**`, `lib/**`, `components/**`, `public/**`,
  `next.config.*` when runtime behavior changes.
- **Operator lane:** `.sdlc/**`, `.cursor/**`, `docs/**`, `.github/**`,
  `scripts/**`, `playwright.config.ts`, root meta files.
- A spec declares `surface: product | operator` in frontmatter; affected paths
  MUST stay within one lane.
- A PR MUST NOT touch both lanes (`gate.no_cross_lane_diff`).

### Verify flow

- **Product surface:** `/verify` runs Playwright, writes
  `.sdlc/reports/<run_id>/report.json`, then
  `node scripts/plane-sync.mjs post-evidence <spec> <run_id>`. Draft PR opens
  only after evidence is on Plane.
- **Operator surface:** `/verify` runs lint/typecheck/build; report records
  `browser_evidence.status: waived` with reason. No Plane video comment.

### CI

- Delete `e2e-evidence.yml`.
- `require_status_checks` becomes `[ci/lint, ci/typecheck, ci/build, ci/review-gate]`.
- `ci/review-gate` asserts reviewer artifact includes `browser_evidence.status`.

## Acceptance criteria

| ID   | Criterion | Verifier |
|------|-----------|----------|
| AC-1 | `scripts/classify-diff.mjs` classifies paths into `product`, `operator`, or `cross_lane`. | `node scripts/classify-diff.mjs --self-test` |
| AC-2 | `plane-sync.mjs post-evidence` posts an HTML comment (and video attachment when present) to the spec's linked Plane issue. | `node scripts/plane-sync.mjs` help lists `post-evidence` |
| AC-3 | `sdlc.yaml` removes `ci/e2e`, `e2e_evidence` workflow, and CI runner from `browser_evidence`. | grep / manual inspection |
| AC-4 | `/verify` command documents product vs operator paths and Plane posting. | `.cursor/commands/verify.md` |
| AC-5 | Branch discipline forbids cross-lane PRs and requires verify-before-PR for product surface. | `.cursor/rules/branch-discipline.mdc` |
| AC-6 | Doctor `process.recent-pr-shape` no longer requires e2e keywords on operator-only PRs. | `scripts/sdlc-doctor.mjs` |
| AC-7 | `e2e-evidence.yml` is deleted. | file absent |

## Risks

- Plane comment/attachment API quirks (Cloudflare on writes) — reuse curl-write path.
- Local verify depends on Playwright browsers installed — document in browser-evidence skill.
- GitHub branch protection must drop `ci/e2e` manually on the repo (document in ADR).

## Out of scope

- Product-surface feature work (no `app/` changes in this PR).
- GitHub branch protection UI change (maintainer action noted in ADR).
