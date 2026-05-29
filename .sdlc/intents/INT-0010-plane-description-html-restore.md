---
id: INT-0010
slug: plane-description-html-restore
kind: fix
status: accepted
created_at: 2026-05-29T23:00:00Z
provenance:
  agent_id: planner
  model: claude-sonnet-4-6
  prompt_hash: ""
  trace_id: ""
  inputs_digest: ""
plane_issue: ""
---

# Intent — Restore HTML for Plane work item descriptions

## Problem

SPEC-0008 sent raw markdown to Plane's `description_html` field. Plane's
Tiptap editor requires HTML — raw markdown renders as a single unformatted
plain-text block. The original HTML path also broke soft-wrapped list items
until `joinListContinuations()` merges them before conversion.

## Users

Maintainer and agents reading spec work items in Plane.

## Success metric

Plane spec issues render four formatted sections (headings, lists, tables) with
no stray bullets and no raw markdown syntax visible.

## Non-goals

ProseMirror JSON payloads or Plane live-server convert endpoints.
