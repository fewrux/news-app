# Free-tier policy

`sdlc.yaml.policies.cost.tier == free_only`. The total monthly budget
for this project is **$0**. Any change that would push a service past
its free quota must `pause_and_escalate` to the maintainer.

Prose rule: [`.cursor/rules/free-tier-only.mdc`](../.cursor/rules/free-tier-only.mdc).

## Concrete quotas

| Service     | Plan         | Limit                                                              |
|-------------|--------------|--------------------------------------------------------------------|
| GitHub Actions | private repo | 2,000 minutes / month (unlimited on public)                    |
| GitHub storage | —          | 0.5 GB                                                             |
| Vercel      | Hobby        | 100 GB bandwidth, 100k serverless invocations, 6,000 build minutes |
| PostHog     | free         | 1M events, 5k session replays, 250 survey responses / month        |
| Plane       | Cloud Free   | ≤ 12 users                                                         |
| LangSmith   | free         | 5k traces / month                                                  |
| LLM         | —            | free models or provider trial credits only                         |

Mirrored in `sdlc.yaml.policies.cost.free_quotas`.

## Implementation guardrails

These are the project-level guardrails that keep us under the quotas:

- **GitHub Actions** — prefer fast jobs and aggressive caching. Public
  repo lifts the Actions minutes limit; `notes` in the DSL explicitly
  recommends "prefer public repo".
- **Vercel** — Hobby is *personal/non-commercial only*. No serverless
  fan-out, no `vercel scale` (the `beforeShellExecution` hook denies
  `vercel scale` and `vercel deploy --prod --scale`).
- **PostHog** — `session_replay.sample_rate: 0.1` to respect the 5k
  monthly replay quota. `autocapture: true` but no
  `mask_all_inputs: false` (we keep PII out of replays).
- **Plane** — sync script (`scripts/plane-sync.mjs`) is the only writer;
  it caps label fetches at `per_page=100`. If a user count would exceed
  12, migrate to self-hosted Community.
- **LangSmith** — trace project = `news-app`; enabled only when
  `TRACE_TO_LANGSMITH=true`. Retention 90 days.
- **LLM** — agents use free or trial-credit models only.

## Before adding a dependency or service

Per `.cursor/rules/free-tier-only.mdc`:

1. Confirm a free tier exists and is sufficient for expected scale.
2. Add the quota to `sdlc.yaml.policies.cost.free_quotas`.
3. Wire a usage check or alert if available; otherwise note it in the
   spec's `risks` section.

If you cannot stay within free tier, **write an ADR proposing the
change and stop** — do not ship.

## On exceed

`sdlc.yaml.policies.cost.on_exceed`:

```yaml
action: pause_and_escalate
escalate_to: maintainer
```

The agent must surface the quota breach to the maintainer rather than
silently overspend. It is one of the enumerated `pause_on` triggers in
`sdlc.yaml.policies.autonomy.pause_on`.
