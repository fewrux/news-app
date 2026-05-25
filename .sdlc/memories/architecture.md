# Architecture memory — pointers, not duplication

> Authoritative architecture lives in **`docs/architecture.md`** (human view)
> and in **`.sdlc/decisions/`** (ADRs — immutable history of *why*).
> This file is the agent's session-time orientation: just enough to act,
> with links to the source of truth.

last_updated: 2026-05-25

## Shape in one paragraph

A Next.js 16 App Router app deployed to Vercel Hobby. Server Components
default; client components opt in with `"use client"` for PostHog hooks
and any interactive UI. Static content (articles) lives in TS modules
under `lib/` — no database. Analytics goes to PostHog (free, sampled
replay). Agent traces go to LangSmith (free). E2E runs in Playwright on
chromium / firefox / webkit with video + trace on first retry. Project
management lives in Plane (free, ≤ 12 seats); `docs/` mirrors to Plane
pages on push to `main`.

## Layout (authoritative: `README.md` § "Repository layout")

```
app/             Next.js App Router (server components default)
lib/             Client wrappers (PostHog) + static data
tests/e2e/       Playwright specs
scripts/         Plane sync (issues + pages)
public/          Static assets
docs/            Human-readable project docs (mirrored to Plane)
.sdlc/           AI-readable contract + artifacts (durable memory)
.cursor/         Operator surface (agents, commands, skills, rules, hooks)
.github/         CI/CD workflows
```

## Locked stack (do not change without an ADR)

See `memories/project.md` § "Stack" for the exact versions. The locking
discipline is in `sdlc.yaml.context.required_reading`: any Next.js
change requires reading `node_modules/next/dist/docs/` first
(`.cursor/skills/nextjs-16-doc-check`).

## Key invariants

- **No database.** Articles are static TS exports. If a feature
  requires persistence, write an ADR.
- **No paid services.** Free tier only — `sdlc.yaml.policies.cost`.
- **No PII in prompts.** Enforced by `.cursor/hooks/scan-secrets.mjs`.
- **No client-side secrets.** PostHog key is the only public token.
- **Server Components by default.** `"use client"` only when needed.

## Where to look

| Question                                  | Look here                                          |
|-------------------------------------------|----------------------------------------------------|
| "Why was X chosen?"                       | `.sdlc/decisions/NNNN-*.md` (ADRs)                 |
| "How does X work today?"                  | `docs/architecture.md`, `docs/integrations.md`     |
| "What's the contract for an agent role?"  | `.cursor/agents/<role>.md` + `sdlc.yaml.roles`     |
| "What checks run in CI?"                  | `.github/workflows/`, `sdlc.yaml.phases.verify`    |
| "What's the deploy story?"                | `docs/deployment.md`, `.github/workflows/deploy*`  |
| "What's the data shape of an Article?"    | `lib/articles.ts` + `memories/glossary.md`         |

## When the architecture changes

- Write the ADR first (`/adr`), update `docs/architecture.md` in the
  same PR, update `memories/project.md` only if a *locked* fact moved.
- Touching versions in `package.json` is an ADR-worthy change.
