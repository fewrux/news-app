---
id: ADR-0005
title: Replace handoff queue with spec-status queue and create-from-spec/set-status
status: accepted
date: 2026-05-29
spec: SPEC-0004
provenance:
  agent_id: architect
  model: claude-sonnet-4-6
  prompt_hash: ""
  trace_id: ""
  inputs_digest: ""
  created_at: 2026-05-29T12:00:00Z
---

# Context

SPEC-0001 introduced cross-session handoffs (`.sdlc/handoffs/`, `/handoff`,
`create-from-handoff`) as a separate artifact and INDEX queue. Operational
context duplicated history sections. Plane state and spec status diverged from
the queue index.

# Decision

1. **Remove** the handoff artifact, `/handoff` phase, and `.sdlc/handoffs/`.
2. **Unify** pending work on spec frontmatter `status` (Plane-aligned enum) with
   machine lines in `operational-context.md` (`## todo`, `## in_progress` only).
3. **Add** `scripts/ops-context.mjs` for queue CRUD; wire `/spec`, `/implement`,
   `/release` to triple-write spec status, ops-context, and Plane.
4. **Amend ADR-0002 adapter contract**: replace `create-from-handoff` with
   `create-from-spec` and `set-status` on `scripts/plane-sync.mjs`.
5. **Doctor check** `memory.status-sync` replaces `artifact.handoff-index-sync`.

# Consequences

- Simpler operator surface; one id (`SPEC-NNNN`) end-to-end.
- Historical handoff files and SPEC-0001 remain as shipped history; live contract
  no longer references them.
- Plane modules created by old handoffs are left as-is (out of scope).
