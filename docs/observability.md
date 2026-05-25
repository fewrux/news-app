# Observability

Two telemetry surfaces:

- **PostHog** — product analytics + session replay (what users do).
- **LangSmith** — agent tracing (what agents do).

Both run on free tiers; the sampling rates and retention windows are
declared in `sdlc.yaml.integrations` and never raised without an ADR.

## PostHog

### Wiring

- Browser init: [`instrumentation-client.ts`](../instrumentation-client.ts)
  loads [`lib/posthog/client.ts`](../lib/posthog/client.ts) with
  `NEXT_PUBLIC_POSTHOG_KEY` and `NEXT_PUBLIC_POSTHOG_HOST`.
- API host default: `https://us.i.posthog.com`.
- Server-side reads (rare): `POSTHOG_PERSONAL_API_KEY`.

### Capture (free-tier safe)

`sdlc.yaml.integrations.posthog.capture`:

- `autocapture: true`
- `pageviews: true`
- `web_vitals: true`
- `session_replay`:
  - `enabled: true`
  - `sample_rate: 0.1` — respects the 5k/month replay quota
  - `mask_all_inputs: true` — keeps PII out of replays

Never set `autocapture` to crawl every interaction; that would blow the
1M-event/month quota on a busy day. See
[free-tier-policy.md](./free-tier-policy.md).

### Event taxonomy (the canonical names)

Use these names verbatim — the reviewer agent rejects ad-hoc event
names. From `events_taxonomy`:

| Event              | Required props                       |
|--------------------|--------------------------------------|
| `article_viewed`   | `article_id`, `category`             |
| `article_shared`   | `article_id`, `channel`              |
| `search_performed` | `query`, `results_count`             |

Adding an event = update the DSL first, then implement. The
[`posthog-instrument` skill](../.cursor/skills/posthog-instrument/SKILL.md)
covers the implementation pattern.

### SLO signals (release-phase gate inputs)

`sdlc.yaml.integrations.posthog.slo_signals`:

- `error_rate` ← `posthog.metric("$exception")`
- `p95_latency_ms` ← `posthog.metric("$web_vitals_LCP", percentile=95)`

The releaser agent consults these in real time to decide
`canary_5pct → canary_25pct → full` promotion vs. rollback. See
[deployment.md](./deployment.md).

## LangSmith

### Wiring

`sdlc.yaml.observability.tracing`:

- `provider: langsmith`
- `project: ${env:LANGCHAIN_PROJECT}` — currently `news-app`
- `enabled_when: ${env:TRACE_TO_LANGSMITH}` — set to `true` to enable
- `attach_to: all_agent_runs`
- `retention_days: 90`

### What gets traced

Every agent invocation — `/intent`, `/spec`, `/adr`, `/implement`,
`/verify`, `/review`, `/release`, `/incident`, `/learn` — produces a
LangSmith run id. The run id is then carried in the produced artifact's
provenance frontmatter:

```yaml
provenance:
  agent_id: implementer
  model: <concrete model slug>
  prompt_hash: <sha256>
  trace_id: <LangSmith run id>
  inputs_digest: <sha256>
  created_at: <ISO-8601 UTC>
```

See [provenance.md](./provenance.md). The reviewer agent rejects
artifacts whose `trace_id` is fabricated.

### Quota

Free tier = **5k traces/month**. Currently the SDLC fits comfortably
inside that envelope. Any addition that would push us over (e.g. an
always-on eval loop) must `pause_and_escalate`.

## Metrics tracked at the lifecycle level

`sdlc.yaml.observability.metrics`:

| Metric              | Dimensions / definition                                                    |
|---------------------|----------------------------------------------------------------------------|
| `agent_runs`        | `[agent_id, phase, model, outcome]`                                        |
| `gate_outcomes`     | `[gate, phase, outcome]`                                                   |
| `cycle_time`        | from `ideate.start` to `release.full`                                      |
| `rework_rate`       | phase re-entries / total phase runs                                        |
| `escape_defects`    | incidents linked to a release                                              |

The learner agent reads these on a weekly cadence
(`sdlc.yaml.feedback.cadence: weekly`) and proposes rule updates and
eval cases.

## Dashboards

| Surface       | URL                                                  |
|---------------|------------------------------------------------------|
| PostHog       | _set after first deploy_ (recorded in `.sdlc/memories/project.md`) |
| Vercel        | _set after first deploy_                             |
| Plane         | _set after workspace is configured_                  |
| LangSmith     | `https://smith.langchain.com/o/<org>/projects/p/news-app` |

The first three are filled in by the maintainer once provisioned;
LangSmith is wired now.
