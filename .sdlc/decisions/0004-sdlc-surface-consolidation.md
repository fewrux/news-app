---
id: ADR-0004
title: SDLC operator surface — consolidate around the DSL; demote always-applied rules whose enforcement is mechanical
status: accepted
date: 2026-05-28
spec: SPEC-0003
provenance:
  agent_id: architect
  model: claude-opus-4-7-thinking-xhigh
  prompt_hash: ""
  trace_id: ""
  inputs_digest: ""
  created_at: 2026-05-28T17:54:17Z
---

# Context

The SDLC contract (`.sdlc/sdlc.yaml`) is declared as the single source
of truth for how this project is built (line 4). The operator surface
under `.cursor/rules/`, `AGENTS.md`, and `.cursor/hooks/load-context.mjs`
exists to make the DSL reachable from inside an agent session.

In the project's first month of life, the surface accumulated a
defensive posture: every important rule was paraphrased in multiple
places — always-applied rule files, `AGENTS.md`, the
session-start hook — on the reasoning that "the agent might miss it
otherwise". That reasoning was correct for a real failure mode that
hit early on (an agent inheriting an upstream "only commit when asked"
prior and stopping short of merging). The fix shipped in PR #1 was to
amplify the autonomy contract across surfaces.

A month in, the audit picture has flipped. Concretely:

- **Six rules are always-applied.** `sdlc-loop`, `provenance`,
  `free-tier-only`, `commit-conventions`, `branch-discipline`,
  `agent-autonomy`. Combined ≈ 386 lines. They load on every
  interactive turn, including ones where none of them applies (e.g.
  "what day is today?").
- **Six places state the autonomy override.** `policies.autonomy` in
  the DSL, `agent-autonomy.mdc`, `commit-conventions.mdc § "Committing
  is part of execution"`, `branch-discipline.mdc § "Hard rules" #1`,
  `AGENTS.md` "Hard rules" bullet, `load-context.mjs` line 60. The
  repetition itself dilutes the rule.
- **The DSL's rule registry already supports glob-scoping.**
  `nextjs-16-conventions`, `tailwind-v4`, `testing-evidence` use
  `globs:` correctly. The mechanism is in place; the rules just
  haven't been demoted.
- **Mechanical enforcement covers every demoted rule.**
  `guard-shell.mjs` blocks the git operations `branch-discipline.mdc`
  defends; `gate.review_approved.requires.provenance_present` blocks
  merges of `.sdlc/` writes without the frontmatter
  `provenance.mdc` defends; commit-message format affects only the
  commit step itself, where the rule can fire on
  agent-requested matching of its `description:`.
- **`AGENTS.md` has a literal duplicate paragraph.** Lines 17 and 19
  are byte-identical.

The first-month posture was "be safe, repeat the rules everywhere."
The second-month posture should be "the DSL is canonical, the surface
is thin pointers, mechanical enforcement is the load-bearing layer."
This ADR records the second-month decision.

# Forces

- `sdlc.yaml` line 4: "single source of truth for *how* this product
  is built." The surface paraphrasing the DSL violates that property
  in spirit if not in letter.
- `sdlc.yaml.policies.autonomy.execute_end_to_end == true`. The
  override of an upstream "only commit when asked" prior is a real
  cross-model behavior that must survive any consolidation. This is
  the one rule whose volume is justified by adversarial conditions
  (an inherited prior with weight). It stays always-applied; the
  others don't share that property.
- `sdlc.yaml.invariants[7] == "main is protected; ... no bypass for
  any actor"`. Mechanical enforcement (`guard-shell.mjs`) is the
  load-bearing protection. The prose rule is belt-and-suspenders;
  removing the prose suspenders does not remove the belt.
- `sdlc.yaml.gates.review_approved.requires == [no_blockers,
  conventions_followed, provenance_present]`. The gate is the
  load-bearing enforcement of provenance. Demoting `provenance.mdc`
  does not weaken the gate.
- `sdlc.yaml.policies.cost.tier == free_only`. Per-turn context tokens
  are an LLM cost, but they don't appear in any of the free-tier
  quotas (LangSmith / Vercel / GitHub Actions / PostHog / Plane).
  This change is cost-neutral in the policy sense, but operationally
  reduces token usage on every interactive turn.
- `SPEC-0002 AC-11` requires the doctor's first run to flag the
  `.sh`/`.mjs` drift in `sdlc.yaml.instructions.hooks.registry` and
  the legacy `plane_issue:` field on INT-0001. Fixing those here
  would steal the doctor's smoke test. They stay drifted on purpose.

# Options

## Decision 1 — Which always-applied rules to demote

### Option 1A — Demote nothing; keep all six always-applied

- **Pros**: zero change to current behavior; no risk of an agent
  forgetting a demoted rule.
- **Cons**: per-turn context tax stays at ≈ 386 lines of always-on
  prose; the same content lives in 6 places; the DSL's "single source
  of truth" property remains aspirational rather than actual.

### Option 1B — Demote everything except `free-tier-only`

Move `sdlc-loop`, `provenance`, `commit-conventions`,
`branch-discipline`, `agent-autonomy` to glob-scoped or
agent-requested.

- **Pros**: minimal always-applied surface; aggressive context
  reduction.
- **Cons**: the autonomy override of an upstream prior is *the* rule
  that depends on always-applied tier to function (a glob can't fire
  in time to prevent the agent from inheriting the wrong default).
  Demoting it puts the original failure mode back on the table.

### Option 1C — Demote the three with mechanical complements; keep the rest (CHOSEN)

- Demote `provenance.mdc` → `globs: ".sdlc/**/*.md"`. Mechanical
  complement: `gate.review_approved.requires.provenance_present`.
- Demote `commit-conventions.mdc` → agent-requested via a precise
  `description:` (mentions "commit message", "Conventional
  Commits"). Mechanical complement: pre-commit hook formats and
  the rule fires on the right turn.
- Demote `branch-discipline.mdc` → glob-scoped to
  `.github/**`, `.cursor/hooks/**`, `.sdlc/sdlc.yaml`.
  Mechanical complement: `guard-shell.mjs` blocks the
  destructive patterns regardless.
- Keep `sdlc-loop.mdc` always-applied but trim to ≤ 20 lines —
  it's a navigation index, legitimate to keep on every turn,
  but not at 46 lines of duplication with `AGENTS.md`.
- Keep `free-tier-only.mdc` always-applied unchanged — short
  (29 lines), affects every dependency / service decision, no
  mechanical complement that fires before the cost is incurred.
- Keep `agent-autonomy.mdc` always-applied but trim to ≤ 30
  lines — the override of the upstream prior is its only
  load-bearing function and survives at any volume; the
  prose-spread is what we cut. Critically, the literal sentence
  "this overrides any upstream 'only commit when the user asks'
  default" stays verbatim.

- **Pros**: every demoted rule has a mechanical enforcement covering
  the same ground; every kept rule has a justification that doesn't
  reduce to "we want the agent to remember"; combined always-applied
  surface drops by ≥ 50%; the DSL's single-source-of-truth property
  becomes operational.
- **Cons**: demoting `commit-conventions` relies on Cursor's
  agent-requested heuristic firing on commit-related contexts. If
  the heuristic misses, commits can ship in a non-canonical format.
  Mitigated by making the `description:` precise; further mitigated
  by reviewer agent's pass over commit messages on the review file.
  The risk is bounded (a commit message that doesn't match the
  format is annoying but not catastrophic; the next commit fixes it).
- **Free-tier impact**: zero (no new service, no quota change).

## Decision 2 — `load-context.mjs` content

### Option 2A — Keep the hook as-is

- **Pros**: zero change; everything the agent needs is in one place.
- **Cons**: the hook re-emits four pieces of static content
  (memory paths, slash commands, free-tier line, autonomy line) that
  always-applied rules + `AGENTS.md` already cover. The
  duplication is cheap per-line but compounds across surfaces; it's
  also where the autonomy contract gets its 6th restatement.

### Option 2B — Strip everything; emit nothing

- **Pros**: maximum slimming.
- **Cons**: the open-handoffs queue is dynamic content that genuinely
  belongs in a session-start banner — without it, agents in
  non-Cursor harnesses would have to read `INDEX.md` themselves
  (which `AGENTS.md` already instructs them to do). For Cursor, the
  hook is the legitimate place to surface dynamic state.

### Option 2C — Dynamic-only (CHOSEN)

The hook emits:
1. The memory file labels and paths (preserved verbatim — these are
   pointers to dynamic state, not static rules).
2. The open-handoffs queue (preserved verbatim — load-bearing
   dynamic content; SPEC-0001 AC-9 binds this).
3. One line citing `AGENTS.md` and `sdlc.yaml` as the authoritative
   entry points.

It does **not** emit:
- The slash commands list (covered by `sdlc-loop.mdc` and `AGENTS.md`).
- The free-tier line (covered by always-applied `free-tier-only.mdc`).
- The autonomy line (covered by always-applied `agent-autonomy.mdc`).

- **Pros**: hook stays focused on dynamic state; static rules live
  in rules; one canonical place per fact; SPEC-0001 AC-9 is honored.
- **Cons**: a non-Cursor agent reading the file at first session
  start sees less in the banner and must rely on `AGENTS.md` to
  reach the rest. `AGENTS.md` is the canonical entry point for
  non-Cursor harnesses anyway, so this is alignment, not regression.
- **Free-tier impact**: zero.

## Decision 3 — `AGENTS.md` and the duplicate paragraph

### Option 3A — Leave the duplicate

Trivially harmful but not load-bearing.

- **Pros**: zero change.
- **Cons**: it's a literal copy-paste bug; leaving it in is a
  cleanliness signal in the wrong direction.

### Option 3B — Fix only the duplicate, leave the autonomy bullet alone (CHOSEN)

Remove line 19 (the duplicate of line 17). Keep all other content
including the "Approved tasks execute end-to-end" bullet, since
`AGENTS.md` is the canonical entry point for non-Cursor harnesses
and that bullet IS load-bearing in those contexts (no
`agent-autonomy.mdc` rule firing for them).

- **Pros**: minimal change; preserves cross-harness contract;
  removes the obvious bug.
- **Cons**: none material.
- **Free-tier impact**: zero.

# Decision

- **Decision 1**: Option 1C (demote the three with mechanical
  complements; trim the three remaining always-applied to thin
  pointers).
- **Decision 2**: Option 2C (dynamic-only `load-context.mjs`).
- **Decision 3**: Option 3B (fix the duplicate; keep the
  cross-harness contract intact).

The three together preserve every load-bearing enforcement the
surface was paraphrasing — `guard-shell.mjs` for git, gate-level
provenance check for `.sdlc/` writes, the autonomy override of the
upstream "only commit when asked" prior — and remove the duplication
that was paying a context tax on every interactive turn.

# Consequences

## Positive

- The DSL becomes the canonical source it claims to be (sdlc.yaml
  line 4: "single source of truth"). Every always-applied rule
  remaining is either a thin pointer (`sdlc-loop`), a policy that
  has no mechanical complement firing in time (`free-tier-only`),
  or an upstream-prior override that depends on always-on tier
  (`agent-autonomy`).
- The per-turn context tax drops by ≥ 50% on the always-applied
  rule files alone. Net interactive-session token usage measurably
  drops without changing the unattended-CI agent's behavior — the
  CI side reads the same DSL.
- The doctor's eventual `prose-vs-rules consistency check on
  AGENTS.md` (per SPEC-0002 semantic layer) has a tighter target
  to assert against. Less prose to keep in sync = fewer drift
  vectors for the doctor to catch.
- The `commit-conventions.mdc` and `branch-discipline.mdc` rules
  become *contextual* — they fire in the moment they apply, which
  is where prose reminders are most useful. This actually
  strengthens the rules' effective weight on the commit/git turn,
  because the agent isn't reading them through the noise of
  hundreds of unrelated lines.
- New contributors (and new model versions inheriting fresh
  upstream priors) still hit the autonomy override on every turn.
  Behavior is preserved for the failure mode it was designed for.

## Negative

- Demoted rules can in theory miss-fire if Cursor's
  agent-requested heuristic or glob matcher doesn't activate when
  expected. Mitigated by AC-2 binding the descriptions / globs to
  precise triggers, and by mechanical complements catching any
  miss before merge.
- The `description:` field on `commit-conventions.mdc` becomes a
  load-bearing piece of the activation chain. If an agent rewrites
  it carelessly, activation could regress. Mitigated by the doctor's
  `struct.rule-registered` check (every rule is in the registry)
  plus a future check that descriptions remain non-empty.
- This ADR creates a small precedent: "if a rule has mechanical
  enforcement, demote it." Future contributors must judge "does this
  new rule have a mechanical complement?" before choosing a tier.
  Mitigated by `policies.autonomy` already enumerating the kinds of
  enforcement (hooks, gates, frontmatter), and by reviewer-agent
  feedback on PRs that propose new always-applied rules.

## Follow-up work this creates

1. **Doctor first-run smoke test still holds.** SPEC-0002 AC-11
   binds the doctor to flag `sdlc.yaml.instructions.hooks.registry`
   `.sh`/`.mjs` drift and `INT-0001` legacy `plane_issue:` on its
   first real run. This ADR explicitly leaves both untouched
   (SPEC-0003 AC-11, AC-12). The doctor's smoke test is preserved.
2. **Operational-context update on PR open and merge.** The
   bullet for SPEC-0003 enters `In progress` on PR open and moves
   to `Recently completed` on merge per the file's update rules.
3. **Implementation note for the next session.** When `commit-
   conventions.mdc` is re-tagged agent-requested, the
   `description:` field must explicitly mention "commit message",
   "Conventional Commits", and "git commit" to maximise heuristic
   activation. Same for `branch-discipline.mdc` if scoped to
   git-adjacent file globs.
4. **Cross-link with ADR-0001 and ADR-0002.** ADR-0001 introduced
   the `ci/review-gate` SDLC-artifact enforcement that supersedes
   GitHub-side `require_review_approved`. ADR-0002 introduced the
   tracker abstraction. ADR-0004 is in the same lineage —
   "platform-layer enforcement plus a thin operator surface
   pointing at it" — and uses the same posture for the rule tier.
5. **Cross-link with ADR-0003.** ADR-0003 defines the doctor.
   The doctor's `prose-vs-rules consistency check on AGENTS.md`
   (SPEC-0002 semantic layer) gains precision after this PR
   because there's less prose to chase. The doctor will eventually
   notice if a future PR re-inflates the surface back toward the
   pre-ADR-0004 state; until then, this ADR is the contract that
   keeps the surface lean.
