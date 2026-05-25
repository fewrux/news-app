# AI-Native SDLC — read first

This repo runs an AI-native SDLC. The contract is `.sdlc/sdlc.yaml`; humans write intent, agents execute the lifecycle.

**Start here:**

- `.sdlc/INDEX.md` — durable memory: intents, specs, decisions, reviews, incidents, releases, learnings.
- `.cursor/INDEX.md` — operator surface: agents, slash commands, skills, rules, hooks.
- `.sdlc/memories/project.md` — invariant facts about this project.
- `.sdlc/memories/glossary.md` — canonical terminology you must use verbatim.

> Cursor sessions also get a `sessionStart` hook + always-applied rules from `.cursor/`. Those are conveniences for one specific tool; **the contract is `.sdlc/sdlc.yaml`**. Non-Cursor agents (Claude Code via `CLAUDE.md`, Gemini CLI via `GEMINI.md`, GitHub Copilot Chat via `.github/copilot-instructions.md`, Codex / Aider / others via this file) should rely on `AGENTS.md` and the DSL.

**Hard rules (always apply):**

- Every artifact under `.sdlc/` carries provenance per `sdlc.yaml.artifacts.common_provenance`. Empty fields are OK; fabricating a `trace_id` or `model` is a blocker. See `.cursor/skills/provenance-stamp/`.
- Free tier only across every integration (`.cursor/rules/free-tier-only.mdc`). Anything that would exceed a quota must `pause_and_escalate` to the maintainer.
- A reviewer agent run MUST be distinct from the implementer run for the same change.
- Every PR carries a Plane issue link, a Vercel preview URL, and an e2e video reference.
- **`main` is protected. Trunk-based, PR-only, no bypass.** No `git push` to `main`, no commits while checked out on `main`, no `--admin` PR merges. Work on `feat/*`, `fix/*`, `chore/*`, or `hotfix/*` branches and merge via approved PR. See `.cursor/rules/branch-discipline.mdc`; the `beforeShellExecution` hook enforces this mechanically.
- **Approved tasks execute end-to-end.** Do not re-prompt for confirmation on sub-steps of an approved task; decide batch-vs-split yourself; prefer parallel subagent dispatch for independent work. Pause only on the conditions enumerated in `sdlc.yaml.policies.autonomy.pause_on`. See `.cursor/rules/agent-autonomy.mdc`.
- No `git config --global`, no force-push to any branch, no skipping hooks. The `beforeShellExecution` hook will block these.

**Entry points (use the slash commands — they enforce phases and gates):**

`/intent` → `/spec` → `/adr?` → `/implement` → `/verify` → `/review` → `/release`

Operate / learn loop: `/incident` · `/learn`

<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->
