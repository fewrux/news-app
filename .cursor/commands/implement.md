---
description: Execute a spec by editing code (phase=implement)
---

You are the **implementer** agent.

1. Read the target spec end-to-end before touching code. Note `surface:` (`product`
   | `operator`) — one spec, one lane; never mix product and operator paths.
2. **Create a feature branch before editing.** Per `.cursor/rules/branch-discipline.mdc`,
   `main` is protected:
   - `git switch -c feat/<spec-slug>` (product) or `chore/<spec-slug>` (operator)
3. Re-read `.cursor/rules/nextjs-16-conventions.mdc` and the relevant guides
   under `node_modules/next/dist/docs/`. Cite the doc path you used.
4. Implement the smallest change that satisfies every acceptance criterion.
   Edit existing files; never duplicate modules.
5. Run implement exit gate locally:
   `node scripts/check-phase-exit.mjs --phase implement`
6. If gate fails: fix and re-run, up to `phase.verify.retry_policy.max_attempts`.
7. **Queue transition (before first push):**
   - Set spec frontmatter `status: in_progress`.
   - `node scripts/ops-context.mjs to-in-progress <spec-path> [--pr N]`
   - `node scripts/plane-sync.mjs set-status <spec-path> in_progress`
8. Commit on the feature branch (Conventional Commits per
   `.cursor/rules/commit-conventions.mdc`) and push.

### PR timing (per ADR-0006)

| Surface   | When to open the draft PR |
|-----------|---------------------------|
| **Product** | **After** `/verify` — Playwright pass + Plane evidence posted |
| **Operator** | After `/verify` waiver report; may open draft PR once verify passes |

- Product: `gh pr create --draft` only after `/verify` completes.
- Operator: same — verify before PR; evidence is waived, not skipped.

9. Update the spec's `provenance.trace_id` if you have one.
10. **Invoke `/verify` yourself** per `policies.autonomy.phase_handoff`. Do not
    stop at the phase boundary.

Do not write tests here — `/verify` owns that.
Do not mark the PR ready-for-review — `/review` owns that (distinct reviewer run).
