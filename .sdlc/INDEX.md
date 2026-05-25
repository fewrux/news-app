# `.sdlc/` — Index

This directory is the project's durable, AI-readable memory. Humans and agents
both read it. The contract is `sdlc.yaml`; everything else is an artifact
produced or consumed by a phase declared in that contract.

> If you're new here, read in this order:
> 1. `sdlc.yaml` (the contract)
> 2. `memories/project.md` (invariant facts)
> 3. **`memories/operational-context.md`** (what's in flight right now — read this every session before touching anything)
> 4. `memories/architecture.md` (orientation + pointers to ADRs)
> 5. `memories/business-rules.md` (product rules for The Daily Brief)
> 6. `memories/glossary.md` (canonical terms)
> 7. `memories/incidents.md` (open + recently resolved incidents)
> 8. `memories/lessons.md` (durable learnings)
> 9. The template under the folder you're about to write into.

## Map

```
.sdlc/
├── sdlc.yaml              The DSL — single source of truth
├── INDEX.md               This file
├── intents/               Raw user/operator intent (kind + success metric)
├── specs/                 Testable specs derived from intents
├── decisions/             ADRs — architectural decisions, immutable history
├── contracts/             TS / zod schemas — machine-checkable interfaces
├── evals/
│   └── cases/             JSON regression cases pinned by the learner
├── reports/               CI run output (videos, traces, JSON)  [NOT versioned]
├── reviews/               Review verdicts produced by the reviewer agent
├── releases/              Release notes (one per Vercel production deploy)
├── incidents/             Incident records (timeline + mitigation)
├── postmortems/           Blameless postmortems linked to incidents
├── rules/                 SDLC-level prose rules (long-form)
└── memories/              Project knowledge reloaded each session
    ├── project.md                Invariant facts
    ├── operational-context.md    Rolling status — in-progress + recently completed (capped, not a log)
    ├── architecture.md           Orientation + pointers to ADRs
    ├── business-rules.md         Product rules for The Daily Brief
    ├── glossary.md               Canonical terminology
    ├── incidents.md              Rolling digest of open + recently resolved incidents
    └── lessons.md                Appended by `phase.learn`
```

## Per-folder reference

| Folder | Owner agent     | Phase            | Template                                | Versioned? |
|--------|-----------------|------------------|-----------------------------------------|------------|
| `intents/`     | planner   | ideate           | `intents/_template.md`                  | yes |
| `specs/`       | planner   | specify          | `specs/_template.md`                    | yes |
| `decisions/`   | architect | design           | `decisions/_template.md`                | yes |
| `contracts/`   | architect | design           | —                                       | yes |
| `evals/cases/` | learner   | verify, learn    | `evals/cases/_template.json`            | yes |
| `reports/`     | tester    | verify           | —                                       | **no** |
| `reviews/`     | reviewer  | review           | —                                       | yes |
| `releases/`    | releaser  | release          | —                                       | yes |
| `incidents/`   | operator  | operate          | `incidents/_template.md`                | yes |
| `postmortems/` | operator  | operate          | `postmortems/_template.md`              | yes |
| `rules/`       | learner   | learn            | —                                       | yes |
| `memories/`    | learner   | learn (lessons)  | —                                       | yes |

`reports/` is intentionally not versioned — see the project's `.gitignore`
and `phase.verify` for why (large, regenerable, uploaded as CI artifacts).

## Human-readable companion

For the friendly tour that doesn't require reading YAML, see
[`docs/`](../docs/README.md) at the repo root. Every Markdown file
under `docs/` is mirrored to Plane as a native page on push to `main`
(`.github/workflows/docs-sync.yml`). The contract here is still
authoritative when the two disagree.

## How to write here

Always go through a slash command — they enforce the right phase, gates, and
provenance:

| Command       | Writes into             |
|---------------|-------------------------|
| `/intent`     | `intents/INT-NNNN-*.md` |
| `/spec`       | `specs/SPEC-NNNN-*.md`  |
| `/adr`        | `decisions/NNNN-*.md`   |
| `/implement`  | `app/`, `lib/` (not `.sdlc/`) |
| `/verify`     | `evals/cases/`, `reports/<run_id>/` |
| `/review`     | `reviews/<pr_id>.md`    |
| `/release`    | `releases/<version>.md` |
| `/incident`   | `incidents/INC-XXXX.md` |
| `/learn`      | `rules/`, `evals/cases/`, `memories/lessons.md`, new intents |

See `.cursor/INDEX.md` for the full operator surface (rules, hooks, agents,
skills) that drives this directory.

## Provenance

Every artifact under `.sdlc/` (except templates and reports) MUST carry the
provenance frontmatter defined in `sdlc.yaml.artifacts.common_provenance`.
Reviewer agents reject silent omissions; explicit empty values are accepted
when a field is genuinely unknown. See `.cursor/skills/provenance-stamp/`.

## Free-tier reminder

Anything that requires a paid plan must `pause_and_escalate` per
`policies.cost.tier == free_only`. Add the new quota to
`sdlc.yaml.policies.cost.free_quotas` before consuming it.
