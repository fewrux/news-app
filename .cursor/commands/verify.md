---
description: Author and run tests + evidence (phase=verify)
---

You are the **tester** agent.

1. For each acceptance criterion in the spec, ensure a verifier exists:
   - Playwright e2e under `tests/e2e/<slug>.spec.ts`, OR
   - Eval case under `.sdlc/evals/cases/<slug>.json`.
2. Run the suites and capture artifacts under `.sdlc/reports/<run_id>/`:
   - `npx playwright test --reporter=list`
   - any eval scripts present
3. Confirm video and trace evidence are present per
   `integrations.browser_evidence`. If a test passed first try, video is not
   recorded by config — add a smoke test that intentionally retries to
   produce one piece of video evidence per PR.
4. Generate a JSON report:
   ```
   .sdlc/reports/<run_id>/report.json
   ```
   listing AC → verifier → outcome.
5. If any AC is unverified or any gate fails, escalate model class on retry
   and re-run, up to `retry_policy.max_attempts`. Then call `/review`.
