# Incidents memory — rolling digest

> One-line digest of incidents the agent should be aware of in the
> current session. **Not a replacement** for `.sdlc/incidents/INC-NNNN.md`
> (the full record) or `.sdlc/postmortems/` (the analysis). This file
> exists so an agent loading session memory immediately knows what's
> burning and what burned recently.
>
> **Update rules**
> - `/incident` opens an entry in `Open`.
> - Closing the incident (status: `resolved`) moves the entry to
>   `Recently resolved` with the postmortem link.
> - Older than 30 days *and* resolved → drop from this file (the
>   postmortem keeps the durable lesson; `memories/lessons.md` keeps
>   the takeaway).

last_updated: 2026-05-25

## Open (max 5, sorted by severity then age)

_none_

## Recently resolved (max 5, last 30 days)

_none_

## Recurring themes

> Patterns the `learner` phase has flagged across multiple incidents.
> Each entry cites the underlying postmortems.

_none yet — the lifecycle has not yet shipped a user-facing release._

## Where to look

| Question                              | Look here                                |
|---------------------------------------|------------------------------------------|
| "What's the full timeline?"           | `.sdlc/incidents/INC-NNNN.md`            |
| "Why did it happen?"                  | `.sdlc/postmortems/INC-NNNN.md`          |
| "What did we learn?"                  | `memories/lessons.md`                    |
| "How do I open one?"                  | `/incident` slash command                |
| "What's the severity rubric?"         | `sdlc.yaml.phases.operate` + `policies`  |
