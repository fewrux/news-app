# Testing

End-to-end tests are the **primary behavioral evidence** for **product-surface**
changes. Per ADR-0006 and the
[`browser-evidence` skill](../.cursor/skills/browser-evidence/SKILL.md):

> Product-surface PRs carry browser evidence on the **Plane issue** (posted
> during `/verify` before the draft PR opens). Operator-surface PRs record an
> explicit waiver.

## Stack

- **Playwright 1.60** with `@playwright/test`.
- Browsers: `chromium`, `firefox`, `webkit`.
- Config: [`playwright.config.ts`](../playwright.config.ts).
- Specs: [`tests/e2e/`](../tests/e2e/).
- **Runner:** Cursor `/verify` phase — **not** GitHub Actions CI.

## Lanes (ADR-0006)

| Lane | When to run Playwright | Evidence |
|------|------------------------|----------|
| **Product** (`surface: product`) | Required in `/verify` before draft PR | Plane issue comment + video |
| **Operator** (`surface: operator`) | Waived | Waiver in `report.json` + review artifact |

One PR must not touch both lanes. Use `node scripts/classify-diff.mjs --strict`.

## Running locally (product surface)

```bash
npx playwright install   # first run only
npm run test:e2e         # headless, all browsers
npm run test:e2e:ui      # Playwright UI mode for debugging
```

The dev server starts automatically via `playwright.config.ts`.

## Post evidence to Plane

```bash
node scripts/plane-sync.mjs post-evidence .sdlc/specs/SPEC-XXXX.md .sdlc/reports/<run_id> --head-sha $(git rev-parse HEAD)
node scripts/check-verify-report.mjs --spec .sdlc/specs/SPEC-XXXX.md --report .sdlc/reports/<run_id>
```

## Verify-phase gates

| Gate | Runner | What it asserts |
|------|--------|-----------------|
| `no_cross_lane_diff` | shell | `classify-diff --strict` |
| `browser_evidence_on_plane` | shell | `check-verify-report.mjs` |
| `acceptance_criteria_met` | agent.tester | every criterion passes |
| `a11y_baseline` | shell | axe on product surface only |

`.sdlc/reports/` is **not versioned** — working directory only. Durable
evidence lives on the Plane issue comment.

## Determinism

Per `sdlc.yaml.policies.determinism`: fixed seeds for evals; no real network
in e2e except sampled PostHog.
