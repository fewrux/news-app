# Testing

End-to-end tests are the **primary behavioral evidence** for **product-surface**
changes. Per ADR-0006, ADR-0008, ADR-0009, and the
[`browser-evidence` skill](../.cursor/skills/browser-evidence/SKILL.md):

> Product-surface PRs carry browser evidence on the **Plane issue** (posted
> during `/verify` before the draft PR opens). **Video is mandatory on the first
> verify pass** — not retry-only. Operator-surface PRs record an explicit waiver.
> Product verify **must use `run-verify-phase.mjs`** — bare `check-phase-exit`
> calls without a manifest fail the gate.

## Stack

- **Playwright 1.60** with `@playwright/test`.
- Browsers: `chromium`, `firefox`, `webkit`.
- Dev config: [`playwright.config.ts`](../playwright.config.ts) (`on-first-retry`).
- Verify config: [`playwright.verify.config.ts`](../playwright.verify.config.ts) (`video: on`).
- Specs: [`tests/e2e/`](../tests/e2e/).
- **Runner:** Cursor `/verify` phase — **not** GitHub Actions CI.

## Lanes (ADR-0006, ADR-0008)

| Lane | When to run Playwright | Evidence |
|------|------------------------|----------|
| **Product** (`surface: product`) | Required in `/verify` before draft PR | Plane comment + `.webm` + `video_attached: true` |
| **Operator** (`surface: operator`) | Waived | Waiver in `report.json` + review artifact |

One PR must not touch both lanes. Use `node scripts/classify-diff.mjs --strict`.

Policy documentation lives in operator paths only (`sdlc.yaml`, `business-rules.md`,
this file) — editing them does not require browser video.

## Running locally (product surface)

```bash
npx playwright install   # first run only
npm run test:e2e:verify  # verify phase — video on every run
npm run test:e2e         # dev — video on retry only
npm run test:e2e:ui      # Playwright UI mode for debugging
```

The dev server starts automatically via Playwright config.

## Collect and post evidence to Plane

```bash
run_id=$(date -u +%Y%m%dT%H%M%SZ)
npm run test:e2e:verify
node scripts/collect-verify-evidence.mjs --run-id "$run_id" --surface product
node scripts/plane-sync.mjs post-evidence .sdlc/specs/SPEC-XXXX.md ".sdlc/reports/$run_id" --head-sha $(git rev-parse HEAD)
node scripts/check-phase-exit.mjs --phase verify --spec .sdlc/specs/SPEC-XXXX.md --head-sha $(git rev-parse HEAD)
```

**Preferred (only legal path for product):**

```bash
node scripts/run-verify-phase.mjs --spec .sdlc/specs/SPEC-XXXX.md
```

This script creates an execution manifest at `.sdlc/runs/{execution_id}.json`,
sets `SDLC_MANIFEST` for subsequent gate calls, stamps `harness_id: run-verify-phase.mjs`,
and runs the full loop: e2e → collect → post-evidence → check-phase-exit.

Set `PLANE_*` in `.env` (`.env.local` overrides). Product surface cannot use
bare `post-evidence --payload` without a report dir containing video.

## Execution manifest (ADR-0009)

Every spec run creates a machine-written manifest at `.sdlc/runs/{execution_id}.json`
(gitignored — Plane comment is the system of record for remote visibility).

```jsonc
{
  "schema": "sdlc.execution.v1",
  "execution_id": "exec-SPEC-0015-abc12345-20260601T173100Z",
  "spec_id": "SPEC-0015",
  "head_sha": "abc12345...",
  "phases": {
    "verify": {
      "harness_id": "run-verify-phase.mjs",   // required for product
      "run_id": "20260601T173100Z",
      "report_dir": "/abs/path/.sdlc/reports/...",
      "claims": {
        "video_count": 1,
        "report_hash": "sha256:...",
        "video_hashes": ["sha256:..."],
        "plane_attachment_id": "att-..."
      }
    }
  }
}
```

The gate cross-checks `claims.report_dir` exists on disk and `claims.video_count >= 1`
**before** accepting the Plane comment as valid evidence. This prevents forged or
replayed Plane comments from satisfying the gate.

Initialize manually:

```bash
node scripts/execution-manifest.mjs init --spec SPEC-0015 --head-sha $(git rev-parse HEAD)
```

## Verify-phase gates

| Gate | Runner | What it asserts |
|------|--------|-----------------|
| `no_cross_lane_diff` | shell | `classify-diff --strict` |
| `browser_evidence_on_plane` | shell | Plane marker + product `video_attached` + manifest claims |
| `acceptance_criteria_met` | agent.tester | every criterion passes |
| `a11y_baseline` | shell | axe on product surface only |

For **product surface**, `gate.browser_evidence_on_plane` also checks:
- manifest exists at `SDLC_MANIFEST` (set by `run-verify-phase.mjs`)
- `phases.verify.harness_id === "run-verify-phase.mjs"`
- `phases.verify.claims.report_dir` exists on disk
- `phases.verify.claims.video_count >= 1`

`.sdlc/reports/` and `.sdlc/runs/` are **not versioned** — working directory only.
Durable evidence lives on the Plane issue comment.

## Determinism

Per `sdlc.yaml.policies.determinism`: fixed seeds for evals; no real network
in e2e except sampled PostHog.

## Doctor scope

`/doctor` checks SDLC/operator health only (hooks, gates, drift). It does **not**
audit product PR video or fetch Plane for merged app PRs.
