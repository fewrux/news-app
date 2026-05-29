---
id: ADR-0007
title: Deterministic phase-exit gates with external artifact stores (Plane, PR comments, GitHub Releases)
status: accepted
date: 2026-05-29
spec: null
supersedes_in_part: ADR-0001
provenance:
  agent_id: architect
  model: claude-sonnet-4-6
  prompt_hash: ""
  trace_id: ""
  inputs_digest: ""
  created_at: 2026-05-29T18:00:00Z
---

# Context

Phase gates in `sdlc.yaml` were largely agent-self-certified. Only `lint`,
`typecheck`, `build`, and a partial `review_approved` (committed
`.sdlc/reviews/PR-N.md`) were mechanically enforced at merge. Verify evidence
lived under `.sdlc/reports/` as a staging copy while Plane held the human-readable
comment.

Maintainer approved: every main-flow phase exit must pass a **hard** deterministic
gate before the next phase starts; no local-dev waivers (`dura lex, sed lex`).
Lifecycle artifacts for verify, review, and release move to their native systems:

- **Verify** → Plane issue comment (`sdlc:verify:v1` JSON marker)
- **Review** → GitHub PR comment (`sdlc:review:v1` JSON marker)
- **Release** → GitHub Release body (`sdlc:release:v1` JSON marker)

Intent, spec, and ADR remain in git (inputs to implementation).

# Decision

1. **`scripts/check-phase-exit.mjs`** is the single phase-exit runner invoked by
   slash commands and CI. Validators live under `scripts/gates/`.
2. **Supersede ADR-0001 artifact location** for reviews: `ci/review-gate` reads
   PR comments via `gh api`, not `.sdlc/reviews/PR-N.md`. The ADR-0001 principle
   (platform reads structured agent output) is unchanged.
3. **`ci/verify-gate`** joins required checks; PR body must include `SPEC-NNNN`.
   Gate reads Plane verify marker; `PLANE_*` secrets required in CI and locally.
4. **No `tolerate_missing`** on tracker or verify gates.
5. **`.sdlc/reports/` and `.sdlc/reviews/`** are deprecated as canonical stores;
   agents may use temp files for upload payloads only.

# Consequences

## Positive

- Autonomous retry loops: agents re-run a phase until `check-phase-exit` exits 0.
- Harness-agnostic gates: same markers whether posted from Cursor or CI.
- Native UX: reviews visible on PR, verify on Plane issue, releases on GitHub.

## Negative

- Offline work requires Plane + GitHub credentials — intentional per hard-gate policy.
- Parser/schema co-evolution tax when marker formats change.
- Historical `.sdlc/reviews/*.md` files remain in git as archive only.

# Gate map (main flow)

| Phase | Gate command | Canonical artifact |
|-------|--------------|-------------------|
| ideate | `check-phase-exit --phase ideate --artifact` | `.sdlc/intents/` |
| specify | `check-phase-exit --phase specify --artifact` | `.sdlc/specs/` |
| design | `check-phase-exit --phase design --artifact` | `.sdlc/decisions/` |
| implement | `check-phase-exit --phase implement` | CI lint/typecheck/build |
| verify | `check-phase-exit --phase verify --spec` | Plane comment |
| review | `check-phase-exit --phase review --pr` | PR comment |
| release | `check-phase-exit --phase release --tag` | GitHub Release |
