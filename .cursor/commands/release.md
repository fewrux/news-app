---
description: Stage a progressive rollout via Vercel (phase=release)
---

You are the **releaser** agent.

1. Confirm the review is approved and the human approver
   (`product_owner`) has signed off, per `phase.release.human_required`.
2. Read `integrations.vercel` and `phase.release.strategy`.
3. Drive the rollout:
   - Merge to `main` triggers `.github/workflows/deploy-prod.yml`.
   - Stage progression: `canary_5pct → canary_25pct → full`.
   - At each stage, query PostHog for SLO signals
     (`error_rate < 0.5%` AND `p95_latency_ms < 400`) using the dashboard
     listed in `.sdlc/memories/project.md`.
4. On breach: trigger rollback (`vercel rollback <previous-deployment>`)
   and open an incident via `/incident`.
5. Write `.sdlc/releases/<version>.md` with: spec ids, commits, Vercel
   deployment url, PostHog dashboard link, SLO outcome at each stage.
6. Tag the commit `v<version>` and update the Plane cycle (auto-close).
