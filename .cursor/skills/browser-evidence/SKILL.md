---
name: browser-evidence
description: Runs Playwright e2e tests with video and trace evidence for the verify and review phases. Use when authoring or running browser tests, recording user flows, debugging visual regressions, or when the user mentions Playwright, video evidence, e2e, or browser testing.
---

# Browser evidence

Browser verification runs in **Cursor during `/verify`**, not in CI (ADR-0006).
Evidence is posted to the **Plane issue** linked on the spec.
Product video is **mandatory on first pass** (ADR-0008).

Configuration: `playwright.verify.config.ts`, `playwright.config.ts`, and
`sdlc.yaml.integrations.browser_evidence`.

## When evidence is required

| Spec `surface` | Playwright | Plane comment |
|----------------|------------|---------------|
| `product`      | Required before draft PR — video on every verify run | Required (video + summary + `video_attached: true`) |
| `operator`     | Waived     | Waived (explicit in report) |

Policy docs (`sdlc.yaml`, `business-rules.md`, `docs/testing.md`) are operator
lane — editing them does not require video.

Cross-lane PRs (product + operator paths) are **blocked** — split into two PRs.

## Run locally (product surface)

```bash
npx playwright install          # first run only
npm run test:e2e:verify         # verify config — video on first pass
npm run test:e2e                # dev default — on-first-retry only
npm run test:e2e:ui             # Playwright UI mode for debugging
```

## Collect and post to Plane

```bash
run_id=$(date -u +%Y%m%dT%H%M%SZ)
npm run test:e2e:verify
node scripts/collect-verify-evidence.mjs --run-id "$run_id" --surface product
# write report.json under .sdlc/reports/${run_id}/
node scripts/plane-sync.mjs post-evidence .sdlc/specs/SPEC-XXXX.md ".sdlc/reports/${run_id}" --head-sha $(git rev-parse HEAD)
node scripts/check-phase-exit.mjs --phase verify --spec .sdlc/specs/SPEC-XXXX.md --head-sha $(git rev-parse HEAD)
```

Mechanical loop: `node scripts/run-verify-phase.mjs --spec .sdlc/specs/SPEC-XXXX.md`

Open the draft PR **only after** verify gate passes.

## Capture rules (ADR-0008)

- **Verify:** `video: "on"` via `playwright.verify.config.ts` or `SDLC_VERIFY=1`.
- **Dev:** `video: "on-first-retry"` in `playwright.config.ts` to keep storage modest.
- Durable store: Plane issue comment + attachment (not GHA artifacts).
- Gate requires `browser_evidence.video_attached === true` for product.

## Authoring rules

- Drive a real user flow; use role-based selectors.
- No hard sleeps; use `expect(...).toBeVisible({ timeout })`.
- Specs live under `tests/e2e/*.spec.ts`.

## Reviewer checklist

- Product PR: `browser_evidence.status: posted`, `video_attached: true`, Plane URL.
- Operator PR: `browser_evidence.status: waived` + reason.
