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

Spec work items synced to Plane show broken bullets and line breaks. Root cause:
`mdToHtml()` splits markdown list items at soft-wrapped continuation lines,
producing `<ul><li>…</li></ul><p>…</p>` HTML that Plane's editor mangles when
rendering.

## Users

Maintainer and agents reading spec work items in Plane.

## Success metric

Plane issue descriptions for specs render clean four-section bodies with intact
list items and tables (no stray `*` bullets or mid-item line breaks).

## Non-goals

Replacing Plane's editor or switching to ProseMirror JSON payloads.
