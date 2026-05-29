---
id: ADR-0006
title: Browser evidence in Cursor on Plane; remove CI e2e; single-lane PRs
status: accepted
date: 2026-05-29
spec: SPEC-0005
provenance:
  agent_id: architect
  model: claude-sonnet-4-6
  prompt_hash: ""
  trace_id: ""
  inputs_digest: ""
---

# Context

E2e ran in GitHub Actions (`e2e-evidence.yml`) with video stored as ephemeral
artifacts (7-day retention). The SDLC `/verify` phase was documented as
Cursor-local but merge gates depended on `ci/e2e`. Product and operator changes
could share a PR, forcing ambiguous evidence rules.

Constraints: free tier only; Plane is the tracker; reviewer gate reads
`.sdlc/reviews/PR-<N>.md` (ADR-0001).

# Options

## Option A — Keep CI e2e + add Plane mirror
- Pros: Defense in depth; CI catches agent skips.
- Cons: Duplicate runs; evidence still ephemeral in GHA; GHA minutes cost.

## Option B — Cursor verify + Plane comment; drop CI e2e; single-lane PRs (CHOSEN)
- Pros: Evidence durable on tracker ticket; verify-before-PR for product work;
  operator PRs stay lean; clear lane separation.
- Cons: No CI re-run if agent skips verify; relies on reviewer + doctor audit.

## Option C — Commit videos to git
- Pros: Versioned evidence.
- Cons: Bloated repo; wrong store for binary artifacts.

# Decision

**Option B.** Product-surface specs run Playwright in `/verify`, post evidence
via `plane-sync post-evidence`, then open the draft PR. Operator-surface specs
waive browser evidence explicitly. PRs MUST NOT cross product/operator lanes.
Delete `e2e-evidence.yml`; remove `ci/e2e` from `sdlc.yaml` protection list.

# Consequences

- **Maintainer action:** Remove `ci/e2e` from GitHub branch protection required
  checks (Settings → Branches → `main`).
- `scripts/plane-sync.mjs` gains `post-evidence` (adapter contract extended).
- `scripts/classify-diff.mjs` is the mechanical lane classifier.
- Reviewer artifact gains `browser_evidence` frontmatter block.
- Doctor `process.recent-pr-shape` becomes lane-aware.
