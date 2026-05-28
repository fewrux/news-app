---
id: ADR-0003
title: SDLC doctor — three-layer drift detector with a lean derived-first baseline, read-only autonomy, and advisory-then-required CI cadence
status: accepted
date: 2026-05-28
spec: SPEC-0002
provenance:
  agent_id: architect
  model: claude-opus-4-7-thinking-xhigh
  prompt_hash: 530a7bf5f6907e8f
  trace_id: ""
  inputs_digest: ""
  created_at: 2026-05-28T16:35:00Z
---

# Context

INT-0003 enumerates five categories of silent drift the SDLC currently
has no observer for: structural, artifact, memory hygiene, process
compliance, and cost compliance. The contract (`sdlc.yaml`) already
declares the invariants; what is missing is something that
*continuously checks* them and surfaces violations where they become
actionable.

Three sub-decisions are required to ship the doctor and have to be
locked in before code is written, because each one shapes a different
file (the script, the agent card, the CI workflow):

1. **What is the baseline checked against?** Either fully derived from
   `sdlc.yaml` (no separate baseline file) or partially captured in a
   committed `.sdlc/baseline.yaml`.
2. **How autonomous is the doctor agent?** Pure read-only (writes only a
   findings report) vs. allowed to open corrective PRs.
3. **How aggressive is the `ci/doctor` check?** Required from day one vs.
   advisory then promoted.

This ADR records all three. They are interlocking: a fully-derived
baseline + an aggressive CI gate would force every legitimate SDLC
surface change through a separate ADR before it can land; a fully
autonomous doctor + an aggressive CI gate would create a loop where the
doctor's own corrective PR can fail the CI gate it just satisfied.
Choosing the three together is the only honest way to reason about
the system.

# Forces

- `sdlc.yaml.policies.cost.tier == free_only`. Whatever the doctor
  does must run inside GitHub Actions' 2000-minute monthly budget
  (private repo) and add no LLM cost for the mechanical layer
  (semantic layer is on-demand or weekly).
- `sdlc.yaml.policies.autonomy.execute_end_to_end == true`. The doctor
  should not become a new pause point in every implementer's turn;
  whatever the autonomy boundary is, it must compose with the
  end-to-end rule, not break it.
- `sdlc.yaml.invariants[3] == "main is protected; changes land via
  approved PR only; no bypass for any actor."` The doctor cannot be an
  exception. Even its own baseline refresh must go through a PR.
- The project already has a known set of pre-existing drift items
  (sdlc.yaml hooks registry points to `.sh` files while
  hooks.json uses `.mjs`; the `integrations.plane.mappings` block
  uses pseudo-arrow notation that is not valid YAML — flagged in
  `operational-context.md`). The doctor must catch these on its first
  run; that catch is itself a smoke test of the design.
- The reviewer agent already exists. The doctor must not duplicate
  the reviewer's scope — the reviewer asserts a PR is good *as a
  change*; the doctor asserts the SDLC is good *as a system*.

# Options

## Decision 1 — Baseline scope

### Option 1A — Pure derived; no baseline file
All invariants derive from `sdlc.yaml` and filesystem reality.
- **Pros**: no baseline maintenance; impossible for the baseline to
  rot out of sync with the contract.
- **Cons**: invariants that aren't structurally encoded in `sdlc.yaml`
  (the list of always-applied rules, the list of skills, the expected
  set of workflow files, the required memory files) cannot be checked
  at all without inventing them somewhere; that "somewhere" ends up
  being the script's source code, which is the worst place for a
  contract.

### Option 1B — Full snapshot baseline; every expected file path enumerated
Generated `.sdlc/baseline.yaml` lists every expected file under
`.cursor/`, `.sdlc/`, `.github/`, `scripts/`.
- **Pros**: drift catches *everything* — including a missing template,
  a renamed agent card, an unannounced new rule.
- **Cons**: baseline maintenance becomes a tax on every legitimate
  change; the baseline rots fast under active development; the
  "expected files" list duplicates information already discoverable
  via `git ls-files`.

### Option 1C — Hybrid; lean baseline for what isn't in `sdlc.yaml` (CHOSEN)
`.sdlc/baseline.yaml` captures only the lists that `sdlc.yaml` does
not already encode (slash command set, always-applied rule set, skill
set, hook map, required memory file set, expected workflow files,
fingerprints of `sdlc.yaml` and the concatenated rules). Everything
else (agent IDs, phase definitions, gate names, free-tier quotas,
artifact types) is derived from `sdlc.yaml` directly.
- **Pros**: small surface to maintain; the baseline is the answer to
  "what is the SDLC surface beyond the contract?", which is a useful
  question in its own right; fingerprints catch silent edits to
  `sdlc.yaml` or the always-applied rules (the baseline must be
  regenerated explicitly, which is itself auditable as a PR);
  derived-first means most invariants stay in `sdlc.yaml` where they
  belong.
- **Cons**: contributors must remember to refresh the baseline when
  legitimately adding a slash command, rule, skill, or hook. Mitigated
  by `/doctor --refresh-baseline` which generates the file
  deterministically.
- **Free-tier impact**: zero.

## Decision 2 — Doctor agent autonomy

### Option 2A — Strict read-only; doctor only writes its own report
The doctor writes `.sdlc/reviews/doctor-<date>.md` and stops.
Corrections flow through `/intent` → `/spec` → `/implement` like any
other change.
- **Pros**: maximum auditability; every drift correction is a normal
  PR with a normal review; no special-cased editing scope to police.
- **Cons**: even refreshing the baseline (a legitimate, mechanical
  operation) requires a hand-written PR; high friction for the
  zero-judgment case.

### Option 2B — Fully autonomous; doctor can open corrective PRs for any finding
The doctor branches, edits any file flagged by a finding, opens a PR.
- **Pros**: lowest friction; the SDLC self-heals.
- **Cons**: a corrective PR is by definition a judgment call; the
  doctor's autonomy now overlaps with the implementer's scope; a
  buggy finding cascades into bad edits; the doctor's own PR can
  fail `ci/doctor` and loop. Worst-of-both.

### Option 2C — Read-only with one exception: `--refresh-baseline` (CHOSEN)
Default is strict read-only (Option 2A). The single exception is
`/doctor --refresh-baseline`, which is allowed to branch and open a
PR that touches **only** `.sdlc/baseline.yaml`. Any other diff in
that PR is rejected by the doctor itself before pushing.
- **Pros**: keeps the strict-audit property for every finding the
  doctor cannot mechanically classify as "no judgment required"; the
  one exception is the one operation that is genuinely mechanical
  (the baseline is regenerated by walking the filesystem, nothing
  else); the PR is the audit trail.
- **Cons**: contributors must learn the exception. Mitigated by the
  one-flag UX: `--refresh-baseline` is the only way to invoke it,
  and the doctor agent card explicitly enumerates it.
- **Free-tier impact**: zero.

## Decision 3 — `ci/doctor` cadence

### Option 3A — Required from day one
Add `ci/doctor` to
`sdlc.yaml.integrations.github.branch_strategy.protection.require_status_checks`
in this PR; configure GitHub branch protection in the same PR.
- **Pros**: no period of "advisory only" where findings are visible
  but ignored.
- **Cons**: the doctor's *first* run will flag every pre-existing
  drift item (hooks registry mismatch, plane.mappings pseudo-YAML,
  the legacy `plane_issue:` field on INT-0001). Making `ci/doctor`
  required immediately turns every PR red until those are fixed —
  including the PR that fixes them, since it must merge before
  `ci/doctor` can pass.

### Option 3B — Advisory forever; never blocking
Always advisory.
- **Pros**: never breaks the build.
- **Cons**: findings drift from "actionable" to "background noise";
  the contract has no teeth.

### Option 3C — Advisory first, required after two clean weeks (CHOSEN)
Ship `ci/doctor` as a non-blocking job. Burn down the inevitable
initial backlog of pre-existing drift through normal PRs. After two
consecutive weeks of clean `ci/doctor` runs on `main`, promote it to
required via an explicit ADR superseding this section of ADR-0003
and updating
`sdlc.yaml.integrations.github.branch_strategy.protection.require_status_checks`
in the same PR.
- **Pros**: avoids the cold-start brick; promotion to required is
  itself a deliberate, ADR-tracked event — matches the pattern
  established by `ci/review-gate` in ADR-0001; the two-week criterion
  is mechanical so the promotion is not subjective.
- **Cons**: a window of "advisory only" exists. Mitigated by
  surfacing the findings in the load-context banner (so every
  session sees them), and by the operational-context update flow
  pushing fixes through the normal queue.
- **Free-tier impact**: ~5 seconds of Actions time per PR for the
  mechanical layer; the semantic layer runs weekly via a scheduled
  workflow (one run = a few minutes of agent time, well under the
  free LangSmith trace budget).

# Decision

- **Baseline scope**: Option 1C (lean derived-first baseline).
- **Autonomy**: Option 2C (read-only + `--refresh-baseline` exception).
- **CI cadence**: Option 3C (advisory; required after two clean weeks).

The three together form a coherent posture: the baseline is just rich
enough to make findings precise, the doctor is just autonomous enough
to make the baseline refresh painless, and the CI cadence is just
gradual enough to absorb the initial backlog without ever weakening
the eventual contract.

# Consequences

## Positive

- The SDLC gets an observer matched to its existing invariant
  declarations — the contract finally has a continuous reader.
- The doctor's scope is mechanically distinguishable from the
  reviewer's: reviewer asserts *this PR is good*, doctor asserts *the
  SDLC system is healthy*. The agent identities are separate
  (`reviewer.must_be_distinct_from: implementer`; doctor is its own
  role); the cadences are different (reviewer per PR, doctor per
  session start + per PR mechanical + weekly semantic); the outputs
  are different (`.sdlc/reviews/PR-<N>.md` vs
  `.sdlc/reviews/doctor-<YYYY-MM-DD>.md`).
- Pre-existing drift becomes work items, not background noise. The
  first doctor run is expected to produce a small batch of `fail`
  findings; each becomes a normal `/intent`-driven cleanup PR.
- The lean baseline plus the `--refresh-baseline` exception keeps the
  contributor's day-to-day frictionless: adding a new slash command
  means `/doctor --refresh-baseline` opens the PR with the one-line
  baseline diff, and the contributor merges it alongside their
  feature PR.

## Negative

- Three concurrent concepts (baseline, autonomy boundary, CI cadence)
  raise the cognitive load on the next contributor. Mitigated by the
  doctor's agent card (`.cursor/agents/doctor.md`), the slash command
  file (`.cursor/commands/doctor.md` — created in the next session's
  implementation work), and a dedicated `docs/sdlc-doctor.md` page
  (also next session) that mirrors to a Plane page via the existing
  docs-sync workflow.
- The advisory window means findings are visible but not enforced.
  The two-week clock starts on the doctor's first clean run, which
  pushes the "required" milestone out by however long it takes to
  burn down the initial backlog. Acceptable trade-off — the alternative
  is bricking the build immediately.
- The `--refresh-baseline` exception is a small but real surface area
  the doctor must police (its own diff must contain only that file).
  Mitigated by explicit pre-push check in the doctor agent's
  invocation flow.

## Follow-up work this creates

1. **SPEC-0002** is the executable plan for the doctor. It enumerates
   the mechanical checks the script must run, the semantic checks the
   agent runs, the report shape, and the wiring (`/doctor` command,
   `.cursor/agents/doctor.md` behavior, `.github/workflows/doctor.yml`).
   Implementation of SPEC-0002 is **not** part of this PR; it is
   dispatched via the handoff system shipping in the same PR
   (HANDOFF-2026-05-28-sdlc-doctor).
2. **First-run findings backlog.** Once SPEC-0002 ships and runs, expect
   `fail` findings for at least: `sdlc.yaml.instructions.hooks.registry`
   pointing at `.sh` while `hooks.json` runs `.mjs`; the pseudo-YAML
   arrow notation in `integrations.plane.mappings`; the legacy
   `plane_issue:` field on INT-0001 (per ADR-0002's soft deprecation).
   Each is its own cleanup intent; the doctor's first weekly report
   files them.
3. **Promotion ADR.** Two weeks after the doctor's first clean
   `ci/doctor` run on `main`, write the ADR that supersedes
   "Decision 3 — Option 3C" with "required check on `main`". The
   promotion ADR also adds `ci/doctor` to
   `sdlc.yaml.integrations.github.branch_strategy.protection.require_status_checks`
   and runs `gh api -X PATCH` against the live branch protection
   (same pattern as ADR-0001's follow-up).
4. **Cross-link with ADR-0002.** The doctor mechanically asserts the
   tracker adapter contract from ADR-0002 (every declared adapter has
   a script; every script exposes the contract's subcommands). The
   two ADRs depend on each other for the system to hold together,
   but neither supersedes the other.
