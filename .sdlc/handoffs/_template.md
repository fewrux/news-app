---
id: HANDOFF-YYYY-MM-DD-slug
slug: short-kebab-slug
status: open
created_at: YYYY-MM-DDTHH:MM:SSZ
intent: INT-XXXX
spec: SPEC-XXXX
adrs: []                       # optional, e.g. [ADR-0003] or [ADR-0002, ADR-0003]
tracker:
  provider: ""                 # set to active_provider on /handoff success
  epic: ""                     # provider-native id; written back by adapter script
  issues: []                   # provider-native ids; written back by adapter script
  url: ""                      # provider-native deep link; optional
provenance:
  agent_id: planner
  model: ""
  prompt_hash: ""
  trace_id: ""
  inputs_digest: ""
originating_session:
  transcript: ""               # agent-transcripts/<uuid>
  title: ""                    # chat title
---

# Handoff — <short title from the originating session>

## Context (≤ 10 lines)

What was decided in the session, in just enough detail that an agent
opening this file in a different session — possibly a different tool —
can pick the work up without reading the originating transcript. Cite
the turn where the maintainer's approval was given.

## Links

- Intent:    `.sdlc/intents/INT-XXXX-<slug>.md`
- Spec:      `.sdlc/specs/SPEC-XXXX-<slug>.md`
- ADR(s):    `.sdlc/decisions/NNNN-<slug>.md` (one bullet per ADR)

## How to pick this up

1. `/implement .sdlc/specs/SPEC-XXXX-<slug>.md`
2. The implementer agent runs end-to-end through verify → review →
   release per `.cursor/rules/agent-autonomy.mdc`. **Do not stop at
   phase boundaries; task = PR merged.**
3. On first commit, the agent flips this handoff's `status:` to
   `in_progress` and moves the corresponding line in
   `.sdlc/handoffs/INDEX.md` from `## open` to `## in_progress`.
4. On PR merge, `/release` sets `status: merged` and moves the line
   to `## recently_closed (last 5)` in `INDEX.md`.

## Tracker mirror

The active tracker provider is declared at
`sdlc.yaml.integrations.tracker.active_provider`. `/handoff` calls
that provider's adapter script (`create-from-handoff`) and writes the
returned ids back into the `tracker:` frontmatter block above.

If the env vars for the adapter were not set when `/handoff` ran, the
`tracker:` block stays empty and a `tracker_mirrored: waived` field
appears here documenting the soft-fail. The maintainer can re-run
`node scripts/<provider>-sync.mjs create-from-handoff <path>` later
to populate the mirror.
