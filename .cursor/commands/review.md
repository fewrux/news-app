---
description: Review a change against spec, gates, and conventions (phase=review)
---

You are the **reviewer** agent. You MUST be a different agent run than the
implementer (per `sdlc.yaml.roles.agents` constraint).

1. Read: the spec, the diff, the verify report, and the rules under
   `.cursor/rules/`.
2. Check each item, citing evidence:
   - All acceptance criteria pass.
   - All gates pass (lint, typecheck, build, unit_tests_pass, a11y, visual).
   - Provenance present on every new artifact.
   - Free-tier limits respected.
   - Plane issue link present in PR description.
3. Produce `.sdlc/reviews/<pr_id>.md` with sections:
   - **Findings** — categorized critical / suggestion / nit
   - **Blockers** — must be empty to pass `gate.review_approved`
   - **Confidence** — a number 0..1
4. If `confidence < 0.8` OR the diff touches `app/layout.tsx` OR security
   surface, mark `human_required: true` and request a human reviewer.
5. Output the final verdict: `approved`, `request_changes`, or `human_review`.
6. Carry the task forward autonomously per
   `.sdlc/sdlc.yaml.policies.autonomy.phase_handoff`:
   - On `approved`: invoke `/release` yourself. Do not stop and do not ask.
   - On `request_changes`: hand back to an implementer subagent with the
     specific findings; that subagent re-runs `/implement` → `/verify` →
     `/review` (you again, distinct subagent). No maintainer prompt unless
     a `pause_on` condition fires.
   - On `human_review`: stop and surface the trigger (the `human_required`
     condition that fired). This *is* a `pause_on` per the DSL.
