---
provenance:
  agent_id: reviewer
  model: claude-opus-4-7-thinking-xhigh
  prompt_hash: ""
  trace_id: ""
  inputs_digest: ""
  created_at: 2026-05-25T20:17:59Z
pr_id: 4
pr_url: https://github.com/fewrux/news-app/pull/4
head_sha: 689b70282ae045c70d4b077b6cd0802ebc70d5e8
base: main
head: chore/sdlc-review-gate
implementer_distinct_from_reviewer: true
verdict: approved
confidence: 0.92
human_required: false
---

# Review — PR #4: chore(sdlc): enforce gate.review_approved via SDLC artifact (ADR-0001)

## Summary

Bootstrap PR for the new authoritative platform-layer enforcement of
`gate.review_approved`. Replaces GitHub's native `require_review_approved`
with a CI job (`ci/review-gate`) that reads `.sdlc/reviews/PR-<N>.md` and
asserts four frontmatter fields directly. Four files changed, +169 / -4 —
well under the 400-LOC autonomy tripwire
(`sdlc.yaml.policies.autonomy.pause_on`). The DSL, the rule, the workflow,
and the ADR are coherent with each other; the bootstrap caveat (this PR's
own first CI run will fail until *this* commit lands) is explicitly
disclosed in both the ADR's "Consequences → Follow-up work #3" and the
PR body's "Bootstrap caveat" section.

## Verdict

**approved**

No conditional-human-required clause from
`sdlc.yaml.phases.review.human_required_when` fires (see "Conditional
human escalation" below). The reviewer-agent's autonomous approval is
sufficient for `gate.review_approved`.

## Confidence

`0.92`

High because: (1) the workflow's parser was simulated locally during this
review against the exact frontmatter of this artifact and the four
assertions all PASS (see "Parser correctness" below); (2) edge-case probes
confirmed no false positives on `verdict: not approved`,
`verdict: approved-with-conditions`, `verdict: Approved`, `pr_id: 42`,
`pr_id: "4"`, or top-level `agent_id: reviewer`; (3) CRLF tolerance is
preserved by the POSIX `[[:space:]]` class; (4) the diff is small,
declarative, and changes no untrusted-code-execution surface.

Short of 1.0 because: this is a meta-policy change (the gate's *meaning*
shifts), and the parser is purely textual rather than YAML-structural —
future schema evolution requires manual lockstep with
`.github/workflows/ci.yml`. ADR-0001's Follow-up #4 already tracks this
as `chore/test-review-gate`.

## Gate evaluation: `gate.review_approved`

Per `sdlc.yaml.gates.review_approved.requires`:

| Sub-gate                 | Status | Evidence                                                                              |
| ------------------------ | ------ | ------------------------------------------------------------------------------------- |
| `no_blockers`            | pass   | No security regression, no data-loss risk, no policy violation, no functional regression. The new `review-gate` job is bash-only (`set -euo pipefail`, `awk`, `grep`), runs no untrusted code, accesses no secrets, and writes nothing to the repo. |
| `conventions_followed`   | pass   | Single commit `689b702`, Conventional Commits format, subject 70 chars (`chore(sdlc): enforce gate.review_approved via SDLC artifact (ADR-0001)`), body explains *why* not *what*, `Refs: ADR-0001, PR #2`, `Trace: n/a`. Per `.cursor/rules/commit-conventions.mdc`. |
| `provenance_present`     | pass   | The new ADR `.sdlc/decisions/0001-sdlc-review-gate-via-artifact.md` carries a complete `provenance:` block (`agent_id: architect`, `model: claude-opus-4-7-thinking-xhigh`, `prompt_hash: 459766b6cd4a40dd`, `trace_id: ""`, `inputs_digest: ""`, `created_at: 2026-05-25T20:12:20Z`). Empty `trace_id` and `inputs_digest` are honest-empty, not fabricated, per `.cursor/rules/provenance.mdc` and `.cursor/skills/provenance-stamp/SKILL.md` ("Empty string `\"\"` is acceptable when a value is genuinely unknown. Fabrication is a blocker"). |
| `free_tier_respected`    | pass   | One additional CI job per PR, ~5 seconds wall time, no new actions, no new dependencies. Negligible against `policies.cost.free_quotas.github.actions_minutes_per_month: 2000`. Zero impact on Vercel / PostHog / LangSmith / Plane quotas. |

## Reviewer-contract checks

- Branch is **not** `main`: `chore/sdlc-review-gate`. ✓
- Forward-only history; no force-push; no admin bypass. ✓
- No `git push` to `main` in this branch's commit log (`git log --oneline -10` shows only `689b702` on top of `f39c7ca` from `main`). ✓
- Reviewer distinct from implementer: this is a fresh-context subagent run, satisfying `sdlc.yaml.roles.agents.reviewer.constraints.must_be_distinct_from: implementer` by construction. ✓

## Special-concern checks (per the user's contract)

### 1. Is the ADR's argument sound? Is Option B the right choice?

Yes. The threat model is honestly stated and complete for the current
context:

- The original threat that platform-layer review enforcement defends
  against (a malicious *human* approving another human's code) does not
  apply on a solo-maintainer setup. The DSL acknowledges this in
  ADR-0001 § "Forces" ("Solo maintainer today; … one human principal").
- The structural mismatch between GitHub's identity model (principals)
  and the DSL's identity model (agent runs) is correctly diagnosed in §
  "Context" with concrete evidence from PR #2.
- Three options are compared (Option A: GitHub App; Option B: SDLC
  artifact authoritative; Option C: status quo). Each has explicit
  pros/cons and a free-tier-impact note. This satisfies
  `gate.adr_alternatives_considered` (`asserts: ADR lists >= 2 alternatives with trade-offs`).
- The disclosed weakening of defense-in-depth ("an adversarial agent
  running with the maintainer's credentials could fabricate a review
  artifact") is mitigated by three concrete controls (provenance
  audit-trail in git, separate role cards for implementer vs. reviewer,
  `afterFileEdit` hook touched-path log) that are listed in §
  "Consequences → Negative". The mitigation is honest about being
  mitigation rather than elimination.

The ADR also correctly notes Option A becomes additive (not exclusive)
when a second human contributor joins — so this decision is reversible
without contradicting itself.

### 2. Is the workflow parser correct?

Yes. I simulated `.github/workflows/ci.yml` lines 62–95 locally against
both this artifact and a battery of false-positive probes. Results:

| Probe                                              | Expected | Actual |
| -------------------------------------------------- | -------- | ------ |
| `verdict: approved`                                | match    | MATCH  |
| `verdict: not approved`                            | no match | no match |
| `verdict: approved-with-conditions`                | no match | no match |
| `verdict: request_changes`                         | no match | no match |
| `verdict: Approved` (uppercase)                    | no match | no match |
| `pr_id: 4`                                         | match    | MATCH  |
| `pr_id: 42`                                        | no match | no match |
| `pr_id: 14`                                        | no match | no match |
| `pr_id: "4"` (quoted)                              | no match | no match |
| `  agent_id: reviewer` (2-space indent)            | match    | MATCH  |
| `    agent_id: reviewer` (4-space indent)          | match    | MATCH  |
| `agent_id: reviewer` (top-level, no indent)        | no match | no match |
| `verdict: approved\r\n` (CRLF)                     | match    | MATCH  |
| `pr_id: 4\r\n` (CRLF)                              | match    | MATCH  |

All four required assertions pass on the actual frontmatter committed in
this artifact. Both false-positive and false-negative probes behave as
intended. CRLF tolerance is preserved by the POSIX `[[:space:]]` class
(which includes `\r`).

Two observations on the parser, **not** blockers:

- The `agent_id: reviewer` assertion uses `^[[:space:]]+agent_id:` — it
  requires *some* leading whitespace but does not enforce that the
  containing block is named `provenance:`. If a future schema adds a
  second nested object containing `agent_id: reviewer`, the assertion
  still passes. Acceptable for now; tightening would require either YAML
  parsing or a multi-line lookahead.
- The `awk` extraction prints lines between the first two `---`
  separators. If a file has only an opening `---` (malformed
  frontmatter), `awk` keeps printing until EOF and may treat body
  content as frontmatter. The downstream regex assertions are strict
  enough that random body prose will not pass them, but the failure
  mode would be a confusing `frontmatter missing or wrong:` rather
  than a clearer `unterminated frontmatter` message. Cosmetic, not a
  correctness issue.

### 3. Is the DSL update consistent with the workflow and the rule?

Yes — three-way consistent:

| Surface                                                                              | Required-checks list                                                                          |
| ------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------- |
| `.sdlc/sdlc.yaml.integrations.github.branch_strategy.protection.require_status_checks` | `[ci/lint, ci/typecheck, ci/build, ci/e2e, ci/review-gate]`                                   |
| `.cursor/rules/branch-discipline.mdc:12`                                              | `[ci/lint, ci/typecheck, ci/build, ci/e2e, ci/review-gate]`                                   |
| `.github/workflows/ci.yml` job declarations                                           | `lint, typecheck, build, review-gate` (the `e2e` job lives in `.github/workflows/e2e-evidence.yml`, an existing workflow declared at `sdlc.yaml.integrations.github.actions.workflows`) |

The `ci/...` slash-prefix convention in the DSL (and the rule) does not
literally match the GitHub UI display string `ci / <job>` (workflow name
+ job name with spaces). This is a known, **pre-existing** drift from
PR #1; surfaced as a Minor finding in `.sdlc/reviews/PR-0001.md` and
deferred as out-of-band-of-this-PR. ADR-0001 § "Consequences →
Follow-up work #1" correctly acknowledges that the actual GitHub
branch-protection API call must use the canonical display string and is
therefore a post-merge step. No new drift is introduced by this PR.

### 4. Is the bootstrap caveat honestly disclosed?

Yes — in both surfaces:

- **ADR-0001 § "Consequences → Follow-up work #3"** (`.sdlc/decisions/0001-sdlc-review-gate-via-artifact.md:92`):
  > "Bootstrap caveat — the very first CI run on any PR will fail the `ci/review-gate` check because the reviewer subagent has not yet committed the review file. This is the expected flow; the check turns green once the reviewer subagent's commit lands."
- **PR #4 body § "Bootstrap caveat — expected to fail on first CI run"**:
  > "On the very first CI run of any PR (before the reviewer subagent has had a chance to commit `.sdlc/reviews/PR-<N>.md`), `ci / review-gate` will fail with `missing .sdlc/reviews/PR-<this PR>.md`. That's the **expected** behaviour — the check turns green as soon as the reviewer subagent's commit lands on the branch."

The PR body's "Test plan" further pins the expected fail-then-pass cycle
as an explicit verification step. Honest disclosure on both surfaces. ✓

### 5. Provenance on the new ADR

`.sdlc/decisions/0001-sdlc-review-gate-via-artifact.md` lines 1–14:

```yaml
provenance:
  agent_id: architect
  model: claude-opus-4-7-thinking-xhigh
  prompt_hash: 459766b6cd4a40dd
  trace_id: ""
  inputs_digest: ""
  created_at: 2026-05-25T20:12:20Z
```

- `agent_id: architect` — valid id from `sdlc.yaml.roles.agents`. ✓
- `model: claude-opus-4-7-thinking-xhigh` — concrete model slug, not fabricated (matches the slug used in prior artifacts on `main`). ✓
- `prompt_hash: 459766b6cd4a40dd` — present, 16-char hex per the skill ("`printf '%s' "<final prompt>" | sha256sum | head -c 16`"). ✓
- `trace_id: ""` and `inputs_digest: ""` — empty strings, honest-empty per `.cursor/rules/provenance.mdc` ("If you cannot fill a field truthfully, leave it empty — never fabricate a trace_id or model slug. … explicit empties are accepted with a note."). ✓
- `created_at: 2026-05-25T20:12:20Z` — ISO-8601 UTC. ✓

Compliant with `sdlc.yaml.artifacts.common_provenance` and the
provenance-stamp skill. No fabrication.

### 6. Security-surface check

The PR diff is **not** a security-surface modification per
`.cursor/agents/reviewer.md` ("auth, headers, env, hooks"):

| Surface       | Touched? | Note |
| ------------- | -------- | ---- |
| auth          | NO       | No auth code, no token handling, no role checks. |
| headers       | NO       | No HTTP header logic. |
| env           | NO       | No `.env*` file is read or modified by this PR. The new `review-gate` job declares no `env:` block beyond `PR_NUMBER` (a GitHub-injected integer); it does not access `secrets.*` at all. |
| hooks         | NO       | `.cursor/hooks/*` is untouched in this diff. |
| CI workflows  | YES (additive) | A new bash-only job is added. The job runs `actions/checkout@v4` and a sealed bash script (`set -euo pipefail`) that uses `awk` and `grep` against a file checked out from the PR branch. No untrusted code execution; no shell-injection vector (the only interpolated value is `PR_NUMBER` from `github.event.pull_request.number`, which GitHub guarantees is an integer). |

The user's contract calls `app/layout.tsx` out as a separate trigger;
this PR touches no file under `app/`. ✓

## Conditional human escalation (per `sdlc.yaml.phases.review.human_required_when` + `.cursor/agents/reviewer.md`)

| Condition                                | Fires? | Reason                                                                                          |
| ---------------------------------------- | ------ | ----------------------------------------------------------------------------------------------- |
| `diff.touches('app/layout.tsx')`         | NO     | No file under `app/` modified.                                                                  |
| `diff.touches_security_surface == true`  | NO     | None of `auth, headers, env, hooks` is touched (table above). The `.github/workflows/ci.yml` change adds a sealed bash-only job with no secrets access and no untrusted execution. |
| `review.confidence < 0.8`                | NO     | Confidence = 0.92.                                                                              |

**Human escalation: NOT required.** The reviewer agent's autonomous
approval satisfies `gate.review_approved`.

## Findings

### Blockers

_none_

### Suggestions (non-blocking, informational)

**S1. The parser is regex-based, not YAML-structural.**
_Cite: `.github/workflows/ci.yml:77-93`; ADR-0001 § "Consequences →
Negative" ("regex-based for simplicity") and § "Follow-up work #4"
("a small `test-review-gate` job that runs the parser against
`.sdlc/reviews/` fixtures would catch divergence — track as a possible
`chore/test-review-gate` follow-up")._
The four `assert_kv` checks pass on this artifact and reject the
false-positive probes I ran. They will not, however, catch a future
schema rename (e.g., `verdict: approved` → `decision: approved`,
`pr_id` → `pr_number`, or moving `implementer_distinct_from_reviewer`
into a nested block). The ADR explicitly tracks this as `chore/test-review-gate`. Suggestion stands as: this follow-up is worth doing
before any non-trivial change to the review-file template lands.

**S2. The `agent_id: reviewer` assertion does not anchor the parent block.**
_Cite: `.github/workflows/ci.yml:89`._
The regex `^[[:space:]]+agent_id:[[:space:]]+reviewer[[:space:]]*$`
matches any indented `agent_id: reviewer` line, regardless of whether
its containing block is `provenance:`. Today there is only one such
block in the schema, so the assertion is effectively equivalent to the
intended one. If the schema ever grows a second block where `agent_id`
appears (e.g., a nested `co_reviewer:`), the assertion would no longer
distinguish them. Tightening would require either a YAML parser or a
two-line awk lookahead. Non-blocking; pair this with S1 in the
`chore/test-review-gate` follow-up.

**S3. Malformed frontmatter (single `---`) yields a confusing failure mode.**
_Cite: `.github/workflows/ci.yml:71`._
The `awk` extraction handles missing-`---` (yields empty `frontmatter`,
caught by `[ -z "$frontmatter" ]`) and balanced-`---` (correct) but
prints body content as frontmatter when only the opening `---` exists.
The downstream regex assertions are strict enough to fail safely in
practice, but the error message will be `frontmatter missing or wrong:
verdict: approved` rather than a clearer `unterminated frontmatter`.
Cosmetic. Pair with S1/S2 in the test-review-gate fixture follow-up.

### Nits

**N1. PR-shape checklist in the PR body is `[ ]` (unchecked) for all four required items.**
_Cite: `.cursor/rules/branch-discipline.mdc § "Required PR shape"` and
`sdlc.yaml.invariants` ("Every PR carries a Plane issue link, a Vercel
preview URL, and an e2e video reference")._
The PR description's checkboxes for Plane / Vercel / e2e / Reviewer
approval are all unchecked. Three of the four are gated on
auto-posting workflows that fire after the PR is opened (Vercel
preview comment, e2e-evidence upload) or on this very review run
(reviewer approval). The Plane link is documented as "captured in
ADR-0001 rather than a separate intent" — a defensible choice for a
chore-class meta-policy change but a deliberate departure from the
invariant's literal text. Non-blocking because (a) `gate.review_approved` does not list Plane-link presence as a sub-gate
and (b) the invariant's enforcement happens at the release gate, not
here. Track as a `/release`-phase concern.

### Informational (no action required)

**I1. Slash-prefix display drift on `ci/review-gate`.**
_Cite: ADR-0001 § "Consequences → Follow-up work #1"; pre-existing per
`.sdlc/reviews/PR-0001.md` Minor #1._
The DSL's `ci/review-gate` (and the four other `ci/*` checks in
`require_status_checks`) is a *contract token*; the actual GitHub
status-check string GitHub will surface for this job is `ci / review-gate` (workflow `ci` + job `review-gate`, separated by ` / `). The
post-merge `gh api -X PATCH /repos/.../branches/main/protection` step
will need to use the GitHub display form. ADR-0001 § "Follow-up work
#1" tracks this. No new drift introduced by this PR.

**I2. The `gh pr review --approve` call from this run is expected to land as `COMMENTED`.**
_Cite: ADR-0001 § "Context" (the very symptom that motivated this PR)._
Per ADR-0001, the reviewer subagent and the implementer subagent
authenticate against GitHub through the same human's credentials
(`fewrux`); GitHub's self-approval block downgrades `--approve` to
`COMMENTED`. With this PR, that downgrade is now informational rather
than load-bearing — the artifact at `.sdlc/reviews/PR-4.md` is the
authoritative gate evidence. The `gh pr review` call is still useful
for the PR timeline and is the explicit reason this PR exists.

**I3. Diff size is well under the autonomy tripwire.**
_Cite: `.sdlc/sdlc.yaml.policies.autonomy.pause_on` ("diff > 400 LOC without spec update")._
+169 / -4 = 173 LOC. No `pause_on` condition fires.

### Positive observations

- **The ADR is unusually thorough.** Three options compared with explicit
  pros/cons/free-tier-impact, an honest threat-model statement, a
  reversibility clause ("If/when a second human contributor joins,
  Option A becomes additive"), and five enumerated follow-up items.
  This is exactly the shape `gate.adr_alternatives_considered` is
  asking for.
- **The PR body's "Test plan" pins the bootstrap fail-then-pass cycle as an explicit verification step**, including the unusual prediction
  "`review-gate` **fails** on the first CI run with `missing .sdlc/reviews/PR-<N>.md` (proves the check actually checks)". That
  failure-as-evidence framing is a quietly excellent self-check for a
  meta-policy change.
- **The four-way consistency** between
  `sdlc.yaml.integrations.github.branch_strategy.protection`, the rule
  file, the workflow's job name, and the ADR's stated four-field
  parser is tight. No drift between contract surfaces.
- **The workflow's bash is defensive**: `set -euo pipefail`, explicit
  `[ -z ]` check on the awk output, parameterized `assert_kv`
  function with literal-string labels for `::error file=` annotations,
  and a final `::notice` on success that echoes back the four matched
  values for debuggability.
- **The single commit honors `commit-conventions.mdc § "One logical change per commit"`** — every line in the diff is in service of the
  ADR's decision; nothing snuck in.

## Approvals

- `reviewer` (this run): **approve**
- `maintainer`: not required for `gate.review_approved` (no
  `human_required_when` clause fires)

## Notes for maintainer

1. **The `gh pr review 4 --approve` call from this run will land as `COMMENTED`** — that is the GitHub-self-approval downgrade described
   in ADR-0001 itself. With this PR's `ci/review-gate` job in place, the
   downgrade is informational. The artifact you are reading (`.sdlc/reviews/PR-4.md`) is now the authoritative gate evidence.
2. **The very first CI run on this PR will fail `ci / review-gate`** with
   `missing .sdlc/reviews/PR-4.md`. That is the expected bootstrap
   behaviour disclosed in the PR body and the ADR. The next CI run
   (after this review commit lands) will turn the check green.
3. **Post-merge follow-up** (out-of-scope for this PR, tracked in
   ADR-0001 § "Follow-up work #1"): update GitHub's branch-protection
   API to add the canonical `ci / review-gate` status check name to
   the required-checks set on `main` and drop
   `require_pull_request_reviews`. The workflow must exist on `main`
   first before that promotion can happen.
4. **A modest test-review-gate fixture job** (ADR-0001 § "Follow-up
   work #4") would close findings S1, S2, and S3 in one stroke.
   Worth tracking as a `chore/test-review-gate` PR after this one
   lands.

## Recommended merge command (post-CI-green)

```text
gh pr merge 4 --squash --delete-branch
```

Squash to land as a single contract-bootstrap commit on `main`.
