---
id: ADR-0001
title: Enforce gate.review_approved via the SDLC artifact, not via GitHub's native review event
status: accepted
date: 2026-05-25
spec: null
provenance:
  agent_id: architect
  model: claude-opus-4-7-thinking-xhigh
  prompt_hash: 459766b6cd4a40dd
  trace_id: ""
  inputs_digest: ""
  created_at: 2026-05-25T20:12:20Z
---

# Context

`sdlc.yaml.gates.review_approved` is owned by the `reviewer` agent. The DSL says the **evidence** for that gate is the artifact at `.sdlc/reviews/PR-<N>.md`, which the reviewer agent writes after evaluating the PR diff against the always-applied rules and phase gates. The reviewer agent's distinct-identity contract is declared at `sdlc.yaml.roles.agents.reviewer.constraints.must_be_distinct_from: implementer` — and is satisfied at the SDLC layer by running the reviewer in a fresh-context subagent (different prompt, different role card, different model run).

Until now, the project also configured GitHub's native `require_review_approved: true` setting (`.sdlc/sdlc.yaml.integrations.github.branch_strategy.protection`). The intent was platform-layer defense-in-depth: GitHub independently confirms an approval exists before a PR can land.

That second-source enforcement broke in practice on this project's solo-maintainer setup. Concrete symptom on PR #2 (`chore/sdlc-discovery`):

- The implementer subagent and the reviewer subagent are distinct **agent runs** with distinct provenance, but both authenticate against GitHub through the same human's local credentials (`fewrux`'s OAuth token from `gh auth login` and git config).
- When the reviewer subagent called `gh pr review 2 --approve`, GitHub's API refused the operation with the self-approval block and downgraded the event to `COMMENTED`.
- The SDLC contract (`.sdlc/reviews/PR-0002.md` carries `verdict: approved`, `provenance.agent_id: reviewer`, `implementer_distinct_from_reviewer: true`) was satisfied. GitHub's mirror of it was not.
- The two checks measure different things: GitHub measures *GitHub principals*, the DSL measures *agent runs*. On a single-human / many-agents setup, the two diverge.

This is not a one-off CI flake — it is a structural mismatch between the platform's identity model and the SDLC's identity model.

# Forces

- `sdlc.yaml.project.constraints.cost.tier == free_only`. Adding a new paid integration (Cursor Cloud Agents for inference billing) or a paid GitHub plan feature to work around the platform-layer block is out of policy.
- Solo maintainer today; the project is an AI-native SDLC sandbox with many agent runs and one human principal. The threat model that platform-layer review enforcement defends against (human-A approving human-B's code without consent) does not apply here.
- Free-tier GitHub Apps (Option A below) are zero-cost but introduce key management and a token-minting plumbing layer.
- The DSL is already authoritative for every other gate (`ci/lint`, `ci/typecheck`, `ci/build`, `ci/e2e`); having one gate enforced via a different mechanism that disagrees with the DSL is a tax on every PR.

# Options

## Option A — Custom GitHub App as the reviewer's identity

Create a free GitHub App (`news-app-reviewer`), install it on the repo, mint short-lived (≤ 10 min) installation tokens at review time, and have the reviewer subagent call `gh pr review` with `GH_TOKEN` set to that token. GitHub then sees `news-app-reviewer[bot]` as a distinct principal from `fewrux`; the platform-layer self-approval block goes away; `require_review_approved` is satisfied natively.

- **Pros**: defense-in-depth at the platform layer; cryptographic identity boundary independent of the maintainer's PAT; native GitHub UI surfacing of the reviewer-bot's actions; aligns with how production AI-native pipelines will likely run in any multi-contributor setup.
- **Cons**: introduces a private key to rotate and store (locally in `.env` for agent runs, in GitHub Actions secrets for CI runs); requires a token-minting helper script (~30 lines of Node); adds plumbing to the reviewer subagent invocation; doesn't help the implementer (who would still post as `fewrux`).
- **Free-tier impact**: zero. GitHub Apps are unlimited on free plans for public and private repos.

## Option B — SDLC artifact is authoritative; drop the platform-layer mirror (CHOSEN)

Replace GitHub's `require_review_approved` with a custom CI job (`ci/review-gate`) that reads `.sdlc/reviews/PR-<N>.md` and asserts the gate's conditions directly. Add `ci/review-gate` to `branch_strategy.protection.require_status_checks`; set `require_review_approved: false`. The reviewer subagent's existing flow (write `.sdlc/reviews/PR-<N>.md`, commit and push to the PR branch) is unchanged. The optional `gh pr review` call becomes informational rather than load-bearing.

- **Pros**: the DSL and the platform-layer agree because the platform-layer is *reading* the DSL artifact; zero new infrastructure or credentials; reproducible across agent harnesses (the artifact is the contract, not any tool-specific identity); the CI job is ~30 lines of bash with no dependencies beyond `awk` + `grep`.
- **Cons**: weaker defense-in-depth — an adversarial agent running with the maintainer's credentials could fabricate a review artifact (though it could equally misuse Option A's App key); the GitHub PR UI shows no "approved by reviewer-bot" badge, only a green `ci / review-gate` status; the parsing logic must be updated in lockstep with the review-file template.
- **Free-tier impact**: zero. One extra CI job per PR, ~5 seconds against the 2000-minute monthly Actions budget.

## Option C — Status quo + ADR documenting the known limitation

Keep `require_review_approved: true` configured; accept that `gh pr review` lands as `COMMENTED`; rely informally on the SDLC artifact; merge PRs by reading the artifact manually.

- **Pros**: zero work.
- **Cons**: the platform check is configured but does not actually enforce anything (manual override required for every merge); the contract and the enforcement diverge silently; every merge requires a "remember to check the review artifact" step which is exactly the kind of human-loop the SDLC is trying to eliminate.
- **Free-tier impact**: zero.

# Decision

**Option B.** The DSL is already the source of truth for every other gate in this project. Making the platform-layer agree with the DSL — by reading the DSL artifact — is more honest than maintaining a second-source check whose identity model contradicts the first.

The defense-in-depth gain from Option A is real but does not justify its mechanical cost in a solo-maintainer setup. If/when a second human contributor joins, Option A becomes additive (it would be layered *on top of* `ci/review-gate`, not replace it) and an ADR superseding the relevant pieces of this one will be written at that time.

# Consequences

## Positive

- `gate.review_approved` is enforced in a way that matches the DSL's own model of identity and authority.
- New PRs land cleanly without the maintainer hand-overriding GitHub's self-approval block.
- The review artifact (already produced by every reviewer agent run) is now load-bearing in CI, not merely advisory — which raises its quality bar and creates a strong incentive for the reviewer subagent's prompt and role card to stay aligned with the gate's parsing.
- Other agent harnesses (Codex, Aider, Claude Code, Gemini CLI) automatically inherit the gate by writing the same artifact; no per-tool integration plumbing.

## Negative

- A compromised agent running with the maintainer's credentials could write `verdict: approved` itself. This is mitigated by:
  - The provenance frontmatter (`agent_id`, `model`, `prompt_hash`, `trace_id`) being committed to git — every approval has a tamper-evident audit trail.
  - The reviewer agent's role card being separate from the implementer's, so a *correctly running* agent will not self-approve.
  - The `afterFileEdit` hook (`.cursor/hooks/lint-touch.mjs`) logging every touched path under `.sdlc/reports/touched.log`.
- The GitHub PR UI does not show a green "approved by" badge — only the `ci / review-gate` check.
- The `ci/review-gate` job's parser is regex-based for simplicity. If the review-file template evolves significantly (e.g. the `verdict` field is renamed), the workflow must be updated in lockstep. The current parser checks four fields explicitly (`verdict`, `provenance.agent_id`, `implementer_distinct_from_reviewer`, `pr_id`).

## Follow-up work this creates

1. **Branch-protection API update** — the `require_status_checks` set on `main` in GitHub itself must be updated (out-of-band of this PR) to add `ci/review-gate` to the required checks and drop the `require_pull_request_reviews` toggle. Done via `gh api -X PATCH /repos/fewrux/news-app/branches/main/protection` after this PR lands on `main` (the workflow must exist on `main` before it can be required).
2. **Reviewer agent role-card alignment** — `.cursor/agents/reviewer.md` should explicitly state that the `.sdlc/reviews/PR-<N>.md` artifact is the load-bearing gate evidence (not the `gh pr review` call), and pin the frontmatter schema the gate parses.
3. **Bootstrap caveat** — the very first CI run on any PR will fail the `ci/review-gate` check because the reviewer subagent has not yet committed the review file. This is the expected flow; the check turns green once the reviewer subagent's commit lands. Worth documenting in `.cursor/commands/review.md`.
4. **Future review-file template changes** must be co-modified with `.github/workflows/ci.yml`'s parser. A small `test-review-gate` job that runs the parser against `.sdlc/reviews/` fixtures would catch divergence — track as a possible `chore/test-review-gate` follow-up.
5. **If a second human contributor joins**, revisit Option A. Layering a GitHub App on top of `ci/review-gate` (not replacing it) would restore platform-layer defense-in-depth without invalidating this decision.
