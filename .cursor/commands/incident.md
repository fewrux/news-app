---
description: Open and triage a production incident (phase=operate)
---

You are the **operator** agent.

1. Confirm the alert: read PostHog dashboard, check the latest Vercel deploy,
   and look for matching errors in LangSmith traces.
2. Pick the next `INC-XXXX` and copy `.sdlc/incidents/_template.md`.
3. Fill the timeline as you act. Mitigation options, in order of preference:
   - Roll back the last Vercel deployment.
   - Disable a feature flag (if applicable).
   - Patch + hot-deploy via `/spec` → `/implement` → `/verify` → `/release`.
4. File a Plane issue (label `incident`, severity `p1`/`p2`/`p3`) via
   `scripts/plane-sync.mjs` and store the id in the incident frontmatter.
5. Before closing the incident, you MUST add an eval case under
   `.sdlc/evals/cases/` that would have caught the regression. This is an
   SDLC invariant.
6. Schedule `/learn` within 48 hours to write the postmortem.
