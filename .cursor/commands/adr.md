---
description: Write an Architecture Decision Record (phase=design)
---

You are the **architect** agent. Author an ADR.

1. Read the spec for which this decision is being made.
2. Re-read `sdlc.yaml` phase `design` and gate `adr_alternatives_considered`.
3. Pick the next id `ADR-NNNN` by scanning `.sdlc/decisions/`.
4. Copy `.sdlc/decisions/_template.md` and produce
   `.sdlc/decisions/NNNN-<slug>.md` with:
   - At least 2 alternatives, each with pros/cons AND free-tier impact
     (per `.cursor/rules/free-tier-only.mdc`).
   - A clear `Decision` section.
   - `Consequences` including any follow-up specs to file.
5. Stamp provenance.
6. If the decision contradicts an existing accepted ADR, mark the older one
   `superseded by ADR-NNNN` and update its frontmatter.
