---
id: INT-0009
slug: plane-description-formatting
kind: fix
status: accepted
created_at: 2026-05-29T22:00:00Z
provenance:
  agent_id: planner
  model: claude-sonnet-4-6
  prompt_hash: ""
  trace_id: ""
  inputs_digest: ""
plane_issue: ""
---

# Intent — Fix Plane work item description formatting

## Problem

Spec work items synced to Plane show broken bullets and line breaks because
`plane-sync` converts markdown to HTML before posting. Plane's editor ingests
markdown natively via the `description_html` API field — the conversion step
mangles soft-wrapped list items and tables.

## Users

Maintainer and agents reading spec work items in Plane.

## Success metric

Plane issue descriptions for specs render clean four-section markdown bodies
with intact list items and tables.

## Non-goals

Replacing Plane's editor or switching to ProseMirror JSON payloads. HTML
conversion remains only for `sync-docs` (Plane pages).
