# Business rules — The Daily Brief

> Product-level rules the agent must obey when implementing user-facing
> features. Distinct from `glossary.md` (terms) and `architecture.md`
> (how it's built). When a rule here conflicts with a spec, the spec
> wins for *that* change and this file is updated in the same PR.

last_updated: 2026-05-25

## Product identity

- **Name (user-visible)**: The Daily Brief.
- **Codename / repo**: news-app.
- **Posture**: a *minimal* news reader. Resist scope creep — the SDLC
  around the product is the actual subject of study (see
  `memories/project.md`).
- **All article content is fictional**, generated to exercise the
  lifecycle. Never imply real reporting.

## Content model

- An **Article** has exactly these fields (per `memories/glossary.md`):
  `id`, `category`, `title`, `summary`, `author`, `date`, `readTime`.
- **Category** is closed-set: Technology · Science · Business · Health · World.
  Adding a category requires an ADR.
- Article bodies are short-form summaries. No full-text articles —
  expanding scope to full bodies requires an intent + spec.

## Surface rules

- The home view (the **Brief**) renders a single **Featured** article in
  a hero block above the list. Featured = `articles[0]` by current
  convention. Changing the selection rule requires a spec.
- Never use "feed" or "site" in copy — only "Brief".
- Dates render in the reader's locale, articles ordered newest-first.

## Hard constraints

- **No personalization, no accounts, no login.** Adding any of these is
  an ADR-worthy architectural change with privacy implications.
- **No PII collected.** PostHog runs with `person_profiles: 'identified_only'`
  + sampled replay. Adding identification requires an ADR and a
  privacy note in the spec.
- **No comments, no social, no email capture.** Same reason.
- **No paid features.** Free tier is the budget — `sdlc.yaml.policies.cost`.

## When in doubt

- Smaller is better. Default to *not* adding a knob.
- If you're considering relaxing a rule above, write a new intent
  (`/intent`) — don't quietly diverge.
