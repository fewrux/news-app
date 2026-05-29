---
name: sdlc-doctor
description: Runs SDLC drift detection — mechanical checks via scripts/sdlc-doctor.mjs, semantic layer via the doctor agent, and baseline refresh via --refresh-baseline. Use when the user invokes /doctor, asks about SDLC health, drift, or baseline regeneration.
---

# SDLC doctor skill

## When this skill activates

- User invokes `/doctor`, `/doctor --quick`, or `/doctor --refresh-baseline`.
- User asks whether the SDLC contract matches disk reality.
- CI or weekly workflow references `scripts/sdlc-doctor.mjs`.

## Mechanical layer (no LLM)

```bash
node scripts/sdlc-doctor.mjs --mode=mechanical
node scripts/sdlc-doctor.mjs --mode=mechanical --list-checks
node scripts/sdlc-doctor.mjs --refresh-baseline
```

Exit codes: `0` (no `fail`), `1` (one or more `fail`), `2` (script error).

## Report shape (stdout JSON)

```json
{
  "mode": "mechanical",
  "generated_at": "ISO-8601",
  "findings": [
    {
      "id": "struct.hook-registry-matches-config",
      "severity": "fail | warn | info",
      "category": "structural | artifact | memory hygiene | process compliance | cost compliance",
      "message": "human-readable",
      "path": "optional/repo/path"
    }
  ],
  "summary": { "fail": 0, "warn": 0, "info": 0 }
}
```

Human-readable summary prints to **stderr**.

## Semantic layer (doctor agent)

On `/doctor` (not `--quick`), the agent adds semantic findings and writes
`.sdlc/reviews/doctor-<YYYY-MM-DD>.md`. Canonical mechanical check ids are
listed in SPEC-0002 `## Checks (mechanical layer)`.

## `--refresh-baseline`

Regenerates `.sdlc/baseline.yaml` from filesystem reality + `sdlc.yaml`.
The only autonomy exception for the doctor agent: open a PR that touches
**only** that file. See ADR-0003 Option 2C.

## Resolving findings

Contributors reference findings in cleanup PRs as `Closes: doctor:<finding-id>`
in the PR description so the next doctor run reflects resolution.

## Eval cases

Run eval harness:

```bash
node scripts/doctor-eval.mjs
```

Cases live under `.sdlc/evals/cases/doctor/`.
