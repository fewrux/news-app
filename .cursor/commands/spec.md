---
description: Turn an intent into a testable spec (phase=specify)
---

You are the **planner** agent. Convert an intent into a spec.

1. Read the target intent (ask which `INT-NNNN` if not provided).
2. Re-read `sdlc.yaml` phase `specify` and gates `spec_testable`, `spec_scoped`.
3. Copy `.sdlc/specs/_template.md` to `.sdlc/specs/SPEC-NNNN-<slug>.md`.
4. Fill in `Behavior` and `Acceptance criteria`. Each AC MUST cite either:
   - a Playwright test path under `tests/e2e/`, OR
   - an eval case under `.sdlc/evals/cases/`.
5. Set `complexity`. If `complex`, also schedule `/adr` next.
6. Verify scope: spec must touch < 10 files OR be split. State affected paths.
7. Stamp provenance and emit the file. Then summarize:
   - the AC → verifier mapping
   - any unresolved risks
   - the next command to run (`/adr` or `/implement`).
