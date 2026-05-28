---
description: Bundle a session's intent + spec + ADR(s) into a cross-session handoff (phase=handoff)
---

You are the **planner** agent. Close out an SDLC session by producing a
handoff bundle that the next session (possibly a different agent harness)
can pick up without re-deriving any decisions.

## When to invoke

Invoke `/handoff` when the current session has produced an **approved**
intent + spec (+ optional ADRs) and the work will **not** be implemented
in the same session — either because the maintainer wants to dispatch it
to a fresh session, or because the implementation is large enough to
deserve its own focused run.

If the session is producing AND implementing the work in one go, do not
invoke `/handoff` — go straight to `/implement`.

## Procedure

1. **Read the contract.** Re-read `sdlc.yaml` phase `handoff` and gates
   `gate.handoff_bundle_complete`, `gate.tracker_mirrored`. Re-read
   ADR-0002 (tracker adapter contract) so the frontmatter shape stays
   provider-agnostic.

2. **Resolve the bundle.** Identify the artifacts being handed off —
   typically the latest unhanded intent + spec + any ADR(s) created in
   the session. If the maintainer named a specific spec, use that one;
   otherwise list candidates and ask one clarifying question.

3. **Compute the handoff identifier.** Format:
   `HANDOFF-<YYYY-MM-DD>-<slug>` where `<slug>` is the intent's `slug:`
   (or, if absent, a kebab-case derivative of the spec's title). The
   date is today, UTC.

4. **Write the cover sheet.** Copy `.sdlc/handoffs/_template.md` to
   `.sdlc/handoffs/HANDOFF-<YYYY-MM-DD>-<slug>.md` and fill in:
   - `id`, `slug`, `created_at` (ISO-8601 UTC), `intent`, `spec`,
     `adrs` (list, even if empty).
   - `status: open`.
   - `originating_session.title` and `.transcript` (cite the chat title
     and the parent transcript uuid; do **not** cite subagent transcripts).
   - Provenance per `.cursor/skills/provenance-stamp/SKILL.md`. Empty
     fields are OK; never fabricate `trace_id` or `model`.
   - Body: 5–10 line `## Context` summary, `## Links` to the artifacts,
     `## How to pick this up` (keep the template's default unless the
     work needs a different entry command).

5. **Append to the queue.** Add one line to
   `.sdlc/handoffs/INDEX.md` under `## open`, in the entry format
   declared at the top of that file. Keep entries sorted by `created`
   date (newest at the bottom of `## open` so the most recent is most
   visible — or top, either is fine, just be consistent within a PR).

6. **Mirror to the active tracker.** Read
   `sdlc.yaml.integrations.tracker.active_provider`, find the matching
   `providers[<provider>].sync_script`, and run:

   ```
   node <sync_script> create-from-handoff .sdlc/handoffs/HANDOFF-<YYYY-MM-DD>-<slug>.md
   ```

   The adapter creates the provider's epic-equivalent (e.g. a Plane
   module) plus one child issue per linked spec, then writes the
   returned ids back into the handoff's `tracker:` frontmatter block.

   **Soft-fail behavior.** If the adapter exits non-zero because the
   provider's env vars are unset (typical in local dev without
   `.env` loaded), do **not** abort. Instead:
   - Leave the `tracker:` block empty.
   - Append `tracker_mirrored: waived` to the handoff frontmatter.
   - Note the waiver in `## Tracker mirror` in the body with a
     one-line explanation.
   - Continue with the commit. The handoff is still usable; the
     maintainer can populate the tracker manually later.

7. **Commit.** One commit per `/handoff` invocation. Conventional
   Commits message:

   ```
   chore(sdlc): file HANDOFF-<YYYY-MM-DD>-<slug>

   Bundles INT-XXXX + SPEC-XXXX + ADR-NNNN(...) for cross-session
   pickup. Tracker mirror: plane:<epic-id> with <N> child issue(s).

   Refs: HANDOFF-<YYYY-MM-DD>-<slug>, INT-XXXX, SPEC-XXXX
   Trace: n/a
   ```

8. **Summarize.** Report:
   - The handoff path,
   - The INDEX.md row added,
   - The tracker mirror result (epic id + issue ids, or `waived`),
   - The next session's expected first action:
     `/implement .sdlc/specs/SPEC-XXXX-<slug>.md`.

## Gates

- `gate.handoff_bundle_complete` — every `intent`, `spec`, `adrs[i]`
  in the frontmatter resolves to an existing file on disk.
- `gate.tracker_mirrored` — `tracker.epic` and `tracker.issues` are
  populated **or** `tracker_mirrored: waived` is recorded (the gate
  tolerates env-missing).

## Constraints

- One handoff per session. If you find yourself creating two, the
  scope should split into two sessions instead.
- Do **not** invoke `/implement` from the same session that ran
  `/handoff`. The handoff exists precisely because the implementation
  is going to a different session — usually a different model run,
  often a different agent harness.
- The handoff is **the queue**, not Plane (or Jira, or whatever).
  Plane is a mirror for visibility. If Plane is unreachable, the
  handoff file in the repo is still authoritative.
- Stamp provenance honestly. Leave `trace_id` empty if you don't have
  a LangSmith run.
