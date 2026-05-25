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
- **Trunk-based with protected `main`.** Single long-lived branch. All changes flow through a short-lived `feat/*`, `fix/*`, `chore/*`, or `hotfix/*` branch and merge by approved PR. No direct pushes, no admin bypass, no force-push. The contract is in `sdlc.yaml.integrations.github.branch_strategy.protection`; the discipline is enforced by `.cursor/rules/branch-discipline.mdc` and the `beforeShellExecution` hook in `.cursor/hooks/guard-shell.mjs`.
- **End-to-end autonomous execution.** Approved tasks run to completion without re-prompting for sub-step approval. Agents decide batch-vs-split and dispatch independent work in parallel (subagents or batched tool calls). Pauses are limited to the conditions in `sdlc.yaml.policies.autonomy.pause_on`. Enforced by `.cursor/rules/agent-autonomy.mdc`.
- **Releases are agent-driven by default.** The success metric is zero human fingers lifted. `phase.release.human_required: conditional` — the releaser agent approves stage transitions; humans are escalated to only when a `human_required_when` condition fires (security surface, schema migration, `user_data_loss` risk, p0/p1 hotfix, or `release.confidence < 0.7`). The reviewer agent (distinct from the implementer per `reviewer.must_be_distinct_from`) provides `gate.review_approved`.

## Known dashboards (fill in as they're created)
- PostHog dashboard: _set after first deploy_
- Vercel project: _set after first deploy_
- Plane project: _set after workspace is configured_
