# The AI-native SDLC

This project's lifecycle is declared in
[`.sdlc/sdlc.yaml`](../.sdlc/sdlc.yaml) and operated through the surfaces
in [`.cursor/`](../.cursor/). The contract is authoritative; this page is
a friendly tour.

## Tenets

1. **Intent over implementation** — humans write *what* and *why*;
   agents derive *how*.
2. **Specs are executable** — every spec links to a verifiable
   acceptance criterion (test, eval, or telemetry assertion).
3. **Provenance everywhere** — every artifact records the agent, model,
   prompt, and trace that produced it. See
   [provenance.md](./provenance.md).
4. **Reversible by default** — releases are progressive, gated, and
   auto-rollback on signal regression.
5. **The loop closes** — production telemetry feeds the next planning
   cycle.

## The phases

```
ideate → specify → design → implement → verify → review → release
                                                              │
                                                              ▼
                                                          operate
                                                              │
                                                              ▼
                                                            learn ──┐
                                                              │     │
                                                              └─────┘  (feedback to ideate/specify/rules)
```

Each phase declares: owner agent, inputs, outputs, gates, and exit
conditions. Phases are not strictly linear — `feedback` edges allow
re-entry.

| Phase    | Owner agent | Slash command | Key outputs                  |
|----------|-------------|---------------|------------------------------|
| ideate   | planner     | `/intent`     | `.sdlc/intents/`             |
| specify  | planner     | `/spec`       | `.sdlc/specs/`               |
| design   | architect   | `/adr`        | `.sdlc/decisions/`, `.sdlc/contracts/` |
| implement| implementer | `/implement`  | `app/`, `lib/`               |
| verify   | tester      | `/verify`     | `.sdlc/evals/cases/`, `.sdlc/reports/<run>/` |
| review   | reviewer    | `/review`     | `.sdlc/reviews/<pr>.md`      |
| release  | releaser    | `/release`    | `.sdlc/releases/<version>.md`|
| operate  | operator    | `/incident`   | `.sdlc/incidents/`, `.sdlc/postmortems/` |
| learn    | learner     | `/learn`      | `.sdlc/rules/`, `evals/cases/`, `memories/lessons.md`, new intents |

Full role cards: [agents.md](./agents.md).

## Workflows

`sdlc.yaml.workflows` declares the canonical recipes:

- **new_feature** — `ideate → specify → design → implement → verify → review → release`
- **bugfix** — `specify → implement → verify → review → release` (skip `design` unless `complex`)
- **chore** (docs / refactor / deps) — `implement → verify → review`
- **incident_response** — `operate → specify → implement → verify → review → release → learn` with a 15-minute triage SLA and 60-minute mitigation SLA.

## Gates

A phase cannot exit until its gates pass. Each gate names its runner so
nothing is ambiguous:

| Gate                          | Runner               | What it asserts                                    |
|-------------------------------|----------------------|----------------------------------------------------|
| `intent_clear`                | `agent.reviewer`     | problem, users, measurable success_metric          |
| `spec_testable`               | `agent.reviewer`     | every criterion maps to a test or eval id          |
| `spec_scoped`                 | `static_check`       | < 10 files touched, or split                       |
| `adr_alternatives_considered` | `agent.reviewer`     | ≥ 2 alternatives with trade-offs                   |
| `lint`                        | `shell`              | `npm run lint`                                     |
| `typecheck`                   | `shell`              | `npx tsc --noEmit`                                 |
| `build`                       | `shell`              | `npm run build`                                    |
| `unit_tests_pass`             | `shell`              | `npm test --silent` (tolerate-missing currently)   |
| `acceptance_criteria_met`     | `agent.tester`       | every criterion has a passing assertion or eval    |
| `a11y_baseline`               | `shell`              | `npx @axe-core/cli http://localhost:3000` ≤ serious|
| `visual_no_unintended_diff`   | `agent.tester`       | diffs are explained or rejected                    |
| `review_approved`             | `agent.reviewer`     | no_blockers + conventions_followed + provenance_present |

## Policies (always on)

- **`policies.cost.tier == free_only`** — total monthly budget is $0.
  See [free-tier-policy.md](./free-tier-policy.md).
- **`policies.safety`** — `gitleaks`, no unreviewed dependencies.
- **`policies.privacy`** — no PII in prompts (reviewer-checked for
  planner, implementer, tester).
- **`policies.determinism`** — implementer uses `temperature ≤ 0.2`;
  tester uses fixed seeds for evals.
- **`policies.autonomy`** — approved tasks execute end-to-end, agents
  prefer parallel dispatch, `max_unattended_steps: 24`, and
  agents only pause on the enumerated `pause_on` triggers.

## Observability

Every agent action is traced (`observability.tracing.provider: langsmith`).
Metrics tracked: `agent_runs`, `gate_outcomes`, `cycle_time`,
`rework_rate`, `escape_defects`. See
[observability.md](./observability.md).

## Invariants the lifecycle guarantees

From `sdlc.yaml.invariants`:

- No artifact ships without provenance.
- No phase exits with a failing gate.
- No release proceeds past canary without an SLO check.
- Every incident produces an `eval_case` before being closed.
- `AGENTS.md` rules supersede agent priors when they conflict.
- No integration may require a paid plan; free-tier breach pauses work.
- Every PR carries a Plane issue link, a Vercel preview URL, and an e2e
  video reference.
- `main` is protected; changes land via approved PR only; no bypass.
- Approved tasks execute end-to-end; agents do not re-prompt for
  sub-step approval.
- Releases are agent-driven by default; humans approve only when
  `phase.release.human_required_when` triggers.
