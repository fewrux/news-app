# news-app — documentation

Welcome. This folder is the **human-readable** companion to `.sdlc/` (the
AI-readable contract). If you only have five minutes, read this file plus
[`architecture.md`](./architecture.md).

## What this project is

A minimal Next.js 16 / React 19 news reader called **The Daily Brief**, used
as a sandbox for practicing an **AI-native software-development lifecycle**:
humans write *what* and *why*; agents derive *how*. The product is
deliberately tiny so the lifecycle around it stays in focus.

## How to read these docs

| Doc                                          | What it covers                                                |
|----------------------------------------------|---------------------------------------------------------------|
| [getting-started.md](./getting-started.md)   | Local dev setup, scripts, env scaffolding                     |
| [architecture.md](./architecture.md)         | Stack, top-level layout, how pieces fit together              |
| [sdlc-overview.md](./sdlc-overview.md)       | The AI-native SDLC contract and lifecycle                     |
| [agents.md](./agents.md)                     | The eight agents, their phases, and how they're invoked       |
| [slash-commands.md](./slash-commands.md)     | Slash-command catalogue (`/intent` … `/learn`)                |
| [branching-and-prs.md](./branching-and-prs.md) | Trunk-based discipline, commit conventions, PR shape        |
| [free-tier-policy.md](./free-tier-policy.md) | The `$0/month` budget and how quotas are enforced             |
| [integrations.md](./integrations.md)         | GitHub, Plane, Vercel, PostHog, LangSmith, Playwright wiring  |
| [deployment.md](./deployment.md)             | Vercel preview + production deploy flow                       |
| [testing.md](./testing.md)                   | Playwright e2e tests, video + trace evidence                  |
| [observability.md](./observability.md)       | PostHog (product + replay), LangSmith (agent tracing)         |
| [provenance.md](./provenance.md)             | Mandatory provenance frontmatter on SDLC artifacts            |
| [glossary.md](./glossary.md)                 | Canonical terminology (use these terms verbatim)              |

## Where the source of truth lives

- **Contract**: [`.sdlc/sdlc.yaml`](../.sdlc/sdlc.yaml) — the DSL that
  declares phases, gates, artifacts, policies, and integrations.
- **Project memory**: [`.sdlc/memories/`](../.sdlc/memories/) — invariant
  facts, learned lessons, glossary, reloaded each session.
- **Operator surface**: [`.cursor/`](../.cursor/) — agents, slash commands,
  skills, rules, hooks.

Anything in `docs/` is an explanation of the contract; the contract itself
wins on conflict.

## Plane sync

Every Markdown file in this folder is mirrored to Plane as a native
**Page** by `scripts/plane-sync.mjs sync-docs` (and automatically on every
push to `main` by `.github/workflows/docs-sync.yml`). See
[integrations.md](./integrations.md#plane-pages-sync) for details.
