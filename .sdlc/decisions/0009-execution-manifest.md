---
id: ADR-0009
title: Execution manifest (sdlc.execution.v1) and trustless verify gate
status: accepted
date: 2026-06-01
spec: SPEC-0015
provenance:
  agent_id: architect
  model: claude-sonnet-4-6
  prompt_hash: ""
  trace_id: ""
  inputs_digest: ""
---

# Context

Gates currently accept Plane comment content at face value. A tester agent can
write a Plane comment with `browser_evidence.video_attached: true` without any
local Playwright run having occurred. There is no durable record that phases
were executed in sequence via the correct harnesses. `run-verify-phase.mjs`
exists as the intended product-verify harness, but the gate does not require it.
`post-evidence` does not compute content hashes, so claims cannot be checked
against filesystem reality.

Constraints: keep `sdlc.verify.v1`; no CI e2e; no committed run artifacts;
free tier only; doctor scope stays operator-only.

# Options

## Option A — Trust Plane comment only (status quo)
- Pros: No new scripts; simpler mental model.
- Cons: Forged or replayed comment satisfies the gate; no audit trail;
  impossible to verify claims against real artifacts.

## Option B — Execution manifest in `.sdlc/runs/` (CHOSEN)
- Pros: Machine-written, tamper-evident (atomic write); phase stamps give
  full timeline; verify gate cross-checks claims against disk; harness_id
  enforces `run-verify-phase.mjs` as the only legal product-verify path.
  Manifests are gitignored — no storage churn.
- Cons: Local-only audit; not replicated to Plane/GitHub (acceptable per
  policy: Plane comment is the system of record for remote visibility).

## Option C — Committed run manifests in `.sdlc/runs/`
- Pros: Permanent git record.
- Cons: Pollutes commit history with ephemeral machine data; rejected per
  SDLC policy (reports and run artifacts are gitignored).

# Decision

**Option B.** Introduce `scripts/execution-manifest.mjs` that reads, writes,
validates, and stamps phases of an `sdlc.execution.v1` manifest stored in
`.sdlc/runs/{execution_id}.json` (gitignored). Key design points:

1. **Gate binding to filesystem artifacts** — `validateVerify` checks
   `manifest.phases.verify.claims.report_dir` exists on disk and
   `claims.video_count >= 1` (product) or waived (operator). No disk =
   gate fails even if Plane comment looks valid.

2. **post-evidence computes claims** — `plane-sync.mjs post-evidence` SHA-256
   hashes `report.json` and each video file; writes `claims` into the manifest.
   The Plane comment payload includes `claims_hash` derived from the same data.

3. **Product only: Plane attachment verification** — gate reads the Plane
   attachment list for the issue; verifies that `manifest.phases.verify.claims.plane_attachment_id`
   is present. Soft-fails with warning when PLANE_* env unset (per ADR-0002
   waiver pattern) — operator runs without Plane are not blocked.

4. **run-verify-phase.mjs only legal product path** — gate fails if
   `manifest.phases.verify.harness_id !== "run-verify-phase.mjs"` for product.
   Operator surface: harness check skipped.

5. **check-phase-exit.mjs stamps manifest** on each phase pass when
   `SDLC_MANIFEST` env points to a manifest file or `--execution-id` is
   provided. Silent no-op when neither is set (backward compatible).

# Consequences

- Supersedes the implicit "trust Plane" assumption in `validateVerify`.
- `run-verify-phase.mjs` must always create/update the manifest before calling
  `post-evidence` and `check-phase-exit.mjs --phase verify`.
- `.sdlc/runs/` added to `.gitignore`; no migration needed for existing runs.
- All changes are operator-surface only: no product app code modified.
- ADR-0008's trustless verify intent is now mechanically enforced.
