# Agents

Eight agents run this project's lifecycle. Each has a role card in
[`.cursor/agents/`](../.cursor/agents/) that declares the phases it owns,
the gates it must pass, the tools it may use, and how it is invoked.

The roster mirrors `sdlc.yaml.roles.agents`.

| Agent         | Owns phase(s)       | Invoke with          | Model class       | Card                                  |
|---------------|---------------------|----------------------|-------------------|---------------------------------------|
| **planner**   | ideate, specify     | `/intent`, `/spec`   | `reasoning_high`  | [planner.md](../.cursor/agents/planner.md) |
| **architect** | design              | `/adr`               | `reasoning_high`  | [architect.md](../.cursor/agents/architect.md) |
| **implementer**| implement          | `/implement`         | `coding_fast`     | [implementer.md](../.cursor/agents/implementer.md) |
| **tester**    | verify              | `/verify`            | `coding_fast`     | [tester.md](../.cursor/agents/tester.md) |
| **reviewer**  | review              | `/review`            | `reasoning_high`  | [reviewer.md](../.cursor/agents/reviewer.md) |
| **releaser**  | release             | `/release`           | `reasoning_medium`| [releaser.md](../.cursor/agents/releaser.md) |
| **operator**  | operate             | `/incident`          | `reasoning_medium`| [operator.md](../.cursor/agents/operator.md) |
| **learner**   | learn               | `/learn`             | `reasoning_high`  | [learner.md](../.cursor/agents/learner.md) |

## Role boundaries (hard rules)

- **Reviewer ≠ implementer.** Enforced by
  `sdlc.yaml.roles.agents.reviewer.constraints.must_be_distinct_from`.
  The reviewer agent's identity for a given PR must differ from the
  implementer's. Same-identity reviews fail `gate.review_approved`.
- **Model class is not a free parameter.** `sdlc.yaml.models.selection_policy`:
  - prefer the cheapest class that meets the task's reasoning need;
  - escalate one class on retry after a failed gate;
  - never use `coding_fast` for security-sensitive review.

## How agents decide

Every agent loads, at session start:

1. `AGENTS.md` (repo-wide hard rules)
2. `.sdlc/sdlc.yaml` (contract)
3. `.sdlc/memories/project.md` (invariant facts)
4. `.sdlc/memories/lessons.md` (learned lessons)
5. `.sdlc/memories/glossary.md` (canonical terms)
6. The `alwaysApply: true` rules in `.cursor/rules/`

Plus the role card for whichever phase they're acting in. The
`sessionStart` hook (`.cursor/hooks/load-context.mjs`) injects pointers
to these files into every new session.

## Autonomy

Per `sdlc.yaml.policies.autonomy` and
[`.cursor/rules/agent-autonomy.mdc`](../.cursor/rules/agent-autonomy.mdc):

- Approved tasks execute **end-to-end**. No re-prompts for sub-step
  approval. Agents decide batch-vs-split themselves.
- **Prefer parallel dispatch** for independent work — subagents or
  batched tool calls.
- `max_unattended_steps: 24`.
- Pause **only** on these triggers (`pause_on`):
  - diff > 400 LOC without spec update
  - any policy violation
  - second consecutive failed gate
  - missing input that cannot be inferred
  - free-tier quota would be breached

## Reviewer agent — human escalation

The reviewer agent autonomously approves PRs that pass
`gate.review_approved`. It **escalates to a human** when any of these
fire (`phase.review.human_required_when`):

- `diff.touches('app/layout.tsx')`
- `diff.touches_security_surface == true`
- `review.confidence < 0.8`

The agent's approval does *not* waive the escalation; the maintainer
must acknowledge before merge.

## Releaser agent — human escalation

Same shape, different triggers (`phase.release.human_required_when`):

- `diff.touches_security_surface == true`
- `diff.includes_schema_migration == true`
- `spec.risks.includes('user_data_loss')`
- `release.kind == hotfix AND prior_incident.severity in [p0, p1]`
- `release.confidence < 0.7`

Default approver for stage transitions is the releaser agent itself
(`default_approval: agent`); the `product_owner` is escalated to only
when a trigger fires. The success metric is "zero human fingers lifted".
