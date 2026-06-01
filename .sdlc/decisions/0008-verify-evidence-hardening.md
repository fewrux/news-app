---
id: ADR-0008
title: Mandatory product video on first verify pass; markdown evidence; doctor scope
status: accepted
date: 2026-06-01
spec: SPEC-0014
provenance:
  agent_id: architect
  model: claude-sonnet-4-6
  prompt_hash: ""
  trace_id: ""
  inputs_digest: ""
---

# Context

ADR-0006 moved browser evidence to Cursor `/verify` on Plane but allowed
`video: on-first-retry`, so passing tests on first run produced no video.
`post-evidence --payload` could skip attachments. Gates checked
`browser_evidence.status` but not `video_attached`. Human summaries were sparse
HTML. Doctor must not audit product app health or fetch Plane for product PR
videos (operator-only SDLC health).

Constraints: keep `sdlc.verify.v1` / `review.v1` / `release.v1` markers; free
tier; no CI e2e.

# Options

## Option A — Retry-only video + optional upload (status quo)
- Pros: Smaller artifacts during dev.
- Cons: First-pass verify passes without video; weak audit trail.

## Option B — Mandatory first-pass video for product; hardened gates; markdown summaries (CHOSEN)
- Pros: Deterministic evidence; mechanical collect/post loop; readable artifacts.
- Cons: More disk during verify; dev uses separate config (`playwright.verify.config.ts`).

## Option C — Schema v2 payloads
- Pros: Cleaner separation of human vs machine fields.
- Cons: Breaks existing gate parsers; rejected.

# Decision

**Option B.** Product surface requires `.webm` on every verify run via
`playwright.verify.config.ts` / `SDLC_VERIFY=1`. `collect-verify-evidence.mjs`
stages videos under `.sdlc/reports/{run_id}/videos/`. `post-evidence` fails
product without video; `--payload` alone is deprecated for product. `validateVerify`
requires `browser_evidence.video_attached === true`. Operator surface waives
video. Policy lives in `sdlc.yaml`, `business-rules.md`, `docs/testing.md` only.
Doctor checks SDLC/operator health only — no product PR video audits.
Human-readable Markdown (or HTML tables) precedes marker JSON in Plane, PR, and
Release bodies. `plane-sync` loads `PLANE_*` from `.env` then `.env.local`.

# Consequences

- Supersedes ADR-0006 video `on-first-retry` policy for verify phase only; dev
  `playwright.config.ts` keeps retry-only unless `SDLC_VERIFY=1`.
- New scripts: `load-env.mjs`, `collect-verify-evidence.mjs`, optional
  `run-verify-phase.mjs`.
- Maintainers run product verify with `npm run test:e2e:verify`.
