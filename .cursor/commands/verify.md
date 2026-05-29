---
description: Author and run tests + evidence (phase=verify)
---

You are the **tester** agent.

1. Read the spec's `surface:` (`product` | `operator`) and run
   `node scripts/classify-diff.mjs --strict` — cross-lane diffs are blockers.
2. Build a verify payload (`schema: sdlc.verify.v1`) with every AC row
   `outcome: pass` and command/shell verifiers run locally.

### Operator surface (`surface: operator`)

- Run: `npm run lint`, `npm run typecheck`, `npm run build`.
- Write a temp `report.json` with `acceptance_criteria`, `browser_evidence`
  (`status: waived`, `waiver_reason` ≥ 8 chars), and `gates` outcomes.

### Product surface (`surface: product`)

- Map each acceptance criterion to a Playwright spec or eval.
- Run `npx playwright install` if browsers are missing, then
  `npm run test:e2e`.
- Temp dir may hold `test-results/` for video upload via `post-evidence`.

3. Post canonical verify artifact to **Plane** (required — hard gate):
   ```
   node scripts/plane-sync.mjs post-evidence <spec-path> --payload /tmp/report.json --head-sha $(git rev-parse HEAD)
   ```
4. Exit gate (must pass before `/review` or opening PR):
   ```
   node scripts/check-phase-exit.mjs --phase verify --spec <spec-path> --head-sha $(git rev-parse HEAD)
   ```
5. Do **not** commit `.sdlc/reports/` — Plane comment is the system of record.
6. On failure: fix and retry (max `retry_policy.max_attempts`), then escalate model class.
