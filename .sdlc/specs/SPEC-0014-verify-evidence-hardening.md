---
id: SPEC-0014
intent: INT-0013
status: in_progress
surface: operator
complexity: complex
created_at: 2026-06-01T12:05:00Z
tracker:
  provider: plane
  issues: [1e36d0bf-5aa9-4799-b0e4-11de620ed8c3]
  url: "https://api.plane.so/integritas/projects/c3ef1967-15a0-4177-bfb3-64605e06a779/issues/1e36d0bf-5aa9-4799-b0e4-11de620ed8c3"
provenance:
  agent_id: planner
  model: claude-sonnet-4-6
  prompt_hash: ""
  trace_id: ""
  inputs_digest: ""
---

# Spec — Verify evidence hardening (product video mandatory)

## Summary

Harden product-lane verify evidence: record Playwright video on every verify run
(not retry-only), collect videos mechanically, fail `post-evidence` and
`validateVerify` when product surface lacks video, and emit human-readable
Markdown summaries with existing `sdlc.*.v1` markers. Document policy in
operator paths only. ADR-0008 supersedes ADR-0006 video capture rules in part.
Doctor remains SDLC/operator health only.

Affected paths (< 10): `scripts/`, `playwright.config.ts`, `playwright.verify.config.ts`,
`.sdlc/`, `.cursor/`, `docs/`, `AGENTS.md`, `package.json`.

## Behavior

- Given a product-surface spec, when `/verify` runs Playwright, then video is
  recorded on the first pass via `playwright.verify.config.ts` or `SDLC_VERIFY=1`.
- Given test-results contain `.webm` files, when `collect-verify-evidence` runs,
  then videos copy to `.sdlc/reports/{run_id}/videos/`; product surface fails if
  zero videos.
- Given product surface, when `post-evidence` runs without a report-dir video,
  then the command exits non-zero (bare `--payload` deprecated for product).
- Given product verify on Plane, when `validateVerify` runs, then
  `browser_evidence.video_attached === true` and attachment id is present.
- Given operator surface, when verify runs, then browser evidence is waived with
  reason; no video required.
- Given doctor mechanical mode, when audits run, then only works only — no product
  PR video fetches.

## Acceptance criteria

| ID   | Criterion | Verifier |
|------|-----------|----------|
| AC-1 | `validateVerify` requires `video_attached` for product surface. | grep `video_attached` in `scripts/gates/validate-verify.mjs` |
| AC-2 | `collect-verify-evidence.mjs` exists and fails product with zero videos. | `scripts/collect-verify-evidence.mjs` |
| AC-3 | `post-evidence` rejects product `--payload` without video dir. | `scripts/plane-sync.mjs` |
| AC-4 | Verify Playwright config records video on first pass. | `playwright.verify.config.ts` |
| AC-5 | `sdlc.yaml` documents mandatory product video policy. | grep `always_on_verify` in `.sdlc/sdlc.yaml` |
| AC-6 | ADR-0008 documents mandatory video + doctor scope. | `.sdlc/decisions/0008-verify-evidence-hardening.md` |
| AC-7 | `plane-sync` loads PLANE_* from `.env`. | `scripts/load-env.mjs` |
| AC-8 | lint, typecheck, build pass. | `npm run lint`, `npm run typecheck`, `npm run build` |

## Risks

- Plane attachment upload may fail on free tier — gate requires attachment id or
  explicit upload attempt logged in payload.
- Larger local video storage during verify runs — mitigated by not committing
  `.sdlc/reports/`.

## Technical notes

- ADR-0008 references ADR-0006 and ADR-0007.
- Optional: `scripts/run-verify-phase.mjs` mechanical loop.
- Update `.cursor/commands/verify.md`, `browser-evidence` skill, `review.md`,
  `release.md`, `docs/testing.md`, `docs/integrations.md`, `business-rules.md`.

## Out of scope

- Product app code changes.
- CI e2e re-enable.
- Schema v2 markers.
