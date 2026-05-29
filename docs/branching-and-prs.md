# Branching and PRs

This project is **trunk-based**. `main` is the only long-lived branch
and it is **protected**. The rules below are non-negotiable for every
actor — human or agent. The contract lives in
`.sdlc/sdlc.yaml.integrations.github.branch_strategy.protection` and the
prose rule is [`.cursor/rules/branch-discipline.mdc`](../.cursor/rules/branch-discipline.mdc).

Mechanical enforcement: `.cursor/hooks/guard-shell.mjs`
(`beforeShellExecution`).

## Hard rules

1. **Never `git push` to `main`.** Not `git push origin main`, not
   `git push -u origin main`, not `git push --force ... main`. The hook
   blocks these patterns; do not try to work around them.
2. **All work happens on a short-lived branch.**
   - `feat/<spec-slug>` for new features
   - `fix/<spec-slug>` for bug fixes
   - `chore/<slug>` for refactors, deps, docs
   - `hotfix/<incident-id>` for production hotfixes
3. **`/verify` before the draft PR.** Product-surface work: Playwright pass +
   Plane evidence posted, then `gh pr create --draft`. Operator-surface work:
   verify waiver report, then open the PR. Never mix product and operator
   paths in one PR (`node scripts/classify-diff.mjs --strict`).
4. **No history rewrites on `main`.** No `--amend`, no `rebase -i`, no
   `push --force` against `main` or any branch sourced by a merged PR.
5. **Promotion to `main` is by squash-merge of an approved PR.** The
   `release` phase deploys whatever lands on `main`; there is no
   separate "promote" step.

## Required PR shape (`sdlc.yaml.invariants`)

Every PR carries:

- A **Plane issue** link (created via `scripts/plane-sync.mjs`).
- A **Vercel preview URL** (auto-posted when applicable).
- **Browser evidence:** Plane comment URL on the issue (product surface) or
  explicit waiver in the reviewer artifact (operator surface).
- A **review approval** from the reviewer agent identity, which must be
  distinct from the implementer
  (`reviewer.constraints.must_be_distinct_from: implementer`).

A PR missing any of those is not mergeable. The reviewer agent rejects
on sight.

## Branch protection (the contract)

`sdlc.yaml.integrations.github.branch_strategy.protection`:

- `require_status_checks: [ci/lint, ci/typecheck, ci/build, ci/review-gate]`
- `require_review_approved: true` (the reviewer agent provides this)
- `disallow_force_push_to_main: true`

That contract is binding on **every actor**. There is no bypass list.
The maintainer does not push directly; the agents do not push directly.
Everything goes through a PR.

## Commit conventions

From [`.cursor/rules/commit-conventions.mdc`](../.cursor/rules/commit-conventions.mdc):

```
<type>(<scope>): <imperative summary>

<body explaining why, not what>

Refs: SPEC-XXXX, INT-XXXX, plane:<issue-id>
Trace: <LangSmith trace_id or "n/a">
```

**Types**: `feat`, `fix`, `chore`, `docs`, `refactor`, `test`, `perf`,
`ci`, `revert`.

**Example**:

```
feat(home): show featured story above the fold

Improves first-paint hero block per SPEC-0007. Validated by
tests/e2e/home.spec.ts::featured story renders.

Refs: SPEC-0007, INT-0006, plane:NEWS-12
Trace: 7f3e1a2b-...-langsmith
```

**Hard rules**:

- One logical change per commit.
- Never use `--no-verify` or skip hooks.
- Never commit while checked out on `main` (hook blocks it).
- Never force-push (no `--force`, no `--force-with-lease`) on any
  branch sourced by a merged PR.
- Subject line ≤ 72 chars, imperative mood, no trailing period.

## When in doubt

Open a draft PR and stop. Ask the maintainer in the PR description
rather than pushing to `main` to "fix it quickly". The fastest path
through this project is the protected one.
