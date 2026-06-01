# Testing

End-to-end tests are the **primary behavioral evidence** for **product-surface**
changes. Per ADR-0006, ADR-0008, and the
[`browser-evidence` skill](../.cursor/skills/browser-evidence/SKILL.md):

> Product-surface PRs carry browser evidence on the **Plane issue** (posted
> during `/verify` before the draft PR opens). **Video is mandatory on the first
> verify pass** — not retry-only. Operator-surface PRs record an explicit waiver.

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

Or: `node scripts/run-verify-phase.mjs --spec .sdlc/specs/SPEC-XXXX.md`

Set `PLANE_*` in `.env` (`.env.local` overrides). Product surface cannot use
bare `post-evidence --payload` without a report dir containing video.

## Verify-phase gates

| Gate | Runner | What it asserts |
|------|--------|-----------------|
| `no_cross_lane_diff` | shell | `classify-diff --strict` |
| `browser_evidence_on_plane` | shell | Plane marker + product `video_attached` |
| `acceptance_criteria_met` | agent.tester | every criterion passes |
| `a11y_baseline` | shell | axe on product surface only |

`.sdlc/reports/` is **not versioned** — working directory only. Durable
evidence lives on the Plane issue comment.

## Determinism

Per `sdlc.yaml.policies.determinism`: fixed seeds for evals; no real network
in e2e except sampled PostHog.

## Doctor scope

`/doctor` checks SDLC/operator health only (hooks, gates, drift). It does **not**
audit product PR video or fetch Plane for merged app PRs.
