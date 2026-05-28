---
id: ADR-0002
title: Abstract the project-management integration behind a tracker adapter contract; Plane becomes one provider
status: accepted
date: 2026-05-28
spec: SPEC-0001
provenance:
  agent_id: architect
  model: claude-opus-4-7-thinking-xhigh
  prompt_hash: 530a7bf5f6907e8f
  trace_id: ""
  inputs_digest: ""
  created_at: 2026-05-28T16:35:00Z
---

# Context

`.sdlc/sdlc.yaml.integrations.plane` is currently the only project-management
integration the SDLC knows about. Every artifact that touches PM today
(`/intent` writing `plane_issue` in frontmatter, `scripts/plane-sync.mjs`
exposing `create-from-intent` / `create-from-incident` / `link-spec` /
`close-cycle` / `github-event`, the new `/handoff` command about to be
shipped) hard-codes the Plane provider in both the call surface (`node
scripts/plane-sync.mjs ...`) and the artifact surface (`plane_issue:` /
`plane:NEWS-42`).

The maintainer's principle, restated in the originating brainstorm
session and codified in this PR's spec, is **the SDLC contract is the
source of truth; vendor choices are configuration**. Plane is what the
project uses today; Jira, Linear, GitHub Projects, or Plane self-hosted
are equally plausible tomorrow. Today's coupling means a tracker swap is
a repo-wide refactor (every artifact frontmatter field, every script
invocation in every command file, every doc that mentions `plane_*` by
name). That cost is itself a form of lock-in.

This ADR formalises the abstraction that makes the swap cheap.

# Forces

- `sdlc.yaml.policies.cost.tier == free_only`. Plane Cloud Free is the
  current substrate; the project must remain free to switch to a
  self-hosted Plane Community instance, or to Jira (free for ≤ 10
  users), or to Linear (free for ≤ 10 users), without rewriting SDLC
  artifacts.
- The existing `scripts/plane-sync.mjs` is hardened against Plane Cloud's
  Cloudflare WAF (see the script's leading commentary and the
  `plane-sync` skill). Throwing it away would lose that hard-won
  knowledge.
- The `/handoff` command shipping in this same PR is the natural
  forcing function: it introduces a new subcommand (`create-from-handoff`)
  and a new artifact field (the tracker reference on a handoff). Deciding
  the abstraction now is cheap; deciding it after `/handoff` has shipped
  with `plane_*` baked in is the same lock-in we are trying to avoid.
- The SDLC doctor (INT-0003, ADR-0003) will mechanically check that the
  integration matches the contract. Whatever shape this ADR chooses
  becomes a permanent invariant the doctor enforces.

# Options

## Option A — No abstraction; keep `integrations.plane`, accept the lock-in (status quo + new fields)

Extend `scripts/plane-sync.mjs` with `create-from-handoff`. Add
`plane_epic` and `plane_issues` to handoff frontmatter. Document in
`AGENTS.md` that a future tracker swap is a repo-wide rename.

- **Pros**: zero new structure; the existing script and skill stay
  exactly where they are; one less concept to teach a new contributor.
- **Cons**: the lock-in is now spread across one more artifact type
  (handoff) and one more code path (`/handoff` command); contradicts
  the project's "source of truth lives in `.sdlc/`" principle visible
  in `architecture.md` and `AGENTS.md`; the SDLC doctor cannot
  meaningfully assert "tracker integration is healthy" because there
  is no contract to check it against — only the live Plane provider.
- **Free-tier impact**: zero today, but a tracker swap forced by
  Plane Cloud's free-tier headcount cap (12 users) or a Plane Cloud
  outage becomes a multi-PR refactor with knock-on edits to every
  artifact frontmatter.

## Option B — Abstract behind a tracker adapter contract; Plane is one provider (CHOSEN)

Introduce `sdlc.yaml.integrations.tracker` as the canonical declaration:

```yaml
tracker:
  active_provider: plane
  providers:
    plane:
      sync_script: scripts/plane-sync.mjs
      epic_object: module
      issue_object: issue
      free_tier_quota_ref: policies.cost.free_quotas.plane
```

Every adapter implements the same subcommand surface:

```
node <sync_script> create-from-intent    <intent.md>
node <sync_script> create-from-incident  <incident.md>
node <sync_script> create-from-handoff   <handoff.md>
node <sync_script> link-spec             <spec.md> <issue-id>
node <sync_script> close-cycle           <cycle-id>
node <sync_script> github-event
```

Artifact frontmatter uses a generic `tracker:` block in place of
`plane_issue:`:

```yaml
tracker:
  provider: plane          # mirrors integrations.tracker.active_provider
  epic: NEWS-42            # provider-native id; only one field per role
  issues: [NEWS-43, NEWS-44]
  url: ""                  # provider-native deep link; optional
```

The existing `scripts/plane-sync.mjs` stays as the Plane adapter. The
existing `plane-sync` skill stays. The existing `plane_issue:` field on
already-committed artifacts (INT-0001) stays, and the doctor's
mechanical checker accepts the legacy field as equivalent to
`tracker.provider == plane` / `tracker.issues == [<plane_issue>]`
during a soft-deprecation window of one release.

- **Pros**: the SDLC contract names the abstraction explicitly; a
  tracker swap is "swap `active_provider`, ship a sibling
  `scripts/jira-sync.mjs` honoring the subcommand contract, run a
  one-off migration over existing artifacts" — the *call sites* never
  change; the doctor can mechanically check that
  `integrations.tracker.providers[active_provider].sync_script` exists
  and that the script exposes the contract's subcommands; the
  handoff system ships free of provider-specific naming from day one.
- **Cons**: introduces one new conceptual layer (adapter contract) that
  a new contributor must learn; the artifact frontmatter migration
  for the existing `plane_issue` field on INT-0001 is deferred to a
  small follow-up chore rather than executed in this PR; the
  subcommand contract becomes a load-bearing API the doctor enforces.
- **Free-tier impact**: zero. The abstraction is configuration, not
  code; no new runtime dependency. Each provider adapter declares its
  free-tier quota reference, which the doctor cross-checks against
  `policies.cost.free_quotas` (preventing the "added a provider but
  forgot to track its quota" drift).

## Option C — Adopt a third-party meta-tracker abstraction (Backstage, GitHub Projects API as universal layer)

Pick a vendor-neutral middleware (e.g. Backstage's Software Catalog
plugins, or GitHub Projects v2 as a polyglot facade), and have the SDLC
artifacts speak only to that layer; the middleware then fans out to
Plane / Jira / Linear.

- **Pros**: the abstraction is owned by someone else; theoretically
  battle-tested across many integrations.
- **Cons**: every option here is heavyweight (Backstage requires a
  Node server, a database, and a deployment) or paid above small
  scales; the project is a single-maintainer free-tier sandbox and
  this is the wrong order of magnitude of infrastructure; the
  middleware itself becomes another integration to test, version,
  and drift-check.
- **Free-tier impact**: negative. Backstage's hosted offerings are
  paid; the self-hosted version exceeds free-tier compute budgets.

# Decision

**Option B.** It matches the project's existing principle (the SDLC
contract is the source of truth, vendors are configuration), is
zero-cost on the free tier, and the doctor work in INT-0003 has a
real contract to enforce against. The cost — one new conceptual layer
and a soft-deprecation window for `plane_issue:` on INT-0001 — is
small and front-loaded.

The subcommand contract is intentionally narrow (six verbs) so the bar
to writing a new adapter stays low. The contract is encoded in
`sdlc.yaml.integrations.tracker.adapter_contract` so the doctor can
parse it and assert it; it is also documented in
`.cursor/skills/plane-sync/SKILL.md` for the human reader.

# Consequences

## Positive

- Plane is now one provider, not the integration. Swapping providers
  is a configuration change plus a new adapter script.
- The handoff system ships with a vendor-neutral frontmatter shape
  from commit one, with no `plane_*` baked into a new artifact type.
- The SDLC doctor (INT-0003) has a mechanical check it can run:
  "for each adapter declared, the script exists and exposes the
  contract's subcommands."
- New contributors see one abstraction (`tracker`) and one provider
  (`plane`) rather than a sprawled integration; the layering matches
  how the rest of the SDLC is organised (phases declare *what*, the
  operator surface declares *how*).
- Free-tier quota tracking becomes a per-provider concern; the doctor
  can warn the maintainer when a provider's headcount or rate budget
  is about to be exhausted, without needing per-provider conditional
  logic in the cost policy.

## Negative

- Adds one indirection. Casual readers used to seeing
  `node scripts/plane-sync.mjs ...` in commands and CI must now read
  it as `node <integrations.tracker.providers[active_provider].sync_script> ...`.
  Mitigated by leaving the literal path in slash command examples for
  the current provider while making the abstraction available to anyone
  who needs it.
- The adapter contract becomes a load-bearing API. Adding a new
  subcommand requires updating every adapter (only Plane today).
  Mitigated by the contract starting small (six verbs) and growing only
  when a new SDLC artifact type demands it.
- One pre-existing artifact (INT-0001) carries the legacy
  `plane_issue:` field. This ADR commits to a soft deprecation: the
  doctor accepts the old field as equivalent to a single-issue
  `tracker:` block, and a follow-up chore PR converts INT-0001 to the
  new shape. No urgency; the file is not referenced anywhere that
  parses the field.

## Follow-up work this creates

1. **SPEC-0001 § "Tracker adapter implementation"** turns this ADR
   into the concrete extension of `scripts/plane-sync.mjs` (new
   `create-from-handoff` subcommand) and the new
   `sdlc.yaml.integrations.tracker` block.
2. **Soft-deprecation chore for `plane_issue:`** — a small follow-up
   PR (`chore/migrate-plane-issue-to-tracker`) that converts
   INT-0001's frontmatter and removes the doctor's legacy-field
   tolerance. Not blocking on this PR.
3. **`.cursor/skills/plane-sync/SKILL.md`** stays but gains a leading
   note that Plane is "the current adapter under the tracker contract
   declared in ADR-0002"; deeper docs of the contract itself live in
   the spec, not the skill.
4. **Doctor checks (deferred to SPEC-0002)** — `scripts/sdlc-doctor.mjs`
   must verify: (a) every provider declared exists as a script;
   (b) every provider's script exposes the contract subcommands;
   (c) `active_provider` is a key in `providers`; (d) every artifact
   `tracker.provider` matches a known provider.
5. **If a second adapter is added later** (Jira, Linear, GitHub
   Projects), this ADR remains accepted; the new adapter follows the
   contract here without a superseding ADR. A superseding ADR is only
   needed if the *contract itself* changes (a new subcommand verb, a
   new artifact frontmatter field).
