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

- **SDLC operational-memory + end-to-end autonomy hardening** — this turn.
  Adds 4 new memory files (`operational-context`, `architecture`,
  `business-rules`, `incidents`) and tightens the autonomy contract so
  agents drive a task across phases until PR merge without re-prompting.
  Touches `commit-conventions.mdc`, `branch-discipline.mdc`,
  `agent-autonomy.mdc`, `sdlc.yaml.policies.autonomy`, the implementer +
  reviewer cards, the `/implement` + `/review` commands, the
  `sessionStart` hook, and `.sdlc/INDEX.md` / `AGENTS.md`. Target branch:
  `chore/sdlc-autonomy-and-memory`.
- **docs → Plane native pages mirror** — uncommitted, waiting for its own
  branch. Adds `docs/` tree (14 files), `scripts/plane-sync.mjs sync-docs`,
  `.github/workflows/docs-sync.yml`, README rewrite. Target branch:
  `chore/docs-plane-mirror`. No spec yet — borderline whether it needs
  one (no user-facing change).
- **Local `main` is diverged from `origin/main`** — local has an
  illegal-under-new-rules direct-to-main commit `56d0528 chore(gitignore)`;
  remote has the trunk-based PR `f39c7ca`. Needs `git reset --hard
  origin/main` after `56d0528` is replayed as a tiny PR. Target branch:
  `chore/gitignore-vercel-env`.

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

- Ship `chore/sdlc-autonomy-and-memory` (this turn's work) end-to-end:
  branch off `origin/main`, commit, push, draft PR, run gates,
  `/verify` → `/review` → `/release` autonomously per the newly-tightened
  `policies.autonomy.phase_handoff`. Plane issue creation gated on
  whether `PLANE_API_TOKEN` is sourced in the executing shell.
- Ship `chore/gitignore-vercel-env` as a one-commit PR replaying `56d0528`
  off `origin/main`. Then reset local `main`.
- Ship `chore/docs-plane-mirror` as its own PR. First exercise of the
  `scripts/plane-sync.mjs sync-docs` path.

## Blocked / waiting (max 3)

- _none_

## Open incidents

See `memories/incidents.md`. Currently: none open.
