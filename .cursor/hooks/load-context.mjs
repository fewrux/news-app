#!/usr/bin/env node
// sessionStart hook — inject a one-screen SDLC pointer + memory paths.
// Receives JSON on stdin, writes JSON on stdout. No-op if files are missing.

import { existsSync } from "node:fs";

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
    "Slash commands: /intent /spec /adr /implement /verify /review /release /incident /learn"
  );
  summary.push("Free-tier only: see .cursor/rules/free-tier-only.mdc");

  process.stdout.write(
    JSON.stringify({
      additional_context: summary.join("\n"),
    })
  );
});
