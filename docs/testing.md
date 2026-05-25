# Testing

End-to-end tests are the **primary** evidence in this project. Per
`sdlc.yaml.invariants` and the
[`browser-evidence` skill](../.cursor/skills/browser-evidence/SKILL.md):

> Every PR carries a Plane issue link, a Vercel preview URL, and an
> **e2e video reference**.

A PR missing video evidence is not mergeable.

## Stack

- **Playwright 1.60** with `@playwright/test`.
- Browsers: `chromium`, `firefox`, `webkit`.
- Config: [`playwright.config.ts`](../playwright.config.ts).
- Specs: [`tests/e2e/`](../tests/e2e/).
- CI workflow: `.github/workflows/e2e-evidence.yml`.

## Running locally

```bash
npx playwright install   # first run only
npm run test:e2e         # headless, all browsers
npm run test:e2e:ui      # Playwright UI mode for debugging
```

The dev server (`npm run dev`) does not need to be running first; the
Playwright config can start it automatically.

## Authoring a spec

Put new specs under `tests/e2e/<feature>.spec.ts`. Naming follows the
feature, not the bug:

```typescript
// tests/e2e/home.spec.ts
import { test, expect } from "@playwright/test";

test("featured story renders above the fold", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 2 })).toBeVisible();
});
```

Persistent guidance:
[`.cursor/rules/testing-evidence.mdc`](../.cursor/rules/testing-evidence.mdc).

## Evidence (video + trace)

Per `sdlc.yaml.integrations.browser_evidence`:

- `video.record: on_first_retry` — saves bandwidth on the free tier.
- `video.keep: failures_only_plus_one_smoke_per_pr`.
- `trace.record: on_first_retry`.
- `video.artifact_path: .sdlc/reports/<run_id>/videos/`
- `trace.artifact_path: .sdlc/reports/<run_id>/traces/`

`.sdlc/reports/` is **not versioned** (`.gitignore` ignores it; only the
`.gitkeep` is committed). CI uploads it as a workflow artefact and the
PR description links the artefact URL.

## Verify-phase gates (`sdlc.yaml.phases.verify`)

| Gate                          | Runner               | What it asserts                                    |
|-------------------------------|----------------------|----------------------------------------------------|
| `unit_tests_pass`             | `shell`              | `npm test --silent` (currently tolerant-missing)   |
| `acceptance_criteria_met`     | `agent.tester`       | every spec criterion has a passing assertion or eval |
| `a11y_baseline`               | `shell`              | `npx @axe-core/cli http://localhost:3000` ≤ serious|
| `visual_no_unintended_diff`   | `agent.tester`       | visual diffs are explained in the spec or rejected |

Retry policy: `max_attempts: 3`, `escalate_model_on_retry: true`.

## Attaching evidence to a PR

The reviewer agent expects (from
[`.cursor/skills/browser-evidence/SKILL.md`](../.cursor/skills/browser-evidence/SKILL.md)):

1. A run summary in the PR description naming the run_id and the
   relevant `.sdlc/reports/<run_id>/` path.
2. A link to the CI artefact bundle (video + trace).
3. A note for each acceptance criterion → spec name mapping.

## Determinism

Per `sdlc.yaml.policies.determinism`:

- Tester uses **fixed seeds** for any eval that touches randomness.
- No real network calls in e2e — mock the network surface or use a
  fixture; PostHog ingest is the only allowed exception (and even that
  is sampled).
