# Project memory — invariant facts about news-app

> Read first; everything below is true unless an ADR supersedes it.

## Identity
- **Name**: news-app (codename: the-daily-brief)
- **Repo**: `C:/Users/felip/Integritas/AIH/news-app`
- **Domain**: minimal news reader, used as an AI-native SDLC sandbox

## Stack (locked unless an ADR changes it)
- Next.js **16.2.6** (App Router, Server Components default)
- React **19.2.4**
- TypeScript **^5**
- Tailwind CSS **v4** via `@tailwindcss/postcss` (CSS-first config)
- Node target: whatever ships with Next.js 16

## Hosting & ops
- **Deployment**: Vercel Hobby (free)
- **Project management**: Plane (free tier)
- **Observability**: PostHog free + LangSmith free
- **CI**: GitHub Actions (free quotas)
- **E2E**: Playwright with video/trace on first retry

## Source of truth
- The DSL: `.sdlc/sdlc.yaml`
- Agent rules: `AGENTS.md` and `.cursor/rules/`
- Memories (this file + `lessons.md`, `glossary.md`)

## Hard constraints
- Free tier only — see `.cursor/rules/free-tier-only.mdc`.
- Read `node_modules/next/dist/docs/` before writing Next.js code.
- Every artifact under `.sdlc/` carries provenance.
- Every PR carries: a Plane issue link, a Vercel preview URL, an e2e video reference.

## Known dashboards (fill in as they're created)
- PostHog dashboard: _set after first deploy_
- Vercel project: _set after first deploy_
- Plane project: _set after workspace is configured_
