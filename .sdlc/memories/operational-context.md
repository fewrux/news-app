# Operational context — what's happening right now

> **Rolling snapshot, not a history log.** Hard caps per section below.
> The `learner` phase prunes this file. Older items either move to
> `memories/lessons.md` (durable lesson), `incidents.md` (incident digest),
> or are dropped entirely.
>
> **Update rules**
> - Every task that opens a PR adds/updates a bullet in `In progress`.
> - On merge, the bullet moves to `Recently completed` and the oldest one
>   gets evicted if the section is over cap.
> - "Recently completed" is bounded by time *and* count — whichever is tighter.
> - If you need to write more than a sentence, link out to the artifact
>   (`SPEC-NNNN`, `INC-NNNN`, PR #, `.sdlc/...` path). Do **not** inline
>   the detail here.

last_updated: 2026-05-28
updated_by: implementer

## In progress (max 5)

- **SDLC surface consolidation** — implementing on PR #8
  (`chore/sdlc-surface-consolidation`). Demotes `provenance` /
  `commit-conventions` / `branch-discipline` from always-applied to
  glob-scoped or agent-requested (each has a mechanical complement:
  `gate.review_approved.requires.provenance_present` for provenance,
  `guard-shell.mjs` for branch discipline). Trims `agent-autonomy.mdc`
  (≤30) and `sdlc-loop.mdc` (≤20) to thin pointers into the DSL
  (autonomy override sentence preserved verbatim). Slims
  `load-context.mjs` to dynamic-only; **SPEC-0003 AC-6 amended this
  session** to also slim the open-handoffs queue to ids-only and emit a
  non-optional first-reply directive. Removes the duplicate paragraph in
  `AGENTS.md`. Deliberately does **not** touch the `.sh`/`.mjs` drift in
  `sdlc.yaml.instructions.hooks.registry` or the legacy `plane_issue:`
  field on INT-0001 — both are SPEC-0002 AC-11 smoke tests for the
  doctor's first run.
  Refs: INT-0004, SPEC-0003, ADR-0004, PR #8,
  HANDOFF-2026-05-28-sdlc-surface-consolidation.

## Recently completed (max 5, last 14 days)

- **Handoff system + doctor design (dogfood doctor via /handoff)** — PR #7,
  released as **v0.1.0** (`.sdlc/releases/v0.1.0.md`). Shipped the
  cross-session handoff system end-to-end (artifact type, INDEX.md queue,
  `/handoff` command, doctor identity card, load-context hook extension,
  vendor-agnostic tracker adapter contract); pre-wrote the doctor's INT-0003
  + ADR-0003 + SPEC-0002; dogfood handoff
  `HANDOFF-2026-05-28-sdlc-doctor` filed and **remains open** for the next
  session to pick up. Bundled YAML fix:
  `integrations.plane.mappings` pseudo-arrow notation now valid YAML.
  Refs: SPEC-0001, SPEC-0002, ADR-0002, ADR-0003.
- **Review-gate rules relaxed** — PR #5 (`4f43dbf`). `require_review_approved`
  set to `false` (no GitHub-identity click needed; reviewer-agent verdict
  file is authoritative). Security-surface escalation narrowed to
  `guard-shell.mjs` only; informational hooks excluded.
- **Autonomy amplifier + plane-sync Cloudflare workaround** — PR #3 (`6da62d5`).
  sessionStart hook now surfaces "task = PR merged" on every session;
  `scripts/plane-sync.mjs` hardened against Plane Cloud PATCH/DELETE 405,
  missing `external_id`, WAF bursts, and Node undici fingerprinting.
- **SDLC discoverability + operational memory + autonomy lockdown** — PR #2.
  docs/, README, GEMINI.md, copilot-instructions, structure CI guard;
  4 new memory files; phase-handoff chain declared autonomous end-to-end.
- **Trunk-based discipline + agent autonomy v1 hardened**
  — PR #1 (`f39c7ca`). Added `branch-discipline.mdc`, `agent-autonomy.mdc`,
  `guard-shell.mjs` enforcement.

## Next up (max 3)

- **Implement SPEC-0002 (SDLC doctor)** via the handoff dispatched in PR #7:
  ` scripts/sdlc-doctor.mjs` mechanical layer, `.cursor/commands/doctor.md`,
  `.cursor/skills/sdlc-doctor/SKILL.md`, `.github/workflows/doctor.yml`
  (advisory), and the agentic layer in `.cursor/agents/doctor.md`'s
  behavior block. See HANDOFF-2026-05-28-sdlc-doctor for context.
- Kick `.github/workflows/docs-sync.yml` via `workflow_dispatch` to land
  the remaining 5 Plane pages (observability, provenance, sdlc-overview,
  slash-commands, testing) from a GitHub runner IP (fresh Cloudflare state).
- Clean up Plane workspace via the UI: delete ~9 zombie + 3 probe pages
  by filtering `external_source = news-app-docs-probe`.

## Blocked / waiting (max 3)

- _none_

## Open incidents

See `memories/incidents.md`. Currently: none open.
