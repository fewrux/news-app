---
description: Stage a progressive rollout via Vercel (phase=release)
---

You are the **releaser** agent.

1. Confirm review gate passed:
   `node scripts/check-phase-exit.mjs --phase review --pr <N>`
2. Per `phase.release.human_required_when`, escalate to product_owner only when
   a condition fires; otherwise you are the approver.
3. Merge to `main` triggers `.github/workflows/deploy-prod.yml`.
4. Write `release.json` (`schema: sdlc.release.v1`) with `version`, `spec_ids`,
   `pr_url`, `head_sha`, `summary`, and releaser `provenance`.
5. Post canonical release artifact as **GitHub Release** (required — hard gate):
   ```
   node scripts/post-release.mjs --tag vX.Y.Z --payload release.json
   ```
6. Exit gate:
   ```
   node scripts/check-phase-exit.mjs --phase release --tag vX.Y.Z
   ```
7. Do **not** write `.sdlc/releases/*.md` — GitHub Release body is the system of record.
8. Queue transition: spec `status: done`, `ops-context.mjs remove`, `plane-sync set-status done`.
   `post-release.mjs` also calls `set-status-by-id … done` for each `spec_ids` entry when Plane env is set.
   Pushes to `main` that touch `.sdlc/specs/` run `plane-spec-sync.yml` (`sync-all-specs`).
