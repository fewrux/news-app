---
id: INT-0001
slug: sdlc-discoverability
kind: chore
status: accepted
created_at: 2026-05-25T19:22:50Z
provenance:
  agent_id: planner
  model: claude-opus-4-7-thinking-xhigh
  prompt_hash: 9efc8e429eeab82a
  trace_id: ""
  inputs_digest: ""
plane_issue: bd34445c-cc47-4f82-bc87-cc1aecfe6255
---

# Intent — Broaden SDLC discoverability across humans and non-Cursor agents

## Problem

A new session opening this repo — human or agent, Cursor or not — should immediately understand it runs an **AI-native SDLC**. Today that is true inside Cursor (always-applied rules + `sessionStart` hook) and for Claude Code (`CLAUDE.md` → `@AGENTS.md`), but it is **not** true for:

- **Humans on GitHub** — `README.md` was `create-next-app` boilerplate; the repo card had no `description`; no human-readable doc set linked from the root.
- **Non-Cursor / non-Claude agents** — Gemini CLI, GitHub Copilot Chat, Codex, Aider — had no canonical entry file pointing at `AGENTS.md` and `.sdlc/sdlc.yaml`.
- **The maintainer six months from now** — no CI guard against accidental deletion of `AGENTS.md`, `.sdlc/sdlc.yaml`, `.sdlc/memories/*`, or the `.cursor/hooks.json` registration of `sessionStart` / `beforeShellExecution`.

## Users

- **Maintainer (felip)** — sole human contributor today; needs discovery surface that survives tool churn and self-onboarding six months out.
- **Future agents** — any LLM / agent harness opening the repo (Cursor, Claude Code, Gemini CLI, Copilot Chat, Codex, Aider, vanilla ChatGPT). Each should land on the same contract via its tool-specific entry file.
- **Anonymous GitHub visitors** — see the repo card, the README, and `docs/`, not boilerplate.

## Success metric

Operational, not telemetric:

1. A fresh session in any supported agent harness can answer "what is this project?" with "AI-native SDLC sandbox; contract is `.sdlc/sdlc.yaml`" without being prompted.
2. The new `ci/structure` job fails if any SDLC entry-point file is deleted.
3. The repo card on GitHub shows the SDLC framing in its `description`.

Verification mechanism: the `ci/structure` gate (mechanical) and a one-time spot-check across agent harnesses by the maintainer (manual, this PR).

## Non-goals

- Does **not** change the SDLC contract itself (`.sdlc/sdlc.yaml`) — only adds pointers to it.
- Does **not** add new gates to branch protection (the `ci/structure` check runs but is not promoted to a required check today; that is a follow-up the maintainer can take when convinced).
- Does **not** introduce new agent harnesses; only adds alias files for harnesses already in scope.
- Does **not** mirror the new `docs/` content to anywhere except Plane Pages (which already happens via `sync-docs`).

## Provenance back-fill note

This intent is authored as a back-fill against work approved and executed in the same chat session (PR #2). The originating prompt was the maintainer turn approving the "5/5" plan to broaden discoverability; the planner role is recorded as the artifact owner per `.cursor/skills/provenance-stamp/`, even though the literal turn that wrote this file was acting as implementer end-to-end per `.cursor/rules/agent-autonomy.mdc`. `trace_id` and `inputs_digest` are honestly empty (no LangSmith run; the inputs are the live working tree rather than a discrete file set).
