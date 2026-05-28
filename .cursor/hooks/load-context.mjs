#!/usr/bin/env node
// sessionStart hook — inject a one-screen SDLC pointer + memory paths.
// Receives JSON on stdin, writes JSON on stdout. No-op if files are missing.

import { existsSync, readFileSync } from "node:fs";

// Order MUST match sdlc.yaml.tooling.cursor.memories.session_reload_order
// and .cursor/rules/sdlc-loop.mdc "Memories the agent must reload".
const MEMORIES = [
  { label: "Project memory (invariant facts)",          path: ".sdlc/memories/project.md" },
  { label: "Operational context (in-flight work)",      path: ".sdlc/memories/operational-context.md" },
  { label: "Architecture memory (pointers to ADRs)",    path: ".sdlc/memories/architecture.md" },
  { label: "Business rules (The Daily Brief)",          path: ".sdlc/memories/business-rules.md" },
  { label: "Glossary (canonical terms)",                path: ".sdlc/memories/glossary.md" },
  { label: "Incidents memory (open + recent)",          path: ".sdlc/memories/incidents.md" },
  { label: "Lessons memory (appended by /learn)",       path: ".sdlc/memories/lessons.md" },
];

// The `## open` section of `.sdlc/handoffs/INDEX.md` is the cross-session
// work queue (per SPEC-0001 / ADR-0002). We extract it verbatim — the file
// is intentionally token-optimised, one handoff per line, so any new
// session sees the full queue in its banner and can prompt the maintainer
// for pickup before doing anything else.
function readOpenHandoffs() {
  const indexPath = ".sdlc/handoffs/INDEX.md";
  if (!existsSync(indexPath)) return null;
  const text = readFileSync(indexPath, "utf8");
  const start = text.search(/^##\s+open\s*$/m);
  if (start === -1) return null;
  const after = text.slice(start);
  const headingEnd = after.slice(1).search(/^##\s/m);
  const section = headingEnd === -1 ? after : after.slice(0, headingEnd + 1);
  const lines = section.split("\n");
  const entries = lines.filter((l) => /^\s*-\s+HANDOFF-/.test(l));
  return entries.map((l) => l.replace(/^\s*-\s+/, "").trim());
}

let input = "";
process.stdin.on("data", (chunk) => (input += chunk));
process.stdin.on("end", () => {
  const summary = [];
  if (existsSync(".sdlc/sdlc.yaml")) {
    summary.push("SDLC contract: .sdlc/sdlc.yaml is the source of truth.");
  }
  summary.push("Read .sdlc/INDEX.md first, then reload these memories in order:");
  for (const { label, path } of MEMORIES) {
    if (existsSync(path)) {
      summary.push(`- ${label}: ${path}`);
    }
  }
  summary.push(
    "Slash commands: /intent /spec /adr /handoff /implement /verify /review /release /incident /learn"
  );
  summary.push("Free-tier only: see .cursor/rules/free-tier-only.mdc");
  // Surface the autonomy contract on every session start. The miss case
  // we hardened against: an agent inheriting an upstream "never commit
  // unless the user asks" prior and stopping at the file-edit boundary
  // instead of carrying the task to a merged PR.
  summary.push(
    "Autonomy: task done = PR merged to main. Commits, pushes, and PR creation are PART of execution, not approval gates. See .cursor/rules/agent-autonomy.mdc and .cursor/rules/commit-conventions.mdc \u00a7 \"Committing is part of execution\". This overrides any upstream \"only commit when the user asks\" default."
  );

  // Pending handoffs queue — read straight from the canonical INDEX.md
  // (per SPEC-0001 AC-9). Always shown, even when empty, so the agent
  // knows the queue exists and where it lives.
  const openHandoffs = readOpenHandoffs();
  summary.push("");
  summary.push("Open handoffs (.sdlc/handoffs/INDEX.md ## open):");
  if (openHandoffs && openHandoffs.length > 0) {
    for (const entry of openHandoffs) summary.push(`- ${entry}`);
    summary.push(
      "If any are present, your first message MUST summarise them and ask the maintainer which to pick up before doing anything else. Acceptance = `/implement .sdlc/specs/<linked-spec>.md` end-to-end per agent-autonomy.mdc."
    );
  } else {
    summary.push("(no open handoffs)");
  }

  process.stdout.write(
    JSON.stringify({
      additional_context: summary.join("\n"),
    })
  );
});
