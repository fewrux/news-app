---
name: browser-evidence
description: Runs Playwright e2e tests with video and trace evidence for the verify and review phases. Use when authoring or running browser tests, recording user flows, debugging visual regressions, or when the user mentions Playwright, video evidence, e2e, or browser testing.
---

# Browser evidence

The `verify` phase produces video and trace artifacts that feed `review`.
Configuration lives in `playwright.config.ts` and obeys
`sdlc.yaml.integrations.browser_evidence`.

## Run locally

```
npx playwright test                    # all browsers, headless
npx playwright test --ui               # interactive
npx playwright test --project=chromium # one browser only
npx playwright show-report             # open last HTML report
```

## Where artifacts land

- HTML report: `playwright-report/index.html`
- Per-run videos and traces: `.sdlc/reports/<run_id>/`

## Capture rules (free-tier-friendly)

- `video: "on-first-retry"` — keeps storage low; failed tests still get video.
- `trace: "on-first-retry"` — same rationale.
- A required smoke test in `tests/e2e/smoke.spec.ts` deliberately retries once
  to guarantee at least one video per PR (per
  `integrations.browser_evidence.video.keep`).

## Authoring rules

- Drive a real user flow; never assert internal state.
- Use role-based selectors (`getByRole`, `getByLabel`).
- No hard sleeps; `expect(...).toBeVisible({ timeout })` instead.
- One assertion of user-visible outcome per test, minimum.

## Attaching evidence to a review

In the PR description, link the run:

```
e2e run: .sdlc/reports/<run_id>/
video:   .sdlc/reports/<run_id>/videos/<test>.webm
trace:   .sdlc/reports/<run_id>/traces/<test>.zip
```
