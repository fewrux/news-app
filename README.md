# news-app

A minimal [Next.js 16](https://nextjs.org) / React 19 news reader
called **The Daily Brief**. The product itself is tiny on purpose — the
project's actual subject of study is the **AI-native software-development
lifecycle** wrapped around it. Humans write *what* and *why*; agents
derive *how*.

## Stack

- Next.js 16 (App Router, Server Components default)
- React 19
- TypeScript 5
- Tailwind CSS v4 (CSS-first config via `@tailwindcss/postcss`)
- Playwright (chromium, firefox, webkit) for e2e
- PostHog (free) for product analytics + sampled session replay
- LangSmith (free) for agent tracing
- Vercel Hobby for deploys
- Plane Cloud Free for project management

All services run on free tiers — `policies.cost.tier == free_only`.

## Quick start

```bash
npm install
cp .env.example .env.local      # fill in your own keys; never commit
npm run dev                     # → http://localhost:3000
```

Quality gates (the ones CI enforces):

```bash
npm run lint
npm run typecheck
npm run build
npm run test:e2e
```

For the full walkthrough see [`docs/getting-started.md`](./docs/getting-started.md).

## Repository layout

```
app/             Next.js App Router (server components default)
lib/             Client wrappers (PostHog)
tests/e2e/       Playwright specs
scripts/         Plane sync (issues + native docs pages)
public/          Static assets
docs/            Human-readable project documentation
.sdlc/           AI-readable contract + artifacts (durable memory)
.cursor/         Operator surface (agents, commands, skills, rules, hooks)
.github/         CI/CD workflows
```

## Documentation

| Doc                                                  | Covers                                          |
|------------------------------------------------------|-------------------------------------------------|
| [docs/](./docs/README.md)                            | Full documentation index                        |
| [docs/architecture.md](./docs/architecture.md)       | Stack, layout, how pieces fit together          |
| [docs/sdlc-overview.md](./docs/sdlc-overview.md)     | The AI-native SDLC contract                     |
| [docs/agents.md](./docs/agents.md)                   | The eight agents and their phases               |
| [docs/slash-commands.md](./docs/slash-commands.md)   | `/intent` through `/learn`                      |
| [docs/branching-and-prs.md](./docs/branching-and-prs.md) | Trunk-based, protected `main`, PR shape     |
| [docs/free-tier-policy.md](./docs/free-tier-policy.md) | The $0/month budget                           |
| [docs/integrations.md](./docs/integrations.md)       | GitHub, Plane, Vercel, PostHog, LangSmith       |
| [docs/deployment.md](./docs/deployment.md)           | Vercel preview + production flow                |
| [docs/testing.md](./docs/testing.md)                 | Playwright + video/trace evidence               |
| [docs/observability.md](./docs/observability.md)     | PostHog + LangSmith                             |
| [docs/provenance.md](./docs/provenance.md)           | Mandatory provenance frontmatter                |
| [docs/glossary.md](./docs/glossary.md)               | Canonical terminology                           |

The `docs/` folder is mirrored to Plane as native pages by
`scripts/plane-sync.mjs sync-docs` (and automatically on every push to
`main`).

## The SDLC, in one paragraph

The contract is [`.sdlc/sdlc.yaml`](./.sdlc/sdlc.yaml). It declares
phases (`ideate → specify → design → implement → verify → review →
release → operate → learn`), gates (lint, typecheck, build, e2e,
a11y, review approval), artifacts (each with mandatory provenance),
policies (free-tier only, no PII in prompts, end-to-end agent autonomy),
and the integrations above. Operators interact via slash commands and
the role cards in [`.cursor/`](./.cursor/INDEX.md). The reviewer agent
must be a distinct identity from the implementer; the releaser agent
drives a progressive rollout (`canary_5pct → canary_25pct → full`) and
escalates to a human only on the narrow `human_required_when` set.

## Contributing

Branching is **trunk-based** with a protected `main`. All changes flow
through a short-lived `feat/*`, `fix/*`, `chore/*`, or `hotfix/*`
branch and merge by approved PR — no admin bypass, no force-push. The
rule is at [`docs/branching-and-prs.md`](./docs/branching-and-prs.md);
the shell hook at `.cursor/hooks/guard-shell.mjs` enforces it
mechanically.

Every PR carries:

- a Plane issue link,
- a Vercel preview URL,
- an e2e video reference,
- a reviewer-agent approval (distinct identity from the implementer).

## License

Not open source. This is a personal sandbox for AI-native SDLC
experimentation. All article content is fictional and exists only for
testing.
