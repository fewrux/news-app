---
id: INT-XXXX
slug: short-kebab-slug
kind: feature | bug | chore | incident
status: draft | accepted | rejected
created_at: YYYY-MM-DDTHH:MM:SSZ
provenance:
  agent_id: planner
  model: ""
  prompt_hash: ""
  trace_id: ""
  inputs_digest: ""
plane_issue: ""        # set by integrations.plane.sync_script
---

# Intent — <short title>

## Problem
What is the user (or operator) trying to do, and what is currently broken or missing?

## Users
Who experiences this? Be specific about segments and contexts.

## Success metric
A measurable signal we will check in `phase.learn`. Prefer PostHog events or
Vercel/build metrics. Example: `article_viewed` rate up 15% week-over-week.

## Non-goals
What this intent will NOT cover, to keep scope small.
