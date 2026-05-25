# Slash commands

Slash commands are the canonical entry points to the lifecycle. Each one
maps to a single SDLC phase, conscripts the right agent, enforces the
phase's gates, and writes the artifacts into the correct
`.sdlc/` subfolder.

| Command       | Phase    | Owner agent  | Writes into                                         |
|---------------|----------|--------------|-----------------------------------------------------|
| `/intent`     | ideate   | planner      | `.sdlc/intents/INT-NNNN-<slug>.md`                  |
| `/spec`       | specify  | planner      | `.sdlc/specs/SPEC-NNNN-<slug>.md`                   |
| `/adr`        | design   | architect    | `.sdlc/decisions/NNNN-<slug>.md`                    |
| `/implement`  | implement| implementer  | `app/`, `lib/` (and **never** `.sdlc/`)             |
| `/verify`     | verify   | tester       | `.sdlc/evals/cases/`, `.sdlc/reports/<run_id>/`     |
| `/review`     | review   | reviewer     | `.sdlc/reviews/<pr_id>.md`                          |
| `/release`    | release  | releaser     | `.sdlc/releases/<version>.md`                       |
| `/incident`   | operate  | operator     | `.sdlc/incidents/INC-XXXX.md`                       |
| `/learn`      | learn    | learner      | `.sdlc/rules/`, `evals/cases/`, `memories/lessons.md`, new intents |

Command files live in [`.cursor/commands/`](../.cursor/commands/). Each
file is the prompt the agent runs when you invoke the command.

## The typical loop

```
/intent     (human writes intent in a sentence)
   ↓
/spec       (planner derives a testable spec)
   ↓
/adr        (architect — only when complexity warrants it)
   ↓
/implement  (implementer writes app/ + lib/ changes on a branch)
   ↓
/verify     (tester writes/runs tests, attaches evidence)
   ↓
/review     (reviewer agent — distinct identity from implementer)
   ↓
/release    (releaser promotes through canary → full)
   ↓
/incident   (operator — only when something goes wrong)
   ↓
/learn      (learner mines telemetry + reviews into rule updates)
```

`/learn` feeds back into `/intent` and into `.cursor/rules/`. That's how
the loop closes.

## What `/implement` is *not* allowed to do

- Write into `.sdlc/` (that's planner/architect/learner territory).
- Touch `app/layout.tsx` without an ADR (security surface).
- Push to `main` (branch discipline; the hook blocks it).
- Commit while checked out on `main` (the hook blocks that too).

See [branching-and-prs.md](./branching-and-prs.md) for the full PR
contract every implement/verify cycle must produce.

## Adding a new command

1. Drop the prompt at `.cursor/commands/<name>.md`.
2. Register it in `sdlc.yaml.instructions.commands.registry` with the
   phase it serves.
3. Update [`.cursor/INDEX.md`](../.cursor/INDEX.md).
4. Update this page.
