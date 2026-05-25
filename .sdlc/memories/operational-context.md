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

last_updated: 2026-05-25
updated_by: implementer

## In progress (max 5)

- _none_

## Recently completed (max 5, last 14 days)

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
- **Vercel CI deploy unblocked** — `e473257`/`91ec09a`/`2ce76ab`.

## Next up (max 3)

- Kick `.github/workflows/docs-sync.yml` via `workflow_dispatch` to land
  the remaining 5 Plane pages (observability, provenance, sdlc-overview,
  slash-commands, testing) from a GitHub runner IP (fresh Cloudflare state).
- Clean up Plane workspace via the UI: delete ~9 zombie + 3 probe pages
  by filtering `external_source = news-app-docs-probe`.
- Ship `fix/sdlc-yaml-plane-mappings`: the `artifact.intent -> plane.issue`
  pseudo-arrow notation in `sdlc.yaml` lines ~619-628 is not valid YAML;
  convert to a proper list-of-mappings.

## Blocked / waiting (max 3)

- _none_

## Open incidents

See `memories/incidents.md`. Currently: none open.
