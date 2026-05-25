---
id: PM-XXXX
incident: INC-XXXX
date: YYYY-MM-DD
authors: [operator, maintainer]
provenance:
  agent_id: operator
  model: ""
  prompt_hash: ""
  trace_id: ""
  inputs_digest: ""
---

# Postmortem — <incident title>

> Blameless. Focus on systems and signals, not people or agents.

## What happened
A factual narrative of the incident.

## Root cause
The smallest defect that, if absent, would have prevented the impact.

## What went well
- Detection latency, rollback automation, clarity of trace, etc.

## What went poorly
- Gaps in gates, evals, telemetry, or runbook.

## Action items
| ID | Action                                | Owner    | Due  | Plane issue |
|----|---------------------------------------|----------|------|-------------|
| 1  | Add eval case                         | learner  | T+2d |             |
| 2  | Add telemetry assertion               | tester   | T+5d |             |
