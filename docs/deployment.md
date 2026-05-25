# Deployment

The app deploys to **Vercel Hobby** (free). Both preview and production
deploys are driven by GitHub Actions; nobody runs `vercel --prod` from a
laptop.

## Environments

| Environment | Trigger              | URL pattern                                         |
|-------------|----------------------|-----------------------------------------------------|
| **preview**     | `pull_request`   | `https://news-app-pr-<pr_number>.vercel.app`        |
| **production**  | `push.main`      | `https://news-app.vercel.app`                       |

Declared in `sdlc.yaml.integrations.vercel.environments`.

## Flow

```
feature branch + PR
        │
        ▼
.github/workflows/ci.yml          (lint · typecheck · build · e2e)
.github/workflows/preview.yml     (vercel deploy --target preview)
.github/workflows/e2e-evidence.yml (record video + trace on retry)
.github/workflows/plane-sync.yml  (mirror PR to Plane issue)
        │
        ▼
reviewer agent ✅  (distinct identity from implementer)
        │  squash-merge to main
        ▼
.github/workflows/deploy-prod.yml (vercel deploy --prod)
        │
        ▼
releaser agent: progressive rollout
        canary_5pct  → canary_25pct → full
        promote_when:   slo.error_rate < 0.5% AND slo.p95_latency_ms < 400
        rollback_when:  slo breached for 5m OR user_reported_regressions > 0
```

## Release phase (the contract)

`sdlc.yaml.phases.release`:

- **Strategy** — progressive: `canary_5pct → canary_25pct → full`.
- **Promote** — `slo.error_rate < 0.5% AND slo.p95_latency_ms < 400`.
- **Rollback** — `slo breached for 5m OR user_reported_regressions > 0`.
- **Approver** — `releaser` agent (`default_approval: agent`). Humans
  approve only when a `human_required_when` condition fires:
  - `diff.touches_security_surface == true`
  - `diff.includes_schema_migration == true`
  - `spec.risks.includes('user_data_loss')`
  - `release.kind == hotfix AND prior_incident.severity in [p0, p1]`
  - `release.confidence < 0.7`

The success metric is **zero human fingers lifted**; humans gate only
the genuinely high-risk subset.

## Required CI secrets

Set these in GitHub Actions Secrets:

- `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`
- `PLANE_API_TOKEN`, `PLANE_API_BASE`, `PLANE_WORKSPACE_SLUG`,
  `PLANE_PROJECT_ID`
- `LANGCHAIN_API_KEY` (for trace correlation, optional)
- `NEXT_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_POSTHOG_HOST`

`vercel.json` carries the project's static deploy config. The build is
the stock Next.js 16 production build.

## Shell guard

The `beforeShellExecution` hook
(`.cursor/hooks/guard-shell.mjs`) hardens this surface:

- **Denies** `vercel scale` and `vercel deploy --prod --scale` (would
  push us past Hobby quotas).
- **Asks before** running `vercel --prod` from a laptop.
- **Denies** any `git push` against `main`, any commit while checked
  out on `main`, any force-push, and any `gh pr merge --admin` bypass.
- **Asks before** `curl/wget`, `npm/pnpm/yarn install`, and
  `playwright install` — all of which can trip free-tier or change the
  dependency surface.

## Rollback

The releaser agent rolls back automatically on the conditions above
(SLO breach or user-reported regressions). The standing procedure: a
`hotfix/<incident-id>` branch is opened, the change is reverted, and
the operator phase produces an incident record per
[`.cursor/commands/incident.md`](../.cursor/commands/incident.md).
