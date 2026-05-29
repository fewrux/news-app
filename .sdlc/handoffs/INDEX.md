# Handoffs

Pending-work queue. The session-start hook
(`.cursor/hooks/load-context.mjs`) injects the `## open` section below
into every new session's banner so any agent — Cursor, Claude Code,
Codex, Aider, Gemini — discovers pending work before its first message.

Maintenance happens through the slash commands that change handoff
state, not by hand:

- `/handoff` appends a new line under `## open` and writes the handoff
  cover sheet at `.sdlc/handoffs/HANDOFF-<date>-<slug>.md`.
- `/implement` flips the line to `## in_progress` on its first commit.
- `/release` (on PR merge) moves the line to `## recently_closed`,
  trimming that section to its last 5 entries.

The SDLC doctor (SPEC-0002) verifies every line here maps to a real
handoff file and that statuses are consistent.

## Entry format

One handoff per line, optimised for AI parsing and human scanning.
Fields are space-separated `key:value` pairs (no quoting needed for
simple values); lists use comma separation; absent values use `-`.

    - <id>  intent:<INT-id>  spec:<SPEC-id>  adrs:<csv|->  tracker:<provider>:<epic|->  created:<ISO-date>

Example:

    - HANDOFF-2026-05-28-sdlc-doctor  intent:INT-0003  spec:SPEC-0002  adrs:ADR-0003  tracker:plane:abc-123  created:2026-05-28

The `tracker:` field is vendor-agnostic per ADR-0002: swap
`sdlc.yaml.integrations.tracker.active_provider` and this file does
not change shape, only the `<provider>` token does.

## open

- HANDOFF-2026-05-28-sdlc-doctor  intent:INT-0003  spec:SPEC-0002  adrs:ADR-0003  tracker:plane:b9a9731b-a904-43e2-94de-06faf629e274  created:2026-05-28

## in_progress

(none)

## recently_closed (last 5)

- HANDOFF-2026-05-28-sdlc-surface-consolidation  intent:INT-0004  spec:SPEC-0003  adrs:ADR-0004  tracker:plane:6b6e6017-9d21-4332-8688-dc235b7180ab  created:2026-05-28
