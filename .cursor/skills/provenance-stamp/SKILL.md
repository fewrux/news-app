---
name: provenance-stamp
description: Stamps SDLC artifacts with the required provenance frontmatter (agent_id, model, prompt_hash, trace_id, inputs_digest, created_at). Use whenever creating or updating a file under .sdlc/intents, .sdlc/specs, .sdlc/decisions, .sdlc/reviews, .sdlc/incidents, .sdlc/postmortems, .sdlc/releases, or .sdlc/evals/cases.
---

# Provenance stamp

Every artifact under `.sdlc/` must carry the `provenance` block defined in
`sdlc.yaml.artifacts.common_provenance`.

## Required fields

```yaml
provenance:
  agent_id: <one of sdlc.yaml.roles.agents[].id>
  model: <concrete model slug, e.g. "claude-opus-4-7-thinking-xhigh">
  prompt_hash: <sha256 of the final prompt that produced this artifact>
  trace_id: <LangSmith run id; LANGCHAIN_PROJECT=news-app>
  inputs_digest: <sha256 of inputs you read to produce this>
  created_at: <ISO-8601 UTC timestamp>
```

## How to fill each field

- **agent_id** — the role you are acting as (planner, implementer, etc.).
- **model** — the concrete model running this turn. If unknown, leave empty.
- **prompt_hash** — `printf '%s' "<final prompt>" | sha256sum | head -c 16`.
- **trace_id** — copy the LangSmith run id if `TRACE_TO_LANGSMITH=true`.
- **inputs_digest** — `cat <files-you-read> | sha256sum | head -c 16`.
- **created_at** — `date -u +%Y-%m-%dT%H:%M:%SZ`.

## Honesty rule

Empty string `""` is acceptable when a value is genuinely unknown. Fabrication
is a blocker and will fail `gate.review_approved`.
