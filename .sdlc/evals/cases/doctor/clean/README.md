---
title: Doctor clean fixtures
provenance:
  agent_id: tester
  model: ""
  prompt_hash: ""
  trace_id: ""
  inputs_digest: ""
  created_at: 2026-05-28T00:00:00Z
---

# Doctor clean fixtures

Files in this directory describe invariants that must hold on a tree with no
`fail`-severity drift beyond the known AC-11 smoke-test items
(`struct.hook-registry-matches-config`, optionally `artifact.legacy-plane-issue`
as `warn`).

The eval case `clean-exit-shape.json` asserts the mechanical report shape and
that structural / cost checks (except the deliberate hook-registry drift) pass.
