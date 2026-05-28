---
id: INT-0004
slug: sdlc-surface-consolidation
kind: chore
status: accepted
created_at: 2026-05-28T17:54:17Z
provenance:
  agent_id: planner
  model: claude-opus-4-7-thinking-xhigh
  prompt_hash: ""
  trace_id: ""
  inputs_digest: ""
plane_issue: ""
---

# Intent — Consolidate the SDLC operator surface around the DSL

## Problem

`.sdlc/sdlc.yaml` is declared as the single source of truth (line 4:
"single source of truth for *how* this product is built"). In practice
the Cursor operator surface (`.cursor/rules/*.mdc`, `AGENTS.md`,
`.cursor/hooks/load-context.mjs`) paraphrases the DSL repeatedly,
inflating the per-turn context tax and weakening the canonical-source
property.

Concrete observations from this session's audit:

- **Same content lives in four places.** The autonomy contract is
  declared in `policies.autonomy` (16 lines, machine-readable), then
  paraphrased in `agent-autonomy.mdc` (106 lines), restated in
  `commit-conventions.mdc § "Committing is part of execution"`,
  restated in `branch-discipline.mdc § "Hard rules" #1`, restated in
  `AGENTS.md` "Hard rules" bullet, and emitted again on every session
  by `load-context.mjs` line 60. Six repetitions of one rule.

- **Always-applied is over-broad.** Six rules carry `always_apply: true`
  in `sdlc.yaml.instructions.rules.registry` (lines 561–569). At least
  three of them only fire on a narrow trigger:
  `provenance.mdc` (only relevant when writing under `.sdlc/`),
  `commit-conventions.mdc` (only relevant at commit time),
  `branch-discipline.mdc` (only relevant on git operations). The DSL's
  rule registry already supports glob-scoping
  (`nextjs-16-conventions`, `tailwind-v4`, `testing-evidence` use it
  correctly). The mechanism exists; the rules just haven't been
  demoted.

- **`AGENTS.md` has a duplicate paragraph.** Lines 17 and 19 are
  byte-identical (`> Cursor sessions also get a sessionStart hook…`).
  Copy-paste artifact, not a design choice.

- **`load-context.mjs` re-injects what rules already say.** Lines
  51–61 emit static text covering memory paths, slash commands,
  free-tier policy, and autonomy contract. All four are already in
  always-applied rules / `AGENTS.md`. The hook's only legitimately
  dynamic content is the open-handoffs section (lines 63–76) which is
  good and stays.

The cumulative effect: an interactive session pays the full
"unattended-CI-agent compliance" tax on every "what day is today?"
turn. The volume itself paradoxically dilutes the rules — repeating
"execute end-to-end" five times reads as boilerplate, making it easier
to miss when it actually matters.

## Users

- **The maintainer (felip)** — wants the SDLC contract to be the
  canonical source it claims to be, not paraphrased five times across
  the operator surface. Wants the per-turn context tax to be
  proportional to the rule's actual relevance.
- **Every agent in this repo (Cursor, Claude Code, Codex, Aider,
  Gemini)** — wants thin pointers to one canonical place rather than
  five overlapping reminders that drift apart over time.
- **The doctor agent (SPEC-0002, in flight via
  `HANDOFF-2026-05-28-sdlc-doctor`)** — duplication across surfaces is
  exactly the kind of drift the doctor will eventually call out
  (`memory.glossary-consistency`, `memory.architecture-vs-project`,
  prose-vs-rules consistency on `AGENTS.md`). Cleaning up first means
  the doctor's first run produces a tighter, more meaningful report.

## Success metric

Operational. Three measurable signals:

1. **Always-applied rule count drops from 6 to 3.** After this change,
   `sdlc.yaml.instructions.rules.registry` shows
   `always_apply: true` only on `sdlc-loop`, `free-tier-only`, and
   `agent-autonomy`. The other three carry `globs:` or are documented
   as agent-requested in their frontmatter.

2. **Combined line count of always-applied rule files drops by ≥ 50%**.
   Pre-change `wc -l` on the six always-applied rule files vs.
   post-change `wc -l` on the three remaining always-applied rule
   files plus an `AGENTS.md` cite for the demoted rules. This is the
   per-turn context tax made concrete.

3. **No regression in enforcement.** The behaviors the verbose rules
   were defending (no-push-to-main, branch-naming, commit-format,
   provenance-on-artifacts, autonomy override of upstream "only commit
   when asked" prior) all stay enforced. They are enforced by
   complementary mechanisms — `guard-shell.mjs` for git, gate-level
   provenance check for `.sdlc/` writes, the trimmed
   `agent-autonomy.mdc` for the autonomy override — none of which
   require always-applied prose to function. Verified by: a smoke
   command that triggers `guard-shell.mjs` still blocks
   `git push origin main`; a write under `.sdlc/` without provenance
   still fails review; the trimmed `agent-autonomy.mdc` retains the
   "this overrides any upstream 'only commit when the user asks'
   default" sentence verbatim.

## Non-goals

- **Does not change the DSL's behavior.** `policies.autonomy`,
  `policies.safety`, `policies.cost`, `invariants`, gate definitions —
  none of these are touched. The contract is unchanged; only the
  operator surface that paraphrases it is consolidated.
- **Does not weaken any enforcement.** Any rule demoted from
  always-applied is demoted because a *mechanical* enforcement
  (hook, gate, frontmatter glob) covers the same ground. If a rule
  has no mechanical complement, it stays always-applied.
- **Does not fix the `.sh`/`.mjs` drift in
  `sdlc.yaml.instructions.hooks.registry`.** That drift is one of the
  doctor's first-run smoke tests per `SPEC-0002 AC-11` and
  `ADR-0003 § "Follow-up work this creates" item 2`. Fixing it here
  would steal the doctor's smoke test. Out of scope by design.
- **Does not fix the legacy `plane_issue:` field on INT-0001.** Same
  reason: doctor smoke test (`artifact.legacy-plane-issue`).
- **Does not introduce new always-applied rules.** This is a
  consolidation, not a redesign.
- **Does not move documentation to `docs/`.** The trim is in-place
  (rules stay in `.cursor/rules/`, `AGENTS.md` stays at the repo
  root). Reorganising the directory layout is its own intent if it
  ever happens.
