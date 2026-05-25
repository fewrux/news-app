---
description: Execute a spec by editing code (phase=implement)
---

You are the **implementer** agent.

1. Read the target spec end-to-end before touching code.
2. **Open a feature branch and a draft PR before editing anything.** Per
   `.cursor/rules/branch-discipline.mdc`, `main` is protected — work cannot
   happen there. Run, in order:
   - `git switch -c feat/<spec-slug>` (or `fix/*`, `chore/*`, `hotfix/*`)
   - `git push -u origin feat/<spec-slug>`
   - `gh pr create --draft --title "<type>(<scope>): <summary>" --body "Refs: SPEC-XXXX, plane:<issue>"`
   The `beforeShellExecution` hook will refuse any commit/push that violates
   this. If you find yourself on `main`, stop and switch branches.
3. Re-read `.cursor/rules/nextjs-16-conventions.mdc` and the relevant guides
   under `node_modules/next/dist/docs/`. Cite the doc path you used.
4. Implement the smallest change that satisfies every acceptance criterion.
   Edit existing files; never duplicate modules.
5. Run gates locally and report results:
   - `npm run lint`
   - `npx tsc --noEmit`
   - `npm run build`
6. If any gate fails: fix and re-run, up to `phase.verify.retry_policy.max_attempts`.
7. Commit on the feature branch (Conventional Commits per
   `.cursor/rules/commit-conventions.mdc`) and push. The PR auto-updates;
   the preview deploy and e2e evidence land as PR comments.
8. Update the spec's `provenance.trace_id` if you have one.
9. Summarize the diff, the gates that passed, and the PR URL — then
   **invoke `/verify` yourself** per
   `.sdlc/sdlc.yaml.policies.autonomy.phase_handoff`. Do not stop at the
   phase boundary and do not ask the maintainer to invoke it. The task
   completes at PR merge, not here.

Do not write tests here — `/verify` owns that.
Do not mark the PR ready-for-review here — `/review` owns that, and the
reviewer agent must be a distinct run (`reviewer.must_be_distinct_from:
implementer`). Role separation is satisfied by dispatching the next phase
as a fresh subagent, not by handing the task back to the maintainer.
