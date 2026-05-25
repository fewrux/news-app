# Architecture

A one-page tour of how the pieces fit together.

## Product

**The Daily Brief** — a single-page news reader. Articles are static
seed data in `app/page.tsx` for now. The product surface is intentionally
small; the interesting surface area is the SDLC around it.

## Stack (locked unless an ADR changes it)

| Concern           | Choice                                                 |
|-------------------|--------------------------------------------------------|
| Framework         | **Next.js 16.2.6** (App Router, Server Components default) |
| UI                | **React 19.2.4**                                       |
| Language          | **TypeScript ^5**                                      |
| Styling           | **Tailwind CSS v4** via `@tailwindcss/postcss` (CSS-first config) |
| Runtime           | Node (whatever ships with Next.js 16)                  |
| Deployment        | **Vercel Hobby** (free)                                |
| E2E tests         | **Playwright 1.60** (chromium, firefox, webkit)        |
| Product analytics | **PostHog** (free tier, autocapture + replay sampled at 0.1) |
| Agent tracing     | **LangSmith** (free, project = `news-app`)             |
| Project mgmt      | **Plane** (free cloud tier)                            |

This list is mirrored in [`.sdlc/memories/project.md`](../.sdlc/memories/project.md)
and `sdlc.yaml.project.stack`.

## Repository layout

```
news-app/
├── app/                    Next.js App Router (server components default)
│   ├── _components/        Local (private) components per route
│   ├── layout.tsx          Root layout
│   ├── page.tsx            Home — featured + article list
│   └── globals.css         Tailwind v4 entry
├── lib/
│   └── posthog/            Client-side capture wrapper
├── instrumentation-client.ts   Next.js client instrumentation hook
├── tests/e2e/              Playwright specs (home, smoke)
├── public/                 Static assets
├── scripts/
│   └── plane-sync.mjs      Plane REST wrapper (issues, pages, github events)
├── .github/workflows/      CI/CD: ci, preview, deploy-prod, plane-sync, e2e-evidence
├── docs/                   Human-readable documentation (mirrored to Plane)
├── .sdlc/                  AI-readable contract + artifacts (durable memory)
└── .cursor/                Operator surface (agents, commands, skills, rules, hooks)
```

`./.next/`, `./node_modules/`, `./.vercel/`, and `./.sdlc/reports/*` are
ignored or unversioned.

## Two parallel surfaces

The repo runs on **two source-of-truth surfaces** that cross-reference
each other:

### `.sdlc/` — the contract & memory (machine-first)

- [`sdlc.yaml`](../.sdlc/sdlc.yaml) — the DSL. Phases, gates, artifacts,
  policies, integrations. Everything else here is an artifact produced or
  consumed by a phase declared in this file.
- `memories/` — project facts, learned lessons, glossary. Reloaded each
  session by the `sessionStart` hook.
- `intents/`, `specs/`, `decisions/`, `reviews/`, `releases/`,
  `incidents/`, `postmortems/`, `contracts/`, `evals/cases/`, `rules/` —
  typed artifacts, each with mandatory provenance frontmatter (see
  [provenance.md](./provenance.md)).
- `reports/` — CI run output (videos, traces, JSON). Not versioned.

See [sdlc-overview.md](./sdlc-overview.md) for the lifecycle.

### `.cursor/` — the operator surface (Cursor-IDE-first)

- `agents/` — eight role cards mirroring `sdlc.yaml.roles.agents`.
- `commands/` — slash commands, one per SDLC phase.
- `skills/` — auto-loaded knowledge (Next.js docs check, provenance
  stamp, Plane sync, PostHog instrumentation, browser evidence).
- `rules/` — persistent agent guidance (`.mdc`). `alwaysApply: true`
  rules: `sdlc-loop`, `provenance`, `free-tier-only`,
  `commit-conventions`, `branch-discipline`, `agent-autonomy`.
- `hooks/` — runtime guardrails registered in `hooks.json` (sessionStart,
  beforeSubmitPrompt, beforeShellExecution, afterFileEdit).

See [`.cursor/INDEX.md`](../.cursor/INDEX.md) for the full operator map.

## Data flow (request → render)

1. **Edge**: Vercel CDN serves the Next.js build.
2. **Server**: `app/page.tsx` is a Server Component that renders static
   seed articles. No DB call today; the surface intentionally lacks I/O.
3. **Client**: `instrumentation-client.ts` initialises PostHog
   (autocapture + sampled session replay).
4. **Telemetry**: PostHog ingests events and replay frames; LangSmith
   ingests agent traces when `TRACE_TO_LANGSMITH=true`.

## Build & deploy pipeline (happy path)

```
push to feature branch
      │
      ▼
GitHub Actions (.github/workflows/)
      ├─ ci.yml          lint · typecheck · build · unit/e2e
      ├─ preview.yml     vercel deploy --target preview → URL
      ├─ e2e-evidence.yml video + trace → uploaded as artefact
      └─ plane-sync.yml  mirror PR / issue to Plane
      │
      ▼
PR review by reviewer agent  (distinct from implementer)
      │
      ▼  squash-merge to main (only after approval + CI green)
      │
      ▼
deploy-prod.yml  →  vercel deploy --prod  →  https://news-app.vercel.app
```

See [deployment.md](./deployment.md) for the deploy specifics and
[branching-and-prs.md](./branching-and-prs.md) for the PR shape.

## Why so much ceremony?

Because the product itself is trivial — the *lifecycle* is the artefact
under study. Every guardrail you see is the project's hypothesis about
what makes an AI-native SDLC safe to run on autopilot.
