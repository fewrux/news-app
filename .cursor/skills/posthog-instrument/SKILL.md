---
name: posthog-instrument
description: Adds or audits PostHog event capture and session replay for user-facing changes. Use when implementing a new user flow, adding a CTA, or when the user mentions analytics, telemetry, events, or session replay.
---

# PostHog instrumentation

PostHog is the project's free-tier observability service. Capture is wired in
`lib/posthog/client.ts` and `app/providers.tsx`.

## Event taxonomy

The canonical events live in `sdlc.yaml.integrations.posthog.events_taxonomy`.
Match an existing event before inventing a new one.

```ts
import { posthog } from "@/lib/posthog/client";

posthog?.capture("article_viewed", {
  article_id: article.id,
  category: article.category,
});
```

## Adding a new event

1. Propose it in the spec's `Acceptance criteria`.
2. Add it to `sdlc.yaml.integrations.posthog.events_taxonomy` (small ADR if
   unclear).
3. Capture it from a Client Component (event capture cannot run in Server
   Components).
4. Validate it appears in the PostHog UI within one session.

## Free-tier guards

- 1M events/month — do not capture per-render or per-scroll.
- 5k session replays/month — `sample_rate` is set to 0.1 in
  `sdlc.yaml.integrations.posthog.capture.session_replay`. Do not raise it.
- `mask_all_inputs: true` — never disable; this protects PII per
  `policies.privacy`.

## Privacy

Never pass user-typed strings as event properties without considering PII.
If unsure, hash or omit the value.
