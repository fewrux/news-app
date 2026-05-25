# Copilot Chat instructions

This repository runs an **AI-native SDLC**. Before suggesting any change:

1. Read `AGENTS.md` at the repo root — the cross-tool agent contract.
2. The single source of truth is `.sdlc/sdlc.yaml`. Every phase, gate, artifact, and policy is declared there.
3. Project memory lives in `.sdlc/memories/{project,lessons,glossary}.md`.

## Hard rules (do not violate)

- **`main` is protected.** Trunk-based, PR-only. Never `git push` to `main`, never `git commit` while checked out on `main`, never `gh pr merge --admin`. Work on short-lived `feat/*`, `fix/*`, `chore/*`, or `hotfix/*` branches.
- **Free tier only** across every integration. See `.cursor/rules/free-tier-only.mdc`.
- **Every artifact under `.sdlc/`** carries the provenance frontmatter declared in `sdlc.yaml.artifacts.common_provenance`. Empty fields are fine; fabricated `model` / `trace_id` is a blocker.
- **Every PR** carries a Plane issue link, a Vercel preview URL, an e2e video reference, and a reviewer-agent approval distinct from the implementer.
- **Read `node_modules/next/dist/docs/`** before writing Next.js 16 code — APIs differ from older versions you may know.

## Slash-command / phase map

`/intent` → `/spec` → `/adr?` → `/implement` → `/verify` → `/review` → `/release`

Operate / learn loop: `/incident` · `/learn`

These commands and the agents that own each phase are declared in `.cursor/agents/` and `.cursor/commands/`. The full role catalogue is in `sdlc.yaml.roles`.
