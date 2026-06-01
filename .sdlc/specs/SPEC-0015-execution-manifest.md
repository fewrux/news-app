---
id: SPEC-0015
intent: INT-0014
status: todo
surface: operator
complexity: complex
created_at: 2026-06-01T17:31:00Z
tracker:
  provider: plane
  issues: [4bc2cf2c-c063-4807-9571-d5ecc6b5b274]
  url: "https://api.plane.so/integritas/projects/c3ef1967-15a0-4177-bfb3-64605e06a779/issues/4bc2cf2c-c063-4807-9571-d5ecc6b5b274"
provenance:
  agent_id: planner
  model: claude-sonnet-4-6
  prompt_hash: ""
  trace_id: ""
  inputs_digest: ""
---

# Spec — Execution manifest (sdlc.execution.v1) and trustless verify

## Summary

Introduce a machine-written execution manifest (`schema: sdlc.execution.v1`)
stored under `.sdlc/runs/` (gitignored) that records every phase gate outcome
for a spec run. Wire `check-phase-exit.mjs` to stamp the manifest on each
phase pass. Make `run-verify-phase.mjs` the only legal path for product-surface
verify by requiring a `harness_id` in the manifest's verify section.
Harden the verify gate so it cross-checks claims (file hashes, video count,
test count, Plane attachment) against real filesystem and API state — not just
Plane comment content. Keep `sdlc.verify.v1` schema; manifests are
gitignored local audit records, never committed.

Affected paths (< 10): `scripts/`, `.sdlc/`, `.cursor/`, `docs/`.

## Behavior

- Given any phase gate passes via `check-phase-exit.mjs`, when `--manifest`
  or auto-manifest mode is active, then the relevant phase section in
  `.sdlc/runs/{execution_id}.json` is stamped with gate outcome and timestamp.
- Given a product-surface spec, when `run-verify-phase.mjs` runs, then it
  creates/updates the manifest verify section with `harness_id: run-verify-phase.mjs`,
  `run_id`, `report_dir`, and content claims (test_count, video_count, hashes).
- Given a product verify gate, when `validateVerify` runs without a manifest
  or without `phases.verify.harness_id`, then the gate fails with a clear error.
- Given a product verify gate, when manifest claims exist, then the gate
  checks `claims.video_count >= 1` and `claims.report_dir` exists on disk.
- Given `post-evidence` runs for product surface, when it computes claims,
  then it hashes the report.json and each video file and stores them in the
  manifest and Plane comment payload.
- Given product surface, when Plane attachment upload succeeds, then the gate
  verifies `plane_attachment_id` is present in manifest claims.
- Given operator surface, when verify runs, then manifest is stamped with
  waiver reason; no video/harness check required.

## Acceptance criteria

| ID   | Criterion | Verifier |
|------|-----------|----------|
| AC-1 | `scripts/execution-manifest.mjs` exists with read/write/validate/stamp-phase API. | grep `stampPhase` scripts/execution-manifest.mjs |
| AC-2 | `check-phase-exit.mjs` stamps manifest on each phase pass when manifest file exists or `--execution-id` provided. | grep `stampManifest` scripts/check-phase-exit.mjs |
| AC-3 | `run-verify-phase.mjs` sets `harness_id: run-verify-phase.mjs` in manifest verify section. | grep `harness_id` scripts/run-verify-phase.mjs |
| AC-4 | `validateVerify` fails for product surface if manifest missing or `phases.verify.harness_id` absent. | .sdlc/evals/cases/verify-without-manifest.json |
| AC-5 | `validateVerify` checks `claims.video_count >= 1` and `claims.report_dir` on disk for product. | grep `video_count` scripts/gates/validate-verify.mjs |
| AC-6 | `post-evidence` computes SHA-256 hashes for report.json and videos; stores in manifest. | grep `claims` scripts/plane-sync.mjs |
| AC-7 | `.gitignore` includes `/.sdlc/runs/`. | grep `sdlc/runs` .gitignore |
| AC-8 | `sdlc.yaml` documents execution manifest policy under integrations or policies. | grep `execution_manifest` .sdlc/sdlc.yaml |
| AC-9 | `docs/testing.md` describes execution manifest and trustless verify. | grep `execution manifest` docs/testing.md |
| AC-10 | lint, typecheck, build pass. | npm run lint |

## Risks

- Manifest file corruption on interrupted runs — mitigated by atomic write
  (write temp then rename) in `execution-manifest.mjs`.
- Windows path differences in file hashing — use `resolve()` consistently.
- Plane attachment verification requires live PLANE_* env — gate soft-fails
  with warning when env missing (operator pattern from ADR-0002 waiver).

## Technical notes

- ADR-0009 records the manifest schema and trustless verify design decisions.
- Manifest location: `.sdlc/runs/{execution_id}.json`; `execution_id` derived
  from spec_id + head_sha + ISO timestamp.
- Schema: `sdlc.execution.v1` with top-level `execution_id`, `spec_id`,
  `head_sha`, `phases` map.
- `check-phase-exit.mjs` reads manifest path from `SDLC_MANIFEST` env or
  `--execution-id` arg; stamps on pass; skips silently if neither set.
- `run-verify-phase.mjs` always creates manifest; passes path via env or
  manifest flag to subsequent scripts.
- Keep `.sdlc/reports/` pattern unchanged; manifest is a separate layer.

## Out of scope

- Product app code changes.
- CI e2e re-runs.
- Schema v2 markers.
- Doctor product/video audits.
- Multi-machine or distributed manifest synchronization.
