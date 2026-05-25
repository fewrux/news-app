# Getting started

This project runs on Node + Next.js 16. Local setup is intentionally
boring; everything interesting happens in `.sdlc/` and `.cursor/`.

## Prerequisites

- **Node**: whatever ships with Next.js 16 (Node 20+ recommended).
- **npm**: bundled with Node.
- **Git**: 2.30+ for sane worktree behaviour.
- Optional: the **Vercel CLI** if you want to test deploys locally, and
  the **gh** CLI for PR work.

## Install

```bash
npm install
```

`postinstall` is a no-op; the install is purely npm deps. Playwright
browsers are installed on demand by the e2e workflow — locally, run
`npx playwright install` once if you plan to run tests.

## Environment

Copy the template and fill in real values:

```bash
cp .env.example .env.local
```

`.env*` files (except `.env.example`) are gitignored. Real secrets live
only in:

- your local `.env.local` (never committed), and
- GitHub Actions Secrets (for CI / deploy).

See [integrations.md](./integrations.md) for what each variable does. The
short list:

| Variable                       | Used by                          |
|--------------------------------|----------------------------------|
| `NEXT_PUBLIC_POSTHOG_KEY`      | PostHog client capture           |
| `NEXT_PUBLIC_POSTHOG_HOST`     | PostHog ingest host              |
| `POSTHOG_PERSONAL_API_KEY`     | Server-side PostHog reads        |
| `VERCEL_TOKEN` / `VERCEL_ORG_ID` / `VERCEL_PROJECT_ID` | CI deploy |
| `PLANE_API_BASE` / `PLANE_API_TOKEN` / `PLANE_WORKSPACE_SLUG` / `PLANE_PROJECT_ID` | `scripts/plane-sync.mjs` |
| `LANGCHAIN_API_KEY` / `LANGCHAIN_PROJECT` / `TRACE_TO_LANGSMITH` | Agent tracing |

## Run the app

```bash
npm run dev          # next dev — http://localhost:3000
npm run build        # next build
npm start            # next start (after build)
```

## Quality gates (the ones CI enforces)

```bash
npm run lint         # eslint
npm run typecheck    # tsc --noEmit
npm run build        # next build
npm run test:e2e     # playwright test (chromium/firefox/webkit)
```

These map 1:1 to `sdlc.yaml.gates.{lint,typecheck,build,unit_tests_pass}`.
A PR cannot merge unless they all pass — see
[branching-and-prs.md](./branching-and-prs.md).

## Plane sync

```bash
npm run plane:sync sync-docs
```

Mirrors every file under `docs/` to Plane as a native page. Idempotent:
existing pages are updated in place via Plane's `external_id` field.

## What to read next

- [architecture.md](./architecture.md) for the lay of the land.
- [sdlc-overview.md](./sdlc-overview.md) for the lifecycle you'll be
  operating in.
- [`AGENTS.md`](../AGENTS.md) — the agent rule set at the repo root.
