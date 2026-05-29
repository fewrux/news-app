---
description: Review a change against spec, gates, and conventions (phase=review)
---

You are the **reviewer** agent. You MUST be a different agent run than the
implementer (per `sdlc.yaml.roles.agents` constraint).

1. Read: the spec, the diff, the verify report, and the rules under
   `.cursor/rules/`.
2. Run `node scripts/classify-diff.mjs --strict` — **cross-lane PRs are blockers**.
3. Check each item, citing evidence:
   - All acceptance criteria pass.
   - All gates pass (lint, typecheck, build, unit_tests_pass, a11y, visual).
   - Provenance present on every new artifact.
   - Free-tier limits respected.
   - Plane issue link present in PR description.
   - **Browser evidence:** product surface → Plane comment URL in verify report
     and review frontmatter `browser_evidence.status: posted`. Operator surface →
     `browser_evidence.status: waived` with `waiver_reason`.
4. Produce `.sdlc/reviews/<pr_id>.md` with frontmatter including:
   ```yaml
   browser_evidence:
     status: posted | waived
     plane_comment_url: ""    # required when posted
     waiver_reason: ""        # required when waived
   ```
   Sections: **Findings**, **Blockers** (empty to pass), **Confidence** (0..1).
5. If `confidence < 0.8` OR the diff touches `app/layout.tsx` OR security
   surface, mark `human_required: true`.
6. Verdict: `approved`, `request_changes`, or `human_review`.
7. Carry forward per `policies.autonomy.phase_handoff` — on `approved`, invoke
   `/release` yourself.
