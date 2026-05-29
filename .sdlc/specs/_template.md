---
id: SPEC-XXXX
intent: INT-XXXX
status: draft | todo | in_progress | done | cancelled | blocked
surface: product | operator
complexity: trivial | normal | complex
created_at: YYYY-MM-DDTHH:MM:SSZ
tracker:
  provider: ""
  issues: []
  url: ""
provenance:
  agent_id: planner
  model: ""
  prompt_hash: ""
  trace_id: ""
  inputs_digest: ""
---

# Spec — <short title>

## Summary
One paragraph: what changes, why, and the user-facing outcome.

## Behavior
- Given … When … Then …
- Given … When … Then …

## Acceptance criteria
Each criterion MUST map to a test or eval id. The `verify` phase will not pass
otherwise.

| ID   | Criterion                                | Verifier                                 |
|------|------------------------------------------|------------------------------------------|
| AC-1 | <behavior>                               | tests/e2e/<file>.spec.ts::<test name>    |
| AC-2 | <behavior>                               | .sdlc/evals/<slug>.eval.ts               |

## Risks
- Performance, a11y, security, free-tier quota impact.

## Out of scope
- Things explicitly deferred.
