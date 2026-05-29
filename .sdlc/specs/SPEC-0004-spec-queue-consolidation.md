---
id: SPEC-0004
intent: INT-0005
status: todo
complexity: complex
created_at: 2026-05-28T20:05:00Z
tracker:
  provider: ""
  issues: []
  url: ""
provenance:
  agent_id: planner
  model: claude-sonnet-4-6
  prompt_hash: 8bb2eb9b4241f322
  trace_id: ""
  inputs_digest: ""
---

# Spec — Spec-queue consolidation (remove handoffs; Plane-aligned status)

## Summary

Replace the handoff system (SPEC-0001) with a **spec-keyed queue** embedded in
`.sdlc/memories/operational-context.md` and a **unified spec `status`** enum aligned
with Plane issue states. Remove `.sdlc/handoffs/`, `/handoff`, and duplicate
operational-context sections. Add `scripts/ops-context.mjs` for queue CRUD and extend
`scripts/plane-sync.mjs` with `create-from-spec` and `set-status`. Wire `/spec`,
`/implement`, `/release`, and `load-context.mjs` to keep **spec frontmatter**,
**operational-context lines**, and **Plane** in sync on every transition.

Supersedes the queue mechanics of SPEC-0001 (handoff artifact remains historical;
this spec removes it from the live contract).

## Behavior

### Spec status enum (source of truth)

Spec frontmatter `status` MUST be one of:

| Status | operational-context | Plane (via adapter) |
|--------|---------------------|---------------------|
| `draft` | not listed | no transition |
| `todo` | `## todo (max 10)` | Todo |
| `in_progress` | `## in_progress (max 10)` | In progress |
| `done` | not listed | Done |
| `cancelled` | not listed | Cancelled |
| `blocked` | not listed | Blocked |

Also add `tracker:` block on spec template (provider, issues[], url).

### operational-context shape

Replace entire body structure with:

```markdown
## todo (max 10)
- SPEC-NNNN  intent:INT-NNNN  adrs:ADR-0004|-  tracker:plane:<issue-id>  since:YYYY-MM-DD

## in_progress (max 10)
- SPEC-NNNN  intent:INT-NNNN  adrs:...  tracker:plane:<id>  since:...  pr:N
```

- Machine lines only in these sections (no prose bullets).
- Remove: `In progress`, `Recently completed`, `Next up`, `Blocked / waiting`, `Open incidents` section (incidents stay in `memories/incidents.md` only).
- Header documents: only `/spec`, `/implement`, `/release` (and explicit block/cancel) move queue lines; caps 10 each.

### `/spec` command (update `.cursor/commands/spec.md`)

When spec writing completes:

1. Set `status: todo` (from `draft`).
2. Run `node scripts/ops-context.mjs add-open <spec-path> [--adrs ADR-0001,...]`.
3. Run `node scripts/plane-sync.mjs create-from-spec <spec-path>` (soft-fail if env missing; write `tracker_mirrored: waived` comment in spec if needed per ADR-0002 pattern).
4. Upsert is idempotent — re-running must not duplicate lines.

### `/implement` command

On first commit (with branch + draft PR):

1. Set spec `status: in_progress`.
2. Run `node scripts/ops-context.mjs to-in-progress <spec-path> [--pr N]`.
3. Run `node scripts/plane-sync.mjs set-status <spec-path> in_progress`.

### `/release` command

On PR merge / release note:

1. Set spec `status: done`.
2. Run `node scripts/ops-context.mjs remove <spec-path>`.
3. Run `node scripts/plane-sync.mjs set-status <spec-path> done`.

Document block/cancel: set `status: blocked` or `cancelled`, `ops-context remove`, `set-status` matching.

### `scripts/ops-context.mjs` (new)

Subcommands (minimum):

- `list todo|in_progress` — print spec ids
- `list-blocked` — scan `.sdlc/specs/*.md` for `status: blocked`
- `add-open <spec-path> [--adrs csv|-]`
- `to-in-progress <spec-path> [--pr N]`
- `remove <spec-path>`

Enforce caps (10 per section). Update `last_updated` / `updated_by` on write.

### `scripts/plane-sync.mjs` (extend)

Add adapter contract verbs:

- **`create-from-spec <path>`** — create Plane issue (labels: spec), write `tracker.issues[0]` on spec; state Todo.
- **`set-status <path> <todo|in_progress|done|cancelled|blocked>`** — PATCH linked issue via state lookup.

Keep `create-from-handoff` removed or deprecated with clear error pointing to `create-from-spec`.

Resolve Plane state IDs by name from project states API.

### `load-context.mjs`

- Read `## todo` and `## in_progress` from operational-context (spec ids only in banner).
- Run or inline `list-blocked` for blocked specs.
- Replace handoff directive with: list todo spec ids; ask maintainer which to `/implement`.
- Do not read `.sdlc/handoffs/`.

### `sdlc.yaml` changes

- Remove `phase: handoff`, `artifact.handoff`, gates `handoff_bundle_complete`, `/handoff` command registry entry.
- Update `gate.tracker_mirrored` → **`gate.spec_tracker_mirrored`**: spec at `status: todo` has `tracker.issues[0]` OR waiver note.
- Remove `artifact.handoff` Plane mapping; keep `artifact.spec → plane.issue todo`.
- Update `planner` agent owns: drop `handoff`.
- Update tracker `adapter_contract.subcommands`: replace `create-from-handoff` with `create-from-spec` + `set-status`.
- Add `memory.status-sync` to doctor checks list in SPEC-0002 reference or implement in doctor script if present.

### Migration (this repo)

- Delete `.sdlc/handoffs/` (INDEX, templates, HANDOFF-*.md).
- Delete `.cursor/commands/handoff.md`.
- Rewrite `.sdlc/memories/operational-context.md` to new shape (empty todo/in_progress or migrate any truly pending spec — SPEC-0001/2/3 → `status: done`).
- Update existing specs' `status` to `done` where shipped; new template uses new enum.
- Update `AGENTS.md`, `.cursor/INDEX.md`, `.sdlc/INDEX.md`, `.sdlc/baseline.yaml`, `.cursor/agents/planner.md`, plane-sync skill if exists.

### ADR

Write **ADR-0005** (short): supersede handoff queue + `create-from-handoff` with spec-status queue + `create-from-spec`/`set-status`; reference ADR-0002 adapter contract amendment.

## Acceptance criteria

| ID   | Criterion | Verifier |
|------|-----------|----------|
| AC-1 | `.sdlc/handoffs/` does not exist; `test ! -d .sdlc/handoffs` | shell |
| AC-2 | `test ! -f .cursor/commands/handoff.md` && `! rg -q '/handoff' .sdlc/sdlc.yaml` (except historical refs in comments ok if zero — prefer none in registry) | shell |
| AC-3 | `operational-context.md` has exactly `## todo (max 10)` and `## in_progress (max 10)` as queue sections; no `Recently completed`, `Next up`, or `handoff` refs in update rules | grep / inspection |
| AC-4 | `.sdlc/specs/_template.md` documents `status: draft \| todo \| in_progress \| done \| cancelled \| blocked` and `tracker:` block | inspection |
| AC-5 | `scripts/ops-context.mjs` exists; `node scripts/ops-context.mjs list todo` exits 0 | shell |
| AC-6 | `plane-sync.mjs --help` or dispatch lists `create-from-spec` and `set-status`; `create-from-handoff` absent or exits with migration message | shell |
| AC-7 | `.cursor/commands/spec.md`, `implement.md`, `release.md` document ops-context + plane-sync steps | inspection |
| AC-8 | `load-context.mjs` reads todo/in_progress from operational-context, not handoffs | read + smoke: pipe sessionStart JSON |
| AC-9 | `AGENTS.md` entry points drop `/handoff`; pending work points at operational-context + spec status | inspection |
| AC-10 | ADR-0005 exists and records decision | `test -f .sdlc/decisions/0005-spec-queue-consolidation.md` |
| AC-11 | SPEC-0001, SPEC-0002, SPEC-0003 frontmatter `status: done` | inspection |
| AC-12 | `npm run lint`, `npx tsc --noEmit`, `npm run build` pass | shell exit 0 |
| AC-13 | If `scripts/sdlc-doctor.mjs` exists, replace `artifact.handoff-index-sync` with `memory.status-sync` check (or add stub check); doctor runs without crash | shell |

## Risks

- **Plane state name mismatch** — state lookup must map lowercase spec status to Plane group names case-insensitively.
- **Triple-write drift** — mitigated by scripting all transitions; doctor `memory.status-sync`.
- **Large diff** — many operator-surface files; single focused PR with ADR-0005.

## Out of scope

- Changing review-gate or CI workflows unrelated to handoffs.
- Migrating Plane modules created by old handoffs (leave as-is).
- Product features under `app/`.
