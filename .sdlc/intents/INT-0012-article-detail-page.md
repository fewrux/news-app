---
id: INT-0012
slug: article-detail-page
kind: feature
status: accepted
created_at: 2026-05-29T16:58:59Z
provenance:
  agent_id: planner
  model: claude-4.6-sonnet-medium-thinking
  prompt_hash: ""
  trace_id: ""
  inputs_digest: ""
plane_issue: ""
---

# Intent — Article detail page on the Brief

## Problem

The Brief lists article summaries on the home view, but readers cannot open an
individual story. Every headline is dead text — there is no focused reading view
or shareable deep link for a single Article.

## Users

Anyone browsing The Daily Brief who wants to read one story in isolation (e.g.
after clicking a headline from the home list or opening a direct URL).

## Success metric

`article_viewed` events appear in PostHog with `article_id` and `category`
properties when a detail page loads (per
`sdlc.yaml.integrations.posthog.events_taxonomy`). Target: at least one
`article_viewed` per detail-page session in `/verify` browser evidence.

## Non-goals

- Full article bodies (summaries only; per business rules).
- Search, sharing UI, accounts, or personalization.
- CMS, API, or database — data stays in-repo static module.
- Changing Featured selection rules.
