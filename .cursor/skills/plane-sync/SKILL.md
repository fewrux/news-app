---
name: plane-sync
description: Creates or updates Plane issues from SDLC artifacts (intents, specs, incidents) and mirrors docs/ to Plane native pages using the Plane REST API. Use when the user asks to sync an intent or spec to Plane, file a Plane issue from an incident, mirror docs to Plane pages, or check Plane mappings.
---

# Plane sync

Plane is this project's free-tier project management tool, configured in
`sdlc.yaml.integrations.plane`.

## Required env

- `PLANE_API_BASE` (e.g. `https://api.plane.so`)
- `PLANE_API_TOKEN`
- `PLANE_WORKSPACE_SLUG`
- `PLANE_PROJECT_ID`

## Mappings (from sdlc.yaml)

| Artifact          | Plane object | Default state | Labels / external_source         |
|-------------------|--------------|---------------|----------------------------------|
| artifact.intent   | issue        | backlog       | `[intent]`                       |
| artifact.spec     | issue        | todo          | `[spec]`                         |
| artifact.incident | issue        | in_progress   | `[incident, p1]`                 |
| phase.release     | cycle        | auto-close    | —                                |
| `docs/*.md`       | **page**     | —             | `external_source: news-app-docs` |

## Use the script, not raw curl

```
node scripts/plane-sync.mjs <command> <args>
```

Commands:

- `create-from-intent <path-to-intent.md>` — creates an issue, writes the
  returned id back into the intent's frontmatter `plane_issue` field.
- `create-from-incident <path-to-incident.md>` — same, with severity label.
- `link-spec <path-to-spec.md> <plane-issue-id>` — link an existing issue.
- `close-cycle <release-id>` — close the Plane cycle for a release.
- `sync-docs [docs-dir]` — mirror every `.md` file under the directory
  (defaults to `docs/`) to a Plane native **page**. Idempotent: pages are
  upserted by `external_id = "<docs-dir>/<filename>"` and
  `external_source = "news-app-docs"`. First sync creates; subsequent
  syncs PATCH in place. No state file is needed.
- `github-event` — used by CI workflows that pass a GitHub webhook
  payload via `GITHUB_EVENT_PATH`.

## Docs sync — when and how

- Manual: `npm run plane:sync sync-docs` (preferred) or
  `node scripts/plane-sync.mjs sync-docs docs`.
- Automatic: `.github/workflows/docs-sync.yml` runs on `push.main` when
  any file under `docs/`, `scripts/plane-sync.mjs`, or the workflow
  itself changes. The workflow also supports `workflow_dispatch` for
  ad-hoc resync.
- The script converts Markdown to HTML inline (no deps) and sends it as
  `description_html`. Plane Pages CRUD lives at
  `/api/v1/workspaces/{slug}/projects/{project}/pages/`.

## Free-tier guard

- Plane Cloud Free supports ≤ 12 users. Before adding a user, confirm
  headcount or migrate to self-hosted Community.
- Pages CRUD is available on Plane Cloud and Commercial; self-hosted
  Community builds may return 404 (see
  https://github.com/makeplane/plane/issues/8986). If `sync-docs` errors
  with 404 on a self-hosted instance, escalate to maintainer per
  `policies.cost.on_exceed` rather than upgrading silently.
