---
name: browser-evidence
description: Runs Playwright e2e tests with video and trace evidence for the verify and review phases. Use when authoring or running browser tests, recording user flows, debugging visual regressions, or when the user mentions Playwright, video evidence, e2e, or browser testing.
---

# Browser evidence

Browser verification runs in **Cursor during `/verify`**, not in CI (ADR-0006).
Evidence is posted to the **Plane issue** linked on the spec.

Configuration: `playwright.config.ts` and `sdlc.yaml.integrations.browser_evidence`.

## When evidence is required

| Spec `surface` | Playwright | Plane comment |
|----------------|------------|---------------|
| `product`      | Required before draft PR | Required (video + summary) |
| `operator`     | Waived     | Waived (explicit in report) |

Cross-lane PRs (product + operator paths) are **blocked** — split into two PRs.

## Run locally (product surface)

```bash
npx playwright install          # first run only
npx playwright test             # all browsers, headless
npx playwright test --project=chromium
npx playwright show-report
```

## Post to Plane

After tests pass:

```bash
run_id=$(date -u +%Y%m%dT%H%M%SZ)
mkdir -p ".sdlc/reports/${run_id}"
# copy test-results + playwright-report into report dir; write report.json
node scripts/plane-sync.mjs post-evidence .sdlc/specs/SPEC-XXXX.md ".sdlc/reports/${run_id}" --head-sha $(git rev-parse HEAD)
node scripts/check-verify-report.mjs --spec .sdlc/specs/SPEC-XXXX.md --report ".sdlc/reports/${run_id}"
```

Open the draft PR **only after** `check-verify-report` passes.

## Capture rules (free-tier-friendly)

- `video: "on-first-retry"` — smoke test retries once to guarantee one video.
- `trace: "on-first-retry"`.
- Durable store: Plane issue comment + attachment (not GHA artifacts).

## Authoring rules

- Drive a real user flow; use role-based selectors.
- No hard sleeps; use `expect(...).toBeVisible({ timeout })`.
- Specs live under `tests/e2e/*.spec.ts`.

## Reviewer checklist

- Product PR: `browser_evidence.status: posted` + Plane URL in review frontmatter.
- Operator PR: `browser_evidence.status: waived` + reason.
