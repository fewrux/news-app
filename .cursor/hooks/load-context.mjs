#!/usr/bin/env node
// sessionStart hook — inject a one-screen SDLC pointer + memory paths.
// Receives JSON on stdin, writes JSON on stdout. No-op if files are missing.

import { existsSync } from "node:fs";

let input = "";
process.stdin.on("data", (chunk) => (input += chunk));
process.stdin.on("end", () => {
  const summary = [];
  if (existsSync(".sdlc/sdlc.yaml")) {
    summary.push("SDLC contract: .sdlc/sdlc.yaml is the source of truth.");
  }
  if (existsSync(".sdlc/memories/project.md")) {
    summary.push("Project memory: .sdlc/memories/project.md");
  }
  if (existsSync(".sdlc/memories/lessons.md")) {
    summary.push("Lessons memory: .sdlc/memories/lessons.md");
  }
  if (existsSync(".sdlc/memories/glossary.md")) {
    summary.push("Glossary: .sdlc/memories/glossary.md");
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
