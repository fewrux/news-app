---
id: SPEC-0001
intent: INT-0002
status: done
complexity: normal
created_at: 2026-05-28T16:40:00Z
provenance:
  agent_id: planner
  model: claude-opus-4-7-thinking-xhigh
  prompt_hash: 530a7bf5f6907e8f
  trace_id: ""
  inputs_digest: ""
---

# Spec — Cross-session handoff system

## Summary

Ship the cross-session handoff system end-to-end: a new `.sdlc/handoffs/`
artifact directory with a token-optimised `INDEX.md` queue, a `/handoff`
slash command that bundles a session's intent + ADR(s) + spec into a
handoff cover sheet and mirrors it to the active tracker, a session-start
hook extension that surfaces the queue to every new agent run, and a
vendor-agnostic tracker adapter contract (per ADR-0002) so the
integration is configuration not lock-in. The PR's final commit
dogfoods the system against the pre-written SDLC doctor artifacts
(INT-0003, ADR-0003, SPEC-0002), producing the first real handoff
that the next session picks up.

## Behavior

- Given an SDLC session ending with an approved intent + spec (+ optional
  ADRs), When the maintainer invokes `/handoff`, Then the agent writes a
  `.sdlc/handoffs/HANDOFF-<YYYY-MM-DD>-<slug>.md` cover sheet stamped
  with provenance, appends a one-line entry to `.sdlc/handoffs/INDEX.md`
  under `## open`, calls
  `node scripts/plane-sync.mjs create-from-handoff <path>` to mirror the
  bundle to the active tracker as one epic plus N child issues, and
  writes the returned epic + issue ids back into the handoff frontmatter.

- Given a fresh Cursor session opens this repo, When the `sessionStart`
  hook runs, Then the agent's banner contains the literal `## open`
  section of `.sdlc/handoffs/INDEX.md` (or "no open handoffs" if empty),
  preceded by the existing memory pointers and autonomy clauses; the
  agent's first message to the maintainer summarises any open handoffs
  and asks which to pick up before doing anything else.

- Given a handoff is picked up, When the implementer agent runs
  `/implement <spec-path>` against the handoff's linked spec, Then the
  handoff entry in `INDEX.md` is flipped to `status:in_progress` on the
  first commit, and moved from `## open` to `## recently_closed` on PR
  merge by the releaser agent.

- Given the active tracker is swapped from Plane to any other provider
  (Jira, Linear, GitHub Projects, Plane self-hosted), When the
  maintainer updates `sdlc.yaml.integrations.tracker.active_provider`
  and ships a sibling `scripts/<provider>-sync.mjs` honouring the
  subcommand contract, Then no slash command, hook script, handoff
  artifact, or spec needs to change.

- Given a non-Cursor agent (Claude Code, Codex CLI, Aider, Gemini CLI)
  opens the repo, When it follows `AGENTS.md` § "Pending handoffs",
  Then it discovers the same `.sdlc/handoffs/INDEX.md` queue the
  Cursor session-start hook auto-surfaces.

## Acceptance criteria

Each AC names a concrete verifier (a shell command, a smoke-test script,
or a committed artifact whose presence verifies the AC). The repo does
not yet have Playwright coverage for SDLC infrastructure, so verifiers
are mechanical; the SDLC doctor work (SPEC-0002) will later codify
ongoing checks for these.

| ID    | Criterion                                                                                                                                              | Verifier                                                                                                                                                          |
|-------|--------------------------------------------------------------------------------------------------------------------------------------------------------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| AC-1  | `.sdlc/handoffs/` exists with `INDEX.md` and `_template.md`.                                                                                           | `test -f .sdlc/handoffs/INDEX.md && test -f .sdlc/handoffs/_template.md`                                                                                          |
| AC-2  | `.sdlc/handoffs/INDEX.md` has a documented entry-line shape, an `## open` section, and a `## recently_closed (last 5)` section.                        | grep checks for the three markers in the file.                                                                                                                    |
| AC-3  | `.sdlc/handoffs/_template.md` carries the full `common_provenance` block and the four required body sections (context, links, status, plane mirror).   | provenance-stamp skill applied; manual inspection diff vs `.sdlc/intents/_template.md` shape.                                                                     |
| AC-4  | `/handoff` slash command exists at `.cursor/commands/handoff.md` and is registered in `sdlc.yaml.instructions.commands.registry`.                      | `test -f .cursor/commands/handoff.md && rg -q '/handoff' .sdlc/sdlc.yaml`                                                                                         |
| AC-5  | `.cursor/agents/doctor.md` exists with role-card frontmatter compatible with the other 8 cards and `must_be_distinct_from: [implementer, reviewer]`.   | `test -f .cursor/agents/doctor.md && rg -q 'must_be_distinct_from' .cursor/agents/doctor.md`                                                                      |
| AC-6  | `sdlc.yaml.roles.agents` includes `doctor` with `model_class`, `purpose`, `tools`, `writes`, and a constraint that distinguishes it from the reviewer. | `rg -q 'id: doctor' .sdlc/sdlc.yaml`                                                                                                                              |
| AC-7  | `sdlc.yaml.integrations.tracker` exists with `active_provider: plane`, a `providers.plane` block, and an `adapter_contract` enumerating six subcommands.| `rg -q 'tracker:' .sdlc/sdlc.yaml && rg -q 'active_provider: plane' .sdlc/sdlc.yaml && rg -q 'adapter_contract' .sdlc/sdlc.yaml`                                  |
| AC-8  | `sdlc.yaml.artifacts.types.handoff` exists with `location: .sdlc/handoffs/{slug}.md` and provenance reference.                                          | `rg -q 'handoff:' .sdlc/sdlc.yaml`                                                                                                                                |
| AC-9  | `.cursor/hooks/load-context.mjs` extended to inject the `## open` section of `INDEX.md` into the session banner, with a "no open handoffs" fallback.    | `echo '{}' \| node .cursor/hooks/load-context.mjs` returns JSON whose `additional_context` includes either an "Open handoffs" line or "(no open handoffs)".        |
| AC-10 | `scripts/plane-sync.mjs` gains a `create-from-handoff <path>` subcommand that creates one epic + N child issues and writes `tracker.epic` / `tracker.issues` back to the handoff frontmatter. | `node scripts/plane-sync.mjs` (no args) prints the subcommand in its `Available:` list; the dogfood handoff's frontmatter includes the resolved tracker ids.       |
| AC-11 | `AGENTS.md` includes a "Pending handoffs" subsection pointing every harness at `.sdlc/handoffs/INDEX.md`.                                                | `rg -q 'Pending handoffs' AGENTS.md`                                                                                                                              |
| AC-12 | `.sdlc/INDEX.md` and `.cursor/INDEX.md` are updated: the former mentions `handoffs/`; the latter mentions `/handoff` and the `doctor` agent card.       | `rg -q 'handoffs/' .sdlc/INDEX.md && rg -q '/handoff' .cursor/INDEX.md && rg -q 'doctor' .cursor/INDEX.md`                                                        |
| AC-13 | `.sdlc/memories/operational-context.md` is updated: this PR appears in `In progress` (then will move to `Recently completed` on merge per the file's update rules). | manual inspection of the diff to `operational-context.md`.                                                                                                        |
| AC-14 | Dogfood: this PR's final commit creates `.sdlc/handoffs/HANDOFF-2026-05-28-sdlc-doctor.md` via `/handoff`, with a corresponding row under `## open` in `INDEX.md` and a tracker mirror. | `test -f .sdlc/handoffs/HANDOFF-2026-05-28-sdlc-doctor.md && rg -q 'HANDOFF-2026-05-28-sdlc-doctor' .sdlc/handoffs/INDEX.md`                                      |
| AC-15 | `npm run lint`, `npx tsc --noEmit`, and `npm run build` all pass on the feature branch.                                                                | The three commands' exit codes are 0.                                                                                                                             |

## Risks

- **Tracker subcommand contract becomes load-bearing.** Once
  `adapter_contract` is encoded in `sdlc.yaml`, any new SDLC artifact
  type that needs tracker mirroring must extend it — across every
  provider adapter. Today there is only Plane, so the cost is one
  script. Mitigation: keep the contract minimal (six verbs); add a
  verb only when an artifact type demands it; the doctor (SPEC-0002)
  enforces conformance.

- **INDEX.md drift.** If `/handoff`, `/implement`, or `/release` fails
  to update INDEX.md in lockstep with the underlying handoff file,
  the queue diverges from reality. Mitigation: INDEX.md is the source
  the hook reads, so divergence is visible immediately; the doctor
  (SPEC-0002) verifies every `## open` entry maps to a real handoff
  file with the same status.

- **`scripts/plane-sync.mjs` Cloudflare WAF on first dogfood run.**
  The existing skill enumerates known quirks (PATCH-405 on pages,
  rate burst → 403, undici fingerprinting). `create-from-handoff`
  creates ≤ 4 objects (1 epic + up to 3 child issues) per invocation,
  well under the burst threshold; we reuse the `curlWrite` path that
  already handles undici fingerprinting and the throttled write
  delay.

- **`PLANE_*` env not set in this shell.** The dogfood final commit
  requires Plane credentials. If they are not set, the handoff file
  is created locally without the tracker mirror and the commit
  documents the soft-fail. The handoff is still picked up on the
  next session because `INDEX.md` does not require a populated
  `tracker:` block. Mitigation: the `/handoff` command file
  documents this fallback explicitly.

- **Free-tier quota.** Plane Cloud free tier supports ≤ 12 users and
  has no explicit ceiling on issues or modules at the scale this
  project will hit. The handoff system creates at most a handful of
  objects per session; the existing PR-mirroring workflow
  (`.github/workflows/plane-sync.yml`) is the dominant consumer.

## Out of scope

- The SDLC doctor implementation. Designed here (INT-0003, ADR-0003,
  SPEC-0002) and dispatched via the handoff system; implemented in
  the next session.
- Migration of the legacy `plane_issue:` frontmatter field on
  INT-0001 to the new `tracker:` block. Deferred to a follow-up
  chore PR per ADR-0002 § "Negative".
- Tier 1 (scheduled poll) and Tier 2 (webhook dispatch) automation.
  Recorded in ADR-0002 / INT-0002 as the upgrade path; not built
  today.
- A second tracker adapter (Jira, Linear, GitHub Projects). The
  abstraction exists; only the Plane adapter is implemented.
- A `docs/handoffs.md` page mirrored to Plane Pages. The handoff
  system is operator infrastructure rather than product surface;
  a one-line mention is added to `docs/sdlc-overview.md` (if
  present) in a follow-up chore.
