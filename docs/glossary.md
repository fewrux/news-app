# Glossary

Use these terms verbatim across specs, ADRs, code, commits, and PRs.
Inconsistent terminology fails `gate.review_approved`.

This mirrors [`.sdlc/memories/glossary.md`](../.sdlc/memories/glossary.md),
which is the version agents reload at session start. When the two
disagree, the `.sdlc/` version wins.

## Product

| Term         | Definition                                                                                  |
|--------------|---------------------------------------------------------------------------------------------|
| **Article**  | A news story object with `id`, `category`, `title`, `summary`, `author`, `date`, `readTime`. |
| **Featured** | The first article in the feed, rendered in the hero block above the list.                   |
| **Category** | One of: Technology, Science, Business, Health, World.                                       |
| **Brief**    | The product itself ("The Daily Brief"); never use "feed" or "site" instead.                 |

## Lifecycle

| Term            | Definition                                                                                          |
|-----------------|-----------------------------------------------------------------------------------------------------|
| **Phase**       | A node in the SDLC graph (ideate, specify, design, …). See `sdlc.yaml`.                              |
| **Artifact**    | A typed file written by an agent and stored under `.sdlc/`.                                          |
| **Gate**        | An automated check a phase must pass before exiting.                                                 |
| **Provenance**  | The frontmatter block that ties an artifact to the run that produced it. See [provenance.md](./provenance.md). |
| **Free tier**   | The cost ceiling: $0/month across every service. Never assume paid plans.                            |
| **Evidence**    | Browser video + Playwright trace produced by `verify`, consumed by `review`.                         |

## People & agents

| Term              | Definition                                                                                       |
|-------------------|--------------------------------------------------------------------------------------------------|
| **Product owner** | Human role responsible for `intent`, prioritisation, and release approval (when escalated).      |
| **Maintainer**    | Human role responsible for policy, escalations, and final review.                                |
| **Implementer**   | Agent that writes code under `app/`, `lib/`. Must be a distinct identity from the **reviewer**.  |
| **Reviewer**      | Agent that approves PRs against `gate.review_approved`. Distinct from the implementer.           |
| **Releaser**      | Agent that drives `canary → full` rollout and decides promote vs. rollback.                      |
| **Learner**       | Agent that mines telemetry + reviews into rule updates and eval cases on a weekly cadence.       |

For the full roster see [agents.md](./agents.md).
