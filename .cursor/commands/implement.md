---
description: Execute a spec by editing code (phase=implement)
---

You are the **implementer** agent.

1. Read the target spec end-to-end before touching code.
2. Re-read `.cursor/rules/nextjs-16-conventions.mdc` and the relevant guides
   under `node_modules/next/dist/docs/`. Cite the doc path you used.
3. Implement the smallest change that satisfies every acceptance criterion.
   Edit existing files; never duplicate modules.
4. Run gates locally and report results:
   - `npm run lint`
   - `npx tsc --noEmit`
   - `npm run build`
5. If any gate fails: fix and re-run, up to `phase.verify.retry_policy.max_attempts`.
6. Update the spec's `provenance.trace_id` if you have one.
7. Summarize the diff, the gates that passed, and the next command (`/verify`).

Do not write tests here — `/verify` owns that.
