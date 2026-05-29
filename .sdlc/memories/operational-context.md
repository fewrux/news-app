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

- **SDLC doctor (SPEC-0002)** — `feat/sdlc-doctor`: mechanical checker
  (`scripts/sdlc-doctor.mjs`), baseline, `/doctor` command, skill, advisory
  `ci/doctor` workflow, weekly run + eval cases. Refs: HANDOFF-2026-05-28-sdlc-doctor,
  INT-0003, ADR-0003.

## Recently completed (max 5, last 14 days)

- **SDLC surface consolidation** — PR #8, released as **v0.1.1**
  (`.sdlc/releases/v0.1.1.md`). Made `sdlc.yaml` canonical and trimmed the
  always-applied rule tier: demoted `provenance` / `commit-conventions` /
  `branch-discipline` to glob-scoped or agent-requested (each retains a
  mechanical complement — `gate.review_approved.requires.provenance_present`,
  `guard-shell.mjs`); trimmed `agent-autonomy.mdc` (30 lines) and
  `sdlc-loop.mdc` (20 lines) to thin DSL pointers (override sentence
  verbatim); slimmed `load-context.mjs` to dynamic-only and (SPEC-0003 AC-6
  amended this session) reduced the open-handoffs banner to ids-only + a
  non-optional first-reply directive; de-duplicated the `AGENTS.md`
  sessionStart paragraph. Combined always-applied line count 386 → 78
  (≈80% cut). Deliberately left the `.sh`/`.mjs` hooks-registry drift and
  INT-0001 `plane_issue:` untouched (SPEC-0002 doctor smoke tests).
  Refs: INT-0004, SPEC-0003, ADR-0004.
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
