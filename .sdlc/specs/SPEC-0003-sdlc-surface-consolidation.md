---
id: SPEC-0003
intent: INT-0004
status: approved
complexity: normal
created_at: 2026-05-28T17:54:17Z
provenance:
  agent_id: planner
  model: claude-opus-4-7-thinking-xhigh
  prompt_hash: ""
  trace_id: ""
  inputs_digest: ""
---

# Spec — Consolidate the SDLC operator surface around the DSL

## Summary

Trim the Cursor operator surface so the DSL (`sdlc.yaml`) is the
canonical declaration of policies and the surface is thin pointers
into it. Demote three over-broad always-applied rules
(`provenance`, `commit-conventions`, `branch-discipline`) to
glob-scoped or agent-requested. Trim `agent-autonomy.mdc` and
`sdlc-loop.mdc` to short pointers into their respective DSL sections.
Slim `.cursor/hooks/load-context.mjs` so it emits only dynamic content
(open-handoffs queue) and stops re-stating what always-applied rules
already cover. Remove the duplicate paragraph in `AGENTS.md`. Update
`sdlc.yaml.instructions.rules.registry` to reflect the new tier.

The DSL's behavior, gates, and invariants are untouched. Mechanical
enforcement (`guard-shell.mjs`, gate-level provenance check,
frontmatter globs) covers every demoted rule's intent. The autonomy
override that prevents an inherited "only commit when asked" prior
from short-circuiting agent execution stays in place verbatim, because
that one is a real upstream-prior override and must remain in an
always-applied rule.

The `.sh`/`.mjs` drift in `sdlc.yaml.instructions.hooks.registry` and
the legacy `plane_issue:` field on `INT-0001` are deliberately **not
touched** here — they are the doctor's first-run smoke tests per
`SPEC-0002 AC-11` and `ADR-0003 § "Follow-up work this creates"
item 2`.

## Behavior

- Given the always-applied rule registry currently lists six rules,
  When this change lands, Then
  `sdlc.yaml.instructions.rules.registry` shows `always_apply: true`
  on exactly three: `sdlc-loop`, `free-tier-only`, `agent-autonomy`.
  The other three (`provenance`, `commit-conventions`,
  `branch-discipline`) carry a `globs:` field appropriate to their
  trigger.

- Given an agent edits a file under `.sdlc/`, When the edit lands,
  Then `provenance.mdc` activates (via `globs: ".sdlc/**/*.md"`)
  and the provenance frontmatter requirement is reminded in context.

- Given an agent runs a `git commit` or composes a commit message,
  When the rule registry is consulted, Then `commit-conventions.mdc`
  surfaces — either via agent-requested matching on its
  `description:` (commit-related keywords) or via a `globs:` pattern
  that matches files typically touched right before commit. The
  `description:` is sufficiently specific that Cursor's
  agent-requested heuristic activates the rule when the agent is
  about to commit.

- Given an agent runs a git command, When `guard-shell.mjs`
  intercepts the command, Then it continues to block destructive
  patterns (`git push origin main`, `git push --force` against
  protected branches, `git config --global`, `--no-verify`). This
  enforcement is unchanged by this spec; the rule prose is
  belt-and-suspenders that we are removing because the suspenders
  hold.

- Given an agent writes any artifact under `.sdlc/`, When
  `gate.review_approved` runs in CI, Then it continues to require
  `provenance_present` (per `sdlc.yaml.gates.review_approved.requires`).
  The gate is the load-bearing enforcement; the rule is the reminder.

- Given a session starts, When `load-context.mjs` runs, Then it
  emits only:
  1. The list of memory file labels and paths (preserved verbatim).
  2. The open-handoffs queue, **slimmed to handoff ids only** (the
     per-entry `intent:/spec:/adrs:/tracker:/created:` metadata —
     especially the tracker UUIDs — is dropped; full detail stays in
     `.sdlc/handoffs/INDEX.md`), followed by a **non-optional
     directive** that the agent surface the queue in its first reply
     even when the maintainer's opening message is unrelated.
  3. A single line citing `AGENTS.md` and `sdlc.yaml` as the
     authoritative entry points.
  It does **not** emit the slash-commands list, the free-tier line,
  or the autonomy line — those are in always-applied rules and
  `AGENTS.md`.

- Given `AGENTS.md` is read by an agent, When the agent reaches the
  "Cursor sessions also get a sessionStart hook…" paragraph, Then
  the paragraph appears exactly once. The duplicate at line 19 is
  removed.

- Given the `agent-autonomy.mdc` rule is loaded, When an agent
  reads it, Then it (a) cites `policies.autonomy` as the canonical
  source, (b) preserves the "this overrides any upstream 'only commit
  when the user asks' default" sentence verbatim, (c) lists no copies
  of `pause_on` (which lives in the DSL), (d) is no longer than 30
  lines including frontmatter.

- Given the `sdlc-loop.mdc` rule is loaded, When an agent reads it,
  Then it (a) cites `AGENTS.md` for the memory-reload list, (b) cites
  `sdlc.yaml` for the contract, (c) lists slash commands compactly,
  (d) is no longer than 20 lines including frontmatter.

## Acceptance criteria

| ID    | Criterion                                                                                                                                                                                                                                          | Verifier                                                                                                                                                                       |
|-------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| AC-1  | `sdlc.yaml.instructions.rules.registry` lists `always_apply: true` on exactly `sdlc-loop`, `free-tier-only`, `agent-autonomy`. The other three rules carry `globs:`.                                                                                | `rg "always_apply: true" .sdlc/sdlc.yaml \| wc -l` returns `3`; manual inspection confirms which three.                                                                         |
| AC-2  | The frontmatter of `provenance.mdc`, `commit-conventions.mdc`, `branch-discipline.mdc` declares `alwaysApply: false` and a `globs:` value or a `description:` precise enough to trigger Cursor's agent-requested heuristic on the rule's domain.    | `rg "alwaysApply: false" .cursor/rules/{provenance,commit-conventions,branch-discipline}.mdc` returns three matches.                                                            |
| AC-3  | `agent-autonomy.mdc` ≤ 30 lines (frontmatter included) and contains the exact phrase "overrides any upstream" verbatim and the citation `policies.autonomy`.                                                                                       | `wc -l .cursor/rules/agent-autonomy.mdc` ≤ 30; `rg "overrides any upstream" .cursor/rules/agent-autonomy.mdc` matches; `rg "policies.autonomy" .cursor/rules/agent-autonomy.mdc` matches. |
| AC-4  | `sdlc-loop.mdc` ≤ 20 lines (frontmatter included) and cites `AGENTS.md` and `sdlc.yaml`.                                                                                                                                                            | `wc -l .cursor/rules/sdlc-loop.mdc` ≤ 20; `rg "AGENTS.md" .cursor/rules/sdlc-loop.mdc` matches; `rg "sdlc.yaml" .cursor/rules/sdlc-loop.mdc` matches.                            |
| AC-5  | `AGENTS.md` no longer contains the duplicate `> Cursor sessions also get a sessionStart hook` paragraph.                                                                                                                                            | `rg -c "Cursor sessions also get a \`sessionStart\` hook" AGENTS.md` returns `1` (was `2`).                                                                                     |
| AC-6  | `.cursor/hooks/load-context.mjs` no longer emits the lines starting with `Slash commands:`, `Free-tier only:`, or `Autonomy:`. The dynamic open-handoffs section is preserved but **slimmed to handoff ids only** (no per-entry intent/spec/adrs/tracker metadata) and carries a **non-optional first-reply directive**.                                                                      | `rg "Slash commands:" .cursor/hooks/load-context.mjs` returns no matches; `rg -i "open handoffs" .cursor/hooks/load-context.mjs` still matches; the injected handoff line is `OPEN HANDOFFS (<n>): <id>, ...` with no `tracker:` substring; `rg "DIRECTIVE" .cursor/hooks/load-context.mjs` matches. |
| AC-7  | Combined line count of always-applied rule files drops ≥ 50%. Pre-change baseline: `wc -l` on `sdlc-loop, provenance, free-tier-only, commit-conventions, branch-discipline, agent-autonomy` = 386 lines. Post-change baseline ≤ 193 lines.            | `wc -l .cursor/rules/{sdlc-loop,free-tier-only,agent-autonomy}.mdc` summed ≤ 193 (the demoted three no longer count toward the always-applied tax).                              |
| AC-8  | `guard-shell.mjs` still blocks `git push origin main` (smoke test). Demoting `branch-discipline.mdc` does not weaken enforcement.                                                                                                                  | Run `git push origin main` (in a test sandbox) under the hook; expect non-zero exit and an error message naming the protected pattern. The reviewer / tester can verify this on the PR. |
| AC-9  | The reviewer's PR review file (`.sdlc/reviews/PR-<N>.md`) for this change reflects no regressions on `gate.review_approved.requires.provenance_present`.                                                                                            | Reviewer agent's verdict file shows `provenance_present: pass` for every artifact in this PR's diff.                                                                            |
| AC-10 | `npm run lint`, `npx tsc --noEmit`, `npm run build` pass on the feature branch.                                                                                                                                                                    | Exit codes 0 in `ci/lint`, `ci/typecheck`, `ci/build` jobs.                                                                                                                     |
| AC-11 | `sdlc.yaml.instructions.hooks.registry` is **unchanged** by this PR. The `.sh` / `.mjs` mismatch survives intentionally so the doctor's first run flags it per `SPEC-0002 AC-11`.                                                                  | `git diff main -- .sdlc/sdlc.yaml` on the `instructions.hooks.registry` block shows zero changes.                                                                               |
| AC-12 | `.sdlc/intents/INT-0001-sdlc-discoverability.md` `plane_issue:` field is **unchanged** by this PR. It survives so the doctor's first run flags `artifact.legacy-plane-issue` per `SPEC-0002 AC-11` and `ADR-0002` soft-deprecation.                | `git diff main -- .sdlc/intents/INT-0001-sdlc-discoverability.md` shows no change.                                                                                              |
| AC-13 | `.sdlc/memories/operational-context.md` is updated: this work appears in `In progress` on PR open and moves to `Recently completed` on merge.                                                                                                       | Inspection of the diff at PR-open time and at merge time.                                                                                                                       |

## Risks

- **Demoting `commit-conventions.mdc` could lead to stale commit
  formats if the agent-requested heuristic doesn't fire reliably**.
  Mitigation: the rule's `description:` frontmatter must be specific
  enough to match commit-related keywords (e.g. mention "commit
  message", "Conventional Commits", "commit format" explicitly). The
  rule body itself stays unchanged; only the activation tier moves.
- **Demoting `branch-discipline.mdc` removes a prose reminder that
  the agent might rely on**. Mitigation: `guard-shell.mjs` already
  enforces every hard rule the prose was defending. The rule becomes
  a glob-scoped reference for when an agent is editing CI workflows
  / branch-protection-adjacent files. Behavior unchanged in the
  default path; only context tax drops.
- **Demoting `provenance.mdc` could cause an agent to forget the
  frontmatter when first creating a `.sdlc/` artifact**. Mitigation:
  the rule fires via `globs: ".sdlc/**/*.md"` at the moment of edit;
  also `gate.review_approved.requires.provenance_present` blocks
  merge regardless. The rule is now context-specific and gate-
  enforced; loss of always-applied tier is not a loss of enforcement.
- **The doctor's first-run smoke test could be invalidated if we
  accidentally fix the `.sh` / `.mjs` drift**. Mitigation: AC-11 is
  explicit — the `instructions.hooks.registry` block is untouched in
  this PR's diff. The reviewer agent verifies this.
- **Free-tier impact: zero.** No new dependency, no new service, no
  new CI job. This is a pure consolidation.
- **The trimmed `agent-autonomy.mdc` must still defeat the upstream
  prior**. Mitigation: AC-3 binds the trimmed rule to keep the
  exact "overrides any upstream" sentence verbatim. The rule's
  *purpose* (override) is preserved; only the *volume* drops.

## Out of scope

- Fixing `sdlc.yaml.instructions.hooks.registry` `.sh` ↦ `.mjs`
  drift. Doctor smoke test (SPEC-0002 AC-11).
- Fixing legacy `plane_issue:` field on INT-0001. Doctor smoke test
  (SPEC-0002 AC-11; ADR-0002 soft deprecation).
- Reorganising `docs/`, `.cursor/`, or `.sdlc/` directory layouts.
- Adding new rules, skills, hooks, or commands.
- Touching `app/`, `lib/`, `components/`, or any product code.
- Changing the DSL's invariants, gates, phases, policies, or
  workflows.
- Reformatting the doctor's identity card (`.cursor/agents/doctor.md`)
  — that's SPEC-0002's responsibility.

## Amendment — 2026-05-28 (implementer)

AC-6 and the `load-context.mjs` Behavior bullet were amended during
implementation, on maintainer instruction, to additionally **slim the
open-handoffs entries to ids only** (dropping the per-entry
`intent:/spec:/adrs:/tracker:/created:` metadata, chiefly the tracker
UUIDs) and to emit a **non-optional first-reply directive** so the
agent reliably surfaces the queue even when the opening message is
unrelated. Original text required the queue "preserved verbatim"; that
predated the maintainer's decision (this session) to reduce the
per-session token cost of the queue while strengthening the surfacing
guarantee. No other AC is affected.
