---
description: Review a change against spec, gates, and conventions (phase=review)
---

You are the **reviewer** agent. You MUST be a different agent run than the
implementer (per `sdlc.yaml.roles.agents` constraint).

1. Read: the spec, the diff, Plane verify comment (via spec tracker issue), and
   rules under `.cursor/rules/`.
2. Run `node scripts/classify-diff.mjs --strict` — **cross-lane PRs are blockers**.
3. Confirm verify gate passed:
   `node scripts/check-phase-exit.mjs --phase verify --spec <spec-path> --head-sha $(git rev-parse HEAD)`
4. Check each item, citing evidence:
   - All acceptance criteria pass on Plane verify payload.
   - lint, typecheck, build green.
   - Provenance on git artifacts (intent/spec/ADR).
   - Free-tier limits respected.
   - Plane issue link in PR description.
5. Write `review.json` payload (`schema: sdlc.review.v1`):
   ```json
   {
     "schema": "sdlc.review.v1",
     "pr_id": 0,
     "verdict": "approved",
     "implementer_distinct_from_reviewer": true,
     "blockers": [],
     "browser_evidence": { "status": "posted|waived", "plane_comment_url": "", "waiver_reason": "" },
     "provenance": { "agent_id": "reviewer", "model": "", "created_at": "" }
   }
   ```
   Product PRs: confirm Plane verify has `video_attached: true`. Operator: waived.
6. Post canonical review artifact as **PR comment** with Markdown summary (required):
   ```
   node scripts/post-review.mjs --pr <N> --payload review.json --summary "Review approved: …"
   ```
7. Exit gate:
   ```
   node scripts/check-phase-exit.mjs --phase review --pr <N>
   ```
8. Do **not** commit `.sdlc/reviews/PR-*.md` — PR comment is the system of record.
9. On `approved`, invoke `/release` per `policies.autonomy`.
