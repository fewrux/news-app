# Integrations

Every external service is declared in
`sdlc.yaml.integrations` and must respect
`policies.cost.tier == free_only`. This page summarises the wiring;
config and credentials live in `.env*` (gitignored) and GitHub Action
Secrets (for CI).

## GitHub — version control + CI/CD

- **Workflows** live in `.github/workflows/`:
  - `ci.yml` — `lint`, `typecheck`, `build`, `review-gate`. Runs on PRs and
    `push.main`. Maps to `gates.{lint,typecheck,build}`.
  - `preview.yml` — Vercel preview deploy on every PR; URL is posted as
    a PR comment.
  - `deploy-prod.yml` — Vercel production deploy on `push.main`.
  - `plane-sync.yml` — mirrors PRs and GitHub issues into Plane.
  - Browser evidence: Cursor `/verify` → `plane-sync post-evidence` → Plane
    issue comment + video attachment for product (ADR-0006, ADR-0008; not a CI
    workflow). `PLANE_*` in `.env` / `.env.local`.
  - `docs-sync.yml` — mirrors `docs/*.md` to Plane native pages on
    `push.main` (and via `workflow_dispatch`).
- **Branch protection** is declared in
  `integrations.github.branch_strategy.protection`. See
  [branching-and-prs.md](./branching-and-prs.md) for the required
  status checks and PR shape.

## Plane — project management

- **Cloud free tier.** API base = `${PLANE_API_BASE}` (defaults to
  `https://api.plane.so`). Auth via `X-API-Key: $PLANE_API_TOKEN`.
- Workspace + project IDs come from `PLANE_WORKSPACE_SLUG` and
  `PLANE_PROJECT_ID`.
- **Issue mappings** (`integrations.plane.mappings`):

  | Artifact          | Plane object | State        | Labels         |
  |-------------------|--------------|--------------|----------------|
  | `artifact.intent` | issue        | backlog      | `[intent]`     |
  | `artifact.spec`   | issue        | todo         | `[spec]`       |
  | `artifact.incident` | issue      | in_progress  | `[incident, p1]` |
  | `phase.release`   | cycle        | auto-close   | —              |
  | `docs/*.md`       | **page**     | —            | `external_source: news-app-docs` |

### Plane pages sync

`scripts/plane-sync.mjs sync-docs` walks `docs/`, converts each
Markdown file to HTML, and upserts a Plane page per file:

- First sync — `POST /api/v1/workspaces/{slug}/projects/{project}/pages/`
  with `external_id: docs/<filename>` and
  `external_source: news-app-docs`. The returned page id is recorded
  in `docs/.plane-pages.json` (committed).
- Subsequent runs — paths already in the mapping are **skipped** by
  default. Set `PLANE_PAGES_PATCH_ENABLED=1` once Plane Cloud ships
  PATCH on pages (today the API returns 405 — see PR `makeplane/plane#8800`).
  Meanwhile, to refresh an existing doc page after editing the
  Markdown, **delete the page in the Plane UI and re-run sync** — the
  script will recreate it with the new content.

Run manually:

```bash
npm run plane:sync:docs
```

Automated on `push.main` by `.github/workflows/docs-sync.yml`. The
workflow needs these secrets:

- `PLANE_API_TOKEN`, `PLANE_API_BASE`, `PLANE_WORKSPACE_SLUG`,
  `PLANE_PROJECT_ID`

The script uses Node's `fetch` for reads and shells out to `curl` for
writes (Node's `undici` is JA3-fingerprinted into a stricter Cloudflare
bucket; curl sails through). For more on the Plane Cloud / Cloudflare
quirks the script works around, see
[`.cursor/skills/plane-sync/SKILL.md`](../.cursor/skills/plane-sync/SKILL.md#known-plane-cloud-quirks-relevant-to-docs-sync).

## Vercel — deployment

- **Hobby plan** (free). Personal/non-commercial only.
- Project name: `news-app`. Framework: `nextjs`.
- Environments:
  - **preview** — from `pull_request`, URL pattern
    `https://news-app-pr-<pr_number>.vercel.app`
  - **production** — from `push.main`, URL `https://news-app.vercel.app`
- Promote condition: `phase.release.gate.review_approved == passed`.
- CI auth via `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`.
- The `beforeShellExecution` hook denies `vercel scale` and prompts on
  `vercel --prod` to avoid surprise paid-tier usage.

See [deployment.md](./deployment.md) for the full deploy flow.

## PostHog — product analytics + session replay

- **Free tier.** Browser-side init via `instrumentation-client.ts` and
  `lib/posthog/client.ts`.
- API host: `${NEXT_PUBLIC_POSTHOG_HOST}` (default
  `https://us.i.posthog.com`). Client key:
  `NEXT_PUBLIC_POSTHOG_KEY`. Server-side reads use
  `POSTHOG_PERSONAL_API_KEY`.
- **Capture settings** (`integrations.posthog.capture`):
  - `autocapture: true`
  - `pageviews: true`
  - `web_vitals: true`
  - `session_replay`: enabled, `sample_rate: 0.1`,
    `mask_all_inputs: true`
- **Event taxonomy** (`events_taxonomy`):
  - `article_viewed` — `{article_id, category}`
  - `article_shared` — `{article_id, channel}`
  - `search_performed` — `{query, results_count}`
- **SLO signals**:
  - `error_rate` ← `posthog.metric("$exception")`
  - `p95_latency_ms` ← `posthog.metric("$web_vitals_LCP", percentile=95)`

See [observability.md](./observability.md) and the
[`posthog-instrument` skill](../.cursor/skills/posthog-instrument/SKILL.md).

## LangSmith — agent tracing

- **Free tier.** Provider `langsmith`, project `news-app`.
- Enabled when `TRACE_TO_LANGSMITH=true`. Retention 90 days.
- Attaches to **all** agent runs. Every artifact's provenance
  frontmatter carries a `trace_id` pointing at the LangSmith run that
  produced it. See [provenance.md](./provenance.md).

## Playwright — browser evidence

- **Runner**: Playwright 1.60, browsers `chromium`, `firefox`, `webkit`.
- Config: `playwright.config.ts`. Tests under `tests/e2e/`.
- **Video** and **trace** recording: `on_first_retry` (saves bandwidth
  on the free tier). Kept only for failures + one smoke per PR.
- Artifact path: `.sdlc/reports/<run_id>/videos/` and `.../traces/`.
  `.sdlc/reports/` is gitignored.
- Verify phase: `plane-sync post-evidence` → Plane issue comment. Attaches to
  `artifact.report` and feeds `phase.review.inputs`.

See [testing.md](./testing.md) and the
[`browser-evidence` skill](../.cursor/skills/browser-evidence/SKILL.md).
