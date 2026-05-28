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
  // Slim to the canonical handoff id (first token) only. The intent/spec/
  // adrs/tracker/created metadata — especially the tracker UUIDs — are pure
  // noise in a per-session banner; full detail lives in INDEX.md.
  return entries.map((l) => l.replace(/^\s*-\s+/, "").trim().split(/\s+/)[0]);
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
  // Static guidance (slash commands, free-tier, autonomy) lives in
  // always-applied rules + AGENTS.md, not here — per SPEC-0003 this hook
  // emits only dynamic content. Entry points get one pointer line.
  summary.push(
    "Entry points + memory-reload order: AGENTS.md. Contract: .sdlc/sdlc.yaml."
  );

  // Pending handoffs queue — ids only, read from canonical INDEX.md
  // (per SPEC-0001 AC-9). Detail stays in the file; this banner only has
  // to guarantee the agent surfaces the queue on turn one.
  const openHandoffs = readOpenHandoffs();
  summary.push("");
  if (openHandoffs && openHandoffs.length > 0) {
    summary.push(`OPEN HANDOFFS (${openHandoffs.length}): ${openHandoffs.join(", ")}`);
    summary.push(
      "DIRECTIVE (non-optional): your FIRST reply this session MUST begin by listing the open handoff id(s) above and asking the maintainer which to pick up — before addressing anything else, even if their message is about something unrelated. Full detail: .sdlc/handoffs/INDEX.md \u00a7 open. Pickup = `/implement` the linked spec end-to-end per agent-autonomy.mdc."
    );
  } else {
    summary.push("Open handoffs: none.");
  }

  process.stdout.write(
    JSON.stringify({
      additional_context: summary.join("\n"),
    })
  );
});
