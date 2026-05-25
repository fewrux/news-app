---
name: plane-sync
description: Creates or updates Plane issues from SDLC artifacts (intents, specs, incidents) using the Plane REST API. Use when the user asks to sync an intent or spec to Plane, file a Plane issue from an incident, or check Plane mappings.
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

| Artifact          | Plane object | Default state | Labels       |
|-------------------|--------------|---------------|--------------|
| artifact.intent   | issue        | backlog       | [intent]     |
| artifact.spec     | issue        | todo          | [spec]       |
| artifact.incident | issue        | in_progress   | [incident]   |
| phase.release     | cycle        | auto-close    | —            |

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

## Free-tier guard

Plane Cloud Free supports ≤ 12 users. Before adding a user, confirm headcount
or migrate to self-hosted Community.
