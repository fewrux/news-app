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
- Post via report dir (not bare `--payload` for product; operator may use `--payload`).

### Product surface (`surface: product`)

- Map each acceptance criterion to a Playwright spec or eval.
- Run `npx playwright install` if browsers are missing, then
  `npm run test:e2e:verify` (records video on **first pass** — ADR-0008).
- Collect videos: `node scripts/collect-verify-evidence.mjs --run-id <id> --surface product`
- Or use the mechanical loop: `node scripts/run-verify-phase.mjs --spec <spec-path>`

3. Post canonical verify artifact to **Plane** (required — hard gate):
   ```
   node scripts/plane-sync.mjs post-evidence <spec-path> .sdlc/reports/<run_id> --head-sha $(git rev-parse HEAD)
   ```
   Product surface **requires** a `.webm` in the report dir or repo-root `test-results/`.
   Bare `--payload` is deprecated for product (gate fails without video).

4. Exit gate (must pass before `/review` or opening PR):
   ```
   node scripts/check-phase-exit.mjs --phase verify --spec <spec-path> --head-sha $(git rev-parse HEAD)
   ```
   Product gate asserts `browser_evidence.video_attached === true`.

5. Do **not** commit `.sdlc/reports/` — Plane comment is the system of record.
6. On failure: fix and retry (max `retry_policy.max_attempts`), then escalate model class.

Plane credentials: set `PLANE_*` in `.env` (then `.env.local` overrides).
