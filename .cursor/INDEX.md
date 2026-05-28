# `.cursor/` — Index

Operator surface that drives the SDLC defined in `.sdlc/sdlc.yaml`.
This folder is split into five concerns: **agents**, **commands**, **skills**,
**rules**, and **hooks** — each declared and registered in
`sdlc.yaml.instructions`.

> If you're new here, start with `.sdlc/INDEX.md`, then come back.

## Map

```
.cursor/
├── INDEX.md             This file
├── hooks.json           Project hook config (schema v1)
├── agents/              Role cards for the 8 SDLC agents
├── commands/            Slash commands, one per SDLC phase
├── skills/              Auto-loaded skills (project-scoped)
├── rules/               Persistent agent guidance (.mdc)
└── hooks/               Hook scripts invoked by hooks.json
```

## Agents — role cards (`.cursor/agents/`)

One card per agent in `sdlc.yaml.roles.agents`. Each declares phases owned,
gates required, tools allowed, and how to invoke it.

| Agent         | Owns phase               | Invoke with               | Model class      |
|---------------|--------------------------|---------------------------|------------------|
| planner       | ideate, specify, handoff | `/intent`, `/spec`, `/handoff` | reasoning_high   |
| architect     | design                   | `/adr`                    | reasoning_high   |
| implementer   | implement                | `/implement`              | coding_fast      |
| tester        | verify                   | `/verify`                 | coding_fast      |
| reviewer      | review                   | `/review`                 | reasoning_high   |
| releaser      | release                  | `/release`                | reasoning_medium |
| operator      | operate                  | `/incident`               | reasoning_medium |
| learner       | learn                    | `/learn`                  | reasoning_high   |
| doctor        | — (meta-checker)         | `/doctor` (SPEC-0002)     | reasoning_high   |

## Commands — slash commands (`.cursor/commands/`)

One per SDLC phase. The command file is the prompt; running it conscripts the
right agent and enforces the phase's gates.

`/intent`, `/spec`, `/adr`, `/handoff`, `/implement`, `/verify`, `/review`,
`/release`, `/incident`, `/learn`

`/doctor` ships with SPEC-0002 (next session, dispatched via the handoff
system from SPEC-0001's PR).

## Skills — auto-loaded knowledge (`.cursor/skills/`)

Loaded by Cursor when their description matches the task.

| Skill                  | When it activates |
|------------------------|-------------------|
| `nextjs-16-doc-check`  | Editing under `app/` or anything Next.js-specific |
| `provenance-stamp`     | Writing or updating any `.sdlc/` artifact |
| `plane-sync`           | Creating or updating Plane issues |
| `posthog-instrument`   | Adding analytics events or session replay |
| `browser-evidence`     | Authoring or running Playwright tests |

## Rules — persistent guidance (`.cursor/rules/`)

| Rule                       | Scope                              | alwaysApply |
|----------------------------|------------------------------------|-------------|
| `sdlc-loop.mdc`            | the whole project                  | yes |
| `provenance.mdc`           | every artifact write               | yes |
| `free-tier-only.mdc`       | every dependency / service choice  | yes |
| `commit-conventions.mdc`   | commits and PRs                    | yes |
| `branch-discipline.mdc`    | trunk-based; `main` is protected   | yes |
| `agent-autonomy.mdc`       | end-to-end execution; parallelize  | yes |
| `nextjs-16-conventions.mdc`| `app/**/*.{ts,tsx}`                | no  |
| `tailwind-v4.mdc`          | `**/*.{tsx,css}`                   | no  |
| `testing-evidence.mdc`     | `tests/**/*.{ts,spec.ts}`          | no  |

## Hooks — runtime guardrails (`.cursor/hooks.json`, `.cursor/hooks/`)

| Event                  | Script                | Behavior |
|------------------------|-----------------------|----------|
| `sessionStart`         | `load-context.mjs`    | Inject SDLC summary + memory pointers + `## open` section of `.sdlc/handoffs/INDEX.md` |
| `beforeSubmitPrompt`   | `scan-secrets.mjs`    | Block prompts containing secrets (failClosed) |
| `beforeShellExecution` | `guard-shell.mjs`     | Deny destructive commands, any push/commit that violates branch discipline; ask for side-effecty ones |
| `afterFileEdit`        | `lint-touch.mjs`      | Append touched paths to `.sdlc/reports/touched.log` |

All four are smoke-tested by piping representative JSON through them; see
script headers for behavior details.

## Where else things live

- **Integrations** (GitHub, Plane, Vercel, PostHog, browser): see
  `sdlc.yaml.integrations` and the per-integration files (`vercel.json`,
  `playwright.config.ts`, `.github/workflows/`, `scripts/plane-sync.mjs`,
  `lib/posthog/`, `instrumentation-client.ts`).
- **Memories** (project facts, lessons, glossary): `.sdlc/memories/`.
  Loaded each session by the `sessionStart` hook and the `sdlc-loop` rule.
- **Human-readable documentation**: [`docs/`](../docs/README.md) at the
  repo root. Mirrored to Plane native pages by
  `scripts/plane-sync.mjs sync-docs` and `.github/workflows/docs-sync.yml`.

## Editing this folder

- New agent? Add the role card here and register it in
  `sdlc.yaml.instructions.agents.registry`.
- New command? Add the file here and register it in
  `sdlc.yaml.instructions.commands.registry`.
- New rule, skill, or hook? Same pattern — registry entries live in
  `sdlc.yaml.instructions`.
- Always update this index when adding a new file in any subfolder.
