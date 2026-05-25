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

- **PR #2 — `chore/sdlc-discovery`** ([link](https://github.com/fewrux/news-app/pull/2)).
  Now bundles three streams under one PR (decision per `agent-autonomy.mdc
  § "Batch vs. split"`): (a) SDLC discoverability surface (README, docs/,
  GEMINI.md, copilot-instructions, structure CI guard); (b) operational
  memory (commit `61cb7d0` — 4 new memory files + wiring); (c) end-to-end
  autonomy lockdown (commit `3875dae` — task ends at PR merge, phase
  handoff is autonomous, upstream "ask before commit" default overridden).
  Local gates green (lint/typecheck/build). Reviewer subagent dispatched
  per the new `phase_handoff.chain`. Next stop point: reviewer-agent
  GitHub identity for the actual approval click — that's a genuine
  `pause_on: missing input that cannot be inferred`.
- **PR #3 — `chore/post-docs-sync-learnings`** ([link](https://github.com/fewrux/news-app/pull/3)).
  Stacked on #2. Two commits per `agent-autonomy.mdc § "Batch vs. split"`:
  (a) `chore(autonomy)` surfaces "task = PR merged" on every sessionStart
  via `.cursor/hooks/load-context.mjs` and an AGENTS.md hard-rule rewrite
  — landed because the docs-sync exercise demonstrated the existing rule
  was being missed by agents inheriting the upstream "never commit
  unless asked" Cursor default; (b) `fix(plane-sync)` defensive
  workarounds for four Plane Cloud + Cloudflare quirks (PATCH/DELETE
  405, list endpoint missing `external_id`, Cloudflare WAF bursts on
  Node undici + named entities, self-hosted Community caveat). State
  file `docs/.plane-pages.json` reset from `_zombie_*` debug keys to
  the 9 canonical mappings. Local gates green; reviewer subagent
  pending dispatch.
- **Pre-existing YAML parse error in `.sdlc/sdlc.yaml` lines 619–628**.
  The `artifact.intent -> plane.issue { state: backlog }` pseudo-arrow
  mapping notation isn't valid YAML — verified by stash-testing
  `js-yaml` against pre-edit HEAD. Out of scope for PR #2; needs a
  `fix/sdlc-yaml-plane-mappings` PR that converts the block to a proper
  list-of-mappings.
- **Local `main` is diverged from `origin/main`** — local has an
  illegal-under-new-rules direct-to-main commit `56d0528 chore(gitignore)`;
  remote has the trunk-based PR `f39c7ca`. After PR #2 merges, replay
  `56d0528` as `chore/gitignore-vercel-env` and `git reset --hard
  origin/main` locally.

## Recently completed (max 5, last 14 days)

- **Trunk-based discipline + agent autonomy v1 hardened**
  — PR #1 (`f39c7ca`). Added `.cursor/rules/branch-discipline.mdc`,
  `agent-autonomy.mdc`, and `guard-shell.mjs` enforcement.
- **Vercel CI deploy unblocked** — `e473257`, `91ec09a`, `2ce76ab`.
  Drop `vercel pull`, write `.vercel/project.json` directly, add
  `vercel whoami` diagnostic.
- **Integrations wired** — `1a2fff9`. GitHub Actions, Vercel, PostHog,
  Playwright, Plane all on free tier.
- **Cursor operator surface added** — `ced8509`. Agents, commands,
  skills, rules, hooks.
- **AI-native SDLC contract scaffolded** — `17d5c4f`. `.sdlc/sdlc.yaml`
  + the durable-memory directory.

## Next up (max 3)

- Ship `chore/gitignore-vercel-env` as a one-commit PR replaying `56d0528`
  off `origin/main`. Then reset local `main`.
- After PR #2 + PR #3 merge: kick `.github/workflows/docs-sync.yml` from
  a `workflow_dispatch` so the remaining 5 Plane pages (observability,
  provenance, sdlc-overview, slash-commands, testing) land from GitHub
  runner IPs (fresh Cloudflare state, unblocked).
- Clean up Plane workspace via the UI: delete ~9 zombie + 3 probe
  pages by filtering `external_source = news-app-docs-probe` (the API
  has no DELETE today).

## Blocked / waiting (max 3)

- _none_

## Open incidents

See `memories/incidents.md`. Currently: none open.
