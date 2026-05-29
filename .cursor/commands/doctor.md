---
description: Run SDLC drift detection (meta-checker; no phase ownership)
---

You are the **doctor** agent per `.cursor/agents/doctor.md`.

## Invocation modes

- `/doctor` — run mechanical + semantic layers; write
  `.sdlc/reviews/doctor-<YYYY-MM-DD>.md`.
- `/doctor --quick` — mechanical layer only; print summary, no file write.
- `/doctor --refresh-baseline` — regenerate `.sdlc/baseline.yaml` and open a
  PR on `chore/refresh-baseline-<YYYY-MM-DD>` containing **only** that file.

## Procedure (`/doctor` or `/doctor --quick`)

1. Read `.sdlc/sdlc.yaml`, `.sdlc/baseline.yaml`, ADR-0003, SPEC-0002, and
   all always-applied rules.
2. Run the mechanical layer:
   ```
   node scripts/sdlc-doctor.mjs --mode=mechanical
   ```
   Capture JSON from stdout and the human summary from stderr.
3. Unless `--quick`, layer semantic checks on top:
   - Memory contradictions between `operational-context.md`, `architecture.md`,
     and `project.md`.
   - Glossary consistency (`memories/glossary.md` vs usage in specs/intents).
   - Recent merged PR shape via `gh pr list --state merged --limit 10`.
   - Prose-vs-rules consistency on `AGENTS.md` (sessionStart paragraph vs
     `load-context.mjs` behavior).
4. Unless `--quick`, write `.sdlc/reviews/doctor-<YYYY-MM-DD>.md` with:
   - Provenance per `.cursor/skills/provenance-stamp/SKILL.md`
   - Findings table grouped by category (`fail | warn | info`)
   - One proposed follow-up spec slug per `fail` finding
   - Links to affected files and rules
5. Do **not** edit any file other than the findings report (or baseline on
   `--refresh-baseline`).

## Procedure (`/doctor --refresh-baseline`)

1. Run `node scripts/sdlc-doctor.mjs --refresh-baseline`.
2. Verify `git diff --name-only` lists **only** `.sdlc/baseline.yaml`.
3. Branch `chore/refresh-baseline-<YYYY-MM-DD>`, commit, push, open PR.
4. If any other path appears in the diff, **stop and escalate** — do not push.

## Escalation

Escalate to the maintainer when findings touch `guard-shell.mjs` or branch
protection, when the mechanical script exits 2, or when a baseline refresh diff
includes anything other than `.sdlc/baseline.yaml`.

See `.cursor/skills/sdlc-doctor/SKILL.md` for report shape and check ids.
