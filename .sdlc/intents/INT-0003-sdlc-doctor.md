---
id: INT-0003
slug: sdlc-doctor
kind: chore
status: accepted
created_at: 2026-05-28T16:30:00Z
provenance:
  agent_id: planner
  model: claude-opus-4-7-thinking-xhigh
  prompt_hash: 530a7bf5f6907e8f
  trace_id: ""
  inputs_digest: ""
plane_issue: ""
---

# Intent — SDLC drift detection (the "doctor")

## Problem

The SDLC contract (`.sdlc/sdlc.yaml`) and its operator surface (`.cursor/`)
have many invariants but nothing watches them as a system. Drift accumulates
silently across categories:

- **Structural drift.** `sdlc.yaml.roles.agents` lists `reviewer` but
  `.cursor/agents/reviewer.md` no longer exists; `sdlc.yaml.instructions.hooks.registry`
  declares `.sh` scripts while `.cursor/hooks.json` runs `.mjs` ones;
  workflow files named in `branch_strategy.protection.require_status_checks`
  drift from the files actually present in `.github/workflows/`.
- **Artifact drift.** A new `.sdlc/intents/INT-NNNN.md` ships without the
  full `common_provenance` block, or with a fabricated `trace_id`.
- **Memory drift.** `operational-context.md` retains items older than its
  cap; `project.md` and `architecture.md` contradict each other after a
  refactor; `glossary.md` terms appear in older spelling.
- **Process drift.** A PR lands without a Plane link, without an e2e video
  reference, or with the reviewer agent run sharing identity with the
  implementer run.
- **Configuration drift.** Live GitHub branch protection diverges from the
  DSL's declared protection block.
- **Cost drift.** A new dependency or service appears without an entry in
  `policies.cost.free_quotas`.

These failures are mechanical: every one is detectable from filesystem
state plus, for the live-config checks, a few `gh api` calls. What's
missing is something to **detect** the drift and surface it where it
becomes actionable — locally before a PR opens, and in CI before a PR
merges. The contract already declares all the invariants; we just have
no observer.

## Users

- **The maintainer (felip)** — wants to glance at one report and know
  the SDLC is healthy, or know precisely what is rotten and what to fix.
- **Every implementer / reviewer / planner agent** — should be reminded
  at session start when the SDLC has open findings, the same way they
  are reminded about open incidents today.
- **CI** — needs a deterministic, fast check that can block merges on
  hard SDLC drift (advisory at first, required after stabilization per
  ADR-0003 § "Cadence").
- **Future contributors** — should land in a repo that doesn't have to
  be re-derived from prose. The doctor's findings make the contract's
  rough edges visible the moment they appear.

## Success metric

Operational. The doctor produces a structured report and the report is
acted on:

1. The `scripts/sdlc-doctor.mjs` mechanical layer runs in < 30 seconds
   on a clean tree and produces a categorised report (severity:
   `fail | warn | info`) covering structural, artifact, memory hygiene,
   process compliance, and cost compliance categories.
2. The doctor agent (`/doctor`) runs end-to-end (mechanical + semantic
   layers), writes `.sdlc/reviews/doctor-<YYYY-MM-DD>.md` with
   provenance, and proposes follow-up specs for each `fail` finding —
   without editing any other file (read-only contract, with the single
   exception of `.sdlc/baseline.yaml` via `--refresh-baseline`).
3. `ci/doctor` runs on every PR. After two weeks of clean runs, it
   moves from advisory to a required check on `main` via an explicit
   ADR superseding the relevant section of ADR-0003.
4. The first run of the doctor against this repo's current state
   surfaces the known pre-existing drift items
   (e.g. `sdlc.yaml.instructions.hooks.registry` referencing `.sh`
   files; the pseudo-YAML arrows in `integrations.plane.mappings`)
   as discrete `fail` findings — proving the observer actually sees
   what humans already know is wrong.

## Non-goals

- Does **not** auto-fix drift. Findings flow into the normal
  `/intent` → `/spec` → `/implement` path so every correction is
  auditable. The single exception is `--refresh-baseline`, which is
  itself a PR.
- Does **not** add a new vendor. The doctor is filesystem + git +
  optional `gh api` only. No SaaS dependency, no LLM dependency for
  the mechanical layer.
- Does **not** replace the reviewer agent. The reviewer asserts a
  PR is good *as a change*; the doctor asserts the SDLC is good
  *as a system*. Different scopes, different cadences, different
  identities (per `sdlc.yaml.roles.agents`).
- Does **not** police the `app/` codebase. SDLC artifacts and the
  operator surface are in scope; product code is the implementer's
  and reviewer's job.
