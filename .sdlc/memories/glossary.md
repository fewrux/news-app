# Glossary — canonical terms for this project

> Use these terms verbatim across specs, ADRs, code, commits, and PRs.
> Inconsistent terminology fails `gate.review_approved`.

| Term            | Definition                                                                 |
|-----------------|----------------------------------------------------------------------------|
| **Article**     | A news story object with `id`, `category`, `title`, `summary`, `author`, `date`, `readTime`. |
| **Featured**    | The first article in the feed, rendered in the hero block above the list. |
| **Category**    | One of: Technology, Science, Business, Health, World.                     |
| **Brief**       | The product itself ("The Daily Brief"); never use "feed" or "site" instead. |
| **Phase**       | A node in the SDLC graph (ideate, specify, design, …). See `sdlc.yaml`.   |
| **Artifact**    | A typed file written by an agent and stored under `.sdlc/`.                |
| **Gate**        | An automated check a phase must pass before exiting.                       |
| **Provenance**  | The frontmatter block that ties an artifact to the run that produced it.   |
| **Free tier**   | The cost ceiling: $0/month across every service. Never assume paid plans.  |
| **Evidence**    | Browser video + Playwright trace produced by `verify`, consumed by `review`. |
