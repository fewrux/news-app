# Provenance

Provenance is **mandatory** on every artifact under `.sdlc/` (with two
exceptions: templates and `.sdlc/reports/`, which are unversioned CI
output). The contract is
`sdlc.yaml.artifacts.common_provenance`; the prose rule is
[`.cursor/rules/provenance.mdc`](../.cursor/rules/provenance.mdc); the
implementation skill is
[`provenance-stamp`](../.cursor/skills/provenance-stamp/SKILL.md).

## The block

Every artifact starts with this frontmatter:

```yaml
---
provenance:
  agent_id: <one of sdlc.yaml.roles.agents[].id>
  model: <concrete model slug>
  prompt_hash: <sha256 of the final prompt that produced this>
  trace_id: <LangSmith run id from LANGCHAIN_PROJECT=news-app>
  inputs_digest: <sha256 of inputs the agent read>
  created_at: <ISO-8601 UTC>
---
```

## Hard rules

1. **No artifact ships without provenance.** This is
   `sdlc.yaml.invariants[0]` — the reviewer agent rejects silent
   omissions during `gate.review_approved`.
2. **Empty is OK; fabricated is a blocker.** If you cannot fill a field
   truthfully (e.g. the run wasn't traced), leave it empty with a note.
   Never make up a `trace_id` or `model` slug. The reviewer phase
   accepts explicit empties; fabrication fails review.
3. **Stamp on creation, not at PR time.** The
   [`provenance-stamp` skill](../.cursor/skills/provenance-stamp/SKILL.md)
   runs at artifact-write time so the block is present from the first
   commit.

## Which artifacts require provenance

From `sdlc.yaml.artifacts.types`:

| Artifact type | Location                              | Provenance? |
|---------------|---------------------------------------|-------------|
| `intent`      | `.sdlc/intents/{slug}.md`             | yes         |
| `spec`        | `.sdlc/specs/{slug}.md`               | yes         |
| `adr`         | `.sdlc/decisions/{NNNN}-{slug}.md`    | yes         |
| `contract`    | `.sdlc/contracts/{slug}.ts`           | implicit (TS) |
| `code`        | `app/** \| lib/** \| components/**`   | yes (commit trailer) |
| `test`        | `tests/** \| __tests__/**`            | yes         |
| `eval`        | `.sdlc/evals/{slug}.eval.ts`          | yes         |
| `report`      | `.sdlc/reports/{run_id}.json`         | n/a (unversioned) |
| `review`      | `.sdlc/reviews/{pr_id}.md`            | yes         |
| `release_note`| `.sdlc/releases/{version}.md`         | yes         |
| `incident`    | `.sdlc/incidents/{id}.md`             | yes         |
| `postmortem`  | `.sdlc/postmortems/{id}.md`           | yes         |
| `rule_update` | `.sdlc/rules/{slug}.md`               | yes         |
| `eval_case`   | `.sdlc/evals/cases/{slug}.json`       | yes         |

`docs/*.md` is intentionally **not** an SDLC artifact — it's
human-friendly explanation that mirrors the contract, not a typed
output of a phase. No provenance frontmatter required (and adding it
would make the Plane sync messier).

## Why it matters

Provenance turns every artefact into an answer to:

- **Who** produced this? (`agent_id`)
- **What** produced it? (`model`)
- **From what?** (`prompt_hash`, `inputs_digest`)
- **When?** (`created_at`)
- **Where can I replay it?** (`trace_id` → LangSmith)

That's the audit trail the lifecycle promises. Without it, the loop
between `learn` and `ideate` is unfalsifiable.

## Gate enforcement

`sdlc.yaml.gates.review_approved.requires` includes
`provenance_present`. A PR with an artifact missing provenance does not
get past `phase.review`.
