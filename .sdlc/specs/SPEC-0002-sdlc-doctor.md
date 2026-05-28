---
id: SPEC-0002
intent: INT-0003
status: approved
complexity: complex
created_at: 2026-05-28T16:40:00Z
provenance:
  agent_id: planner
  model: claude-opus-4-7-thinking-xhigh
  prompt_hash: 530a7bf5f6907e8f
  trace_id: ""
  inputs_digest: ""
---

# Spec — SDLC drift detection (the "doctor")

## Summary

Implement the SDLC doctor in three layers per ADR-0003: a deterministic
mechanical checker at `scripts/sdlc-doctor.mjs` (zero LLM, runs in CI),
a doctor agent that adds a semantic layer on top of the mechanical
report and writes a dated findings file under `.sdlc/reviews/`, and a
`/doctor` slash command plus session-start surfacing. The baseline is
the lean derived-first shape at `.sdlc/baseline.yaml` (Option 1C); the
agent is read-only except for `/doctor --refresh-baseline` (Option 2C);
`ci/doctor` ships advisory and is promoted to required after two
consecutive clean weeks via a future ADR (Option 3C).

This spec is the contract the next session implements. The current PR
(SPEC-0001) ships the design artifacts and the agent identity card; the
doctor's executable parts (the script, the agent behavior, the slash
command, the workflow, the baseline file, the skill) are out of scope
for SPEC-0001 and in scope here.

## Behavior

- Given the repo at any commit, When `node scripts/sdlc-doctor.mjs
  --mode=mechanical` runs, Then it produces a structured JSON report at
  stdout (and a human-readable summary at stderr) covering five
  categories — structural, artifact, memory hygiene, process compliance,
  cost compliance — with severity `fail | warn | info` per finding, and
  exits 0 (no findings or only `warn`/`info`), 1 (one or more `fail`),
  or 2 (script error).

- Given a missing `.sdlc/baseline.yaml`, When the script runs, Then it
  produces a single `fail` finding ("baseline absent; run
  `/doctor --refresh-baseline`") and exits 1.

- Given the maintainer invokes `/doctor` in a Cursor session, When the
  doctor agent dispatches, Then it runs the mechanical layer, layers in
  semantic findings (memory contradictions, glossary consistency,
  recent-PR shape audit via `gh pr list --state merged --limit 10`,
  prose-vs-rules consistency check on `AGENTS.md`), writes
  `.sdlc/reviews/doctor-<YYYY-MM-DD>.md` with provenance and a
  categorised findings table, proposes follow-up specs for each `fail`,
  and does not edit any other file.

- Given the maintainer invokes `/doctor --refresh-baseline`, When the
  doctor agent dispatches, Then it derives the baseline from filesystem
  reality + `sdlc.yaml`, writes it to `.sdlc/baseline.yaml`, opens a PR
  on `chore/refresh-baseline-<YYYY-MM-DD>` containing **only** that file
  diff, and refuses to push if any other file appears in the diff.

- Given a PR is opened, When the `doctor` GitHub Actions workflow runs,
  Then it executes `node scripts/sdlc-doctor.mjs --mode=mechanical` and
  posts the human-readable summary as a PR comment. The check is
  advisory (not in `branch_strategy.protection.require_status_checks`)
  until promoted by a future ADR.

- Given the doctor's findings include known pre-existing drift (the
  three items in ADR-0003 § "Follow-up work this creates" item 2), When
  a contributor opens a `chore/fix-doctor-finding-*` PR, Then the
  finding's id appears in the PR description as `Closes: doctor:<id>`
  and the next doctor run reflects its resolution.

## Acceptance criteria

| ID    | Criterion                                                                                                                                                  | Verifier                                                                                                                                                          |
|-------|------------------------------------------------------------------------------------------------------------------------------------------------------------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| AC-1  | `scripts/sdlc-doctor.mjs` exists, exits 0 on a clean tree, and prints a categorised report on stdout.                                                       | `node scripts/sdlc-doctor.mjs --mode=mechanical` exits 0 on a tree where every fixture under `.sdlc/evals/cases/doctor/clean/` is met.                            |
| AC-2  | The script implements every check enumerated in `## Checks (mechanical layer)` below; each check emits findings with `id`, `severity`, `category`, `message`. | `node scripts/sdlc-doctor.mjs --mode=mechanical --list-checks` prints every check id; corresponds 1:1 with the list in this spec.                                 |
| AC-3  | On a tree with **known** drift fixtures (e.g. missing provenance, fabricated trace_id, stale operational-context entry), the script produces matching `fail` / `warn` findings. | Eval cases under `.sdlc/evals/cases/doctor/*.json` each map a fixture commit to expected finding ids; CI eval workflow asserts the match.                          |
| AC-4  | `.sdlc/baseline.yaml` exists; `/doctor --refresh-baseline` regenerates it deterministically from filesystem + `sdlc.yaml`.                                  | Run the regeneration; `git diff .sdlc/baseline.yaml` is empty on a clean tree.                                                                                    |
| AC-5  | `.cursor/agents/doctor.md` (already shipped in SPEC-0001) is extended with the full agent behavior: required reading, gates owned, escalation rules, the one autonomy exception (`--refresh-baseline`). | Inspection of the file's `## Constraints` and `## Invocation` sections.                                                                                            |
| AC-6  | `.cursor/commands/doctor.md` exists and is registered in `sdlc.yaml.instructions.commands.registry`.                                                        | `test -f .cursor/commands/doctor.md && rg -q '/doctor' .sdlc/sdlc.yaml`                                                                                           |
| AC-7  | `.cursor/skills/sdlc-doctor/SKILL.md` exists, declares when the skill activates, and documents the report shape + the `--refresh-baseline` flag.            | `test -f .cursor/skills/sdlc-doctor/SKILL.md && rg -q '--refresh-baseline' .cursor/skills/sdlc-doctor/SKILL.md`                                                   |
| AC-8  | `.github/workflows/doctor.yml` runs the mechanical layer on every PR, posts the summary as a PR comment, and is **not** in `branch_strategy.protection.require_status_checks` (advisory). | The workflow file exists; `rg ci/doctor .sdlc/sdlc.yaml` finds it only in workflow registry, not in the protection block.                                          |
| AC-9  | A scheduled `doctor-weekly.yml` workflow exists, runs the agentic layer once a week, and files a Plane issue (via the tracker adapter) on any `fail`.       | The workflow file exists; one dry-run via `workflow_dispatch` produces a Plane issue (or noops if no `fail`).                                                     |
| AC-10 | The agent's findings file at `.sdlc/reviews/doctor-<YYYY-MM-DD>.md` carries provenance, lists findings by category, and proposes a follow-up spec slug per `fail`. | Inspect the first real run's output; eval case asserts shape.                                                                                                     |
| AC-11 | First real run flags the known pre-existing drift: `sdlc.yaml.instructions.hooks.registry` `.sh` mismatch, the legacy `plane_issue:` field on INT-0001 (per ADR-0002). | The first run's report contains those finding ids. They become the next cleanup intents. (The `integrations.plane.mappings` pseudo-YAML issue was fixed in SPEC-0001's PR while validating new mappings; it does not appear in the first-run backlog.) |
| AC-12 | `.sdlc/memories/operational-context.md` is updated: doctor work appears in `In progress`, then `Recently completed` on merge.                              | Inspection of the diff.                                                                                                                                           |
| AC-13 | `npm run lint`, `npx tsc --noEmit`, and `npm run build` pass on the doctor's feature branch.                                                                | Exit codes 0.                                                                                                                                                     |

## Checks (mechanical layer — the canonical list AC-2 binds to)

**Structural**
- `struct.agent-id-resolves`: every `sdlc.yaml.roles.agents[].id` has `.cursor/agents/<id>.md`.
- `struct.command-id-resolves`: every entry in `sdlc.yaml.instructions.commands.registry` has its `file` on disk.
- `struct.skill-registered`: every directory under `.cursor/skills/` is in the registry, and vice-versa.
- `struct.rule-registered`: every `.cursor/rules/*.mdc` is in the registry, and vice-versa.
- `struct.hook-registry-matches-config`: `sdlc.yaml.instructions.hooks.registry` script paths match `.cursor/hooks.json` commands. (Will flag the `.sh` vs `.mjs` drift on first run.)
- `struct.workflow-named-exists`: every workflow id in `sdlc.yaml.integrations.github.actions.workflows` has its file under `.github/workflows/`.
- `struct.protection-checks-exist`: every name in `branch_strategy.protection.require_status_checks` is a job declared in some workflow file.
- `struct.tracker-adapter-script-exists`: `integrations.tracker.providers[active_provider].sync_script` exists.
- `struct.tracker-adapter-contract-conformance`: that script's `--help` (or `(no args)` output) lists every verb in `adapter_contract`.

**Artifact**
- `artifact.provenance-present`: every file under `.sdlc/{intents,specs,decisions,reviews,incidents,postmortems,releases,evals/cases,handoffs}` has a complete `common_provenance` frontmatter block. Empty fields are accepted (per `.cursor/rules/provenance.mdc`); missing fields are a `fail`.
- `artifact.trace-id-plausible`: when `trace_id` is non-empty, it matches a UUID-ish shape (heuristic guard against fabrication).
- `artifact.handoff-index-sync`: every `## open` row in `.sdlc/handoffs/INDEX.md` maps to a real handoff file with matching status; every `status: open` handoff file appears in the index.
- `artifact.tracker-provider-known`: every `tracker.provider` value in artifact frontmatter is a key in `integrations.tracker.providers`.
- `artifact.legacy-plane-issue`: (soft deprecation per ADR-0002) flag `plane_issue:` fields with a `warn`, not a `fail`, until the cleanup chore lands.

**Memory hygiene**
- `memory.operational-context-cap`: each section under `operational-context.md` is at or below its declared cap.
- `memory.glossary-consistency` *(semantic, deferred to agentic layer)*.
- `memory.architecture-vs-project` *(semantic, deferred to agentic layer)*.

**Process compliance**
- `process.recent-pr-shape`: the last 10 merged PRs each carry a Plane (or active-provider) issue link, a Vercel preview reference, and an e2e video reference. Run via `gh pr list --state merged --limit 10`. `gh` absence → `info`, not `fail`.
- `process.reviewer-distinct`: the last 10 reviews under `.sdlc/reviews/PR-*.md` each carry `implementer_distinct_from_reviewer: true`.

**Cost compliance**
- `cost.integration-has-quota`: every declared integration under `sdlc.yaml.integrations` has a corresponding entry under `policies.cost.free_quotas` (or an explicit waiver).
- `cost.tracker-provider-has-quota`: every tracker provider has its `free_tier_quota_ref` resolving to a real `free_quotas` entry.

## Risks

- **First run flags many findings.** Expected per ADR-0003. Mitigation:
  ci/doctor ships advisory; backlog burns down through normal PRs.
- **Semantic layer cost.** Weekly agentic run consumes LangSmith
  traces (free quota: 5k/month). Mitigation: schedule weekly only;
  fail-soft on LangSmith outage.
- **`gh` unavailable in CI runner.** `process.*` checks degrade to
  `info`. Mitigation: workflow installs `gh` (already available on
  ubuntu-latest runners).
- **Baseline drift.** Contributors forget to refresh after adding
  rules/skills/etc. Mitigation: `struct.*` checks fail loudly, with
  the message naming `/doctor --refresh-baseline`.

## Out of scope

- The promotion ADR moving `ci/doctor` from advisory to required.
  That ships separately after two clean weeks per ADR-0003 § "Decision 3".
- A `docs/sdlc-doctor.md` human-readable page mirrored to Plane.
  Optional follow-up; the agent card + skill cover the operator
  surface.
- LLM-based code-similarity checks against historical patterns. Out
  of scope for v1 of the doctor; the contract-based checks above are
  enough to materially reduce drift.
- Replacing the reviewer agent's review of any individual PR. The
  doctor's scope is the system, not the change.
