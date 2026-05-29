#!/usr/bin/env node
// sessionStart hook — inject a one-screen SDLC pointer + memory paths.
// Receives JSON on stdin, writes JSON on stdout. No-op if files are missing.

import { existsSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

const MEMORIES = [
  { label: "Project memory (invariant facts)",          path: ".sdlc/memories/project.md" },
  { label: "Operational context (in-flight work)",      path: ".sdlc/memories/operational-context.md" },
  { label: "Architecture memory (pointers to ADRs)",    path: ".sdlc/memories/architecture.md" },
  { label: "Business rules (The Daily Brief)",          path: ".sdlc/memories/business-rules.md" },
  { label: "Glossary (canonical terms)",                path: ".sdlc/memories/glossary.md" },
  { label: "Incidents memory (open + recent)",          path: ".sdlc/memories/incidents.md" },
  { label: "Lessons memory (appended by /learn)",       path: ".sdlc/memories/lessons.md" },
];

function readQueueSection(heading) {
  const path = ".sdlc/memories/operational-context.md";
  if (!existsSync(path)) return [];
  const text = readFileSync(path, "utf8");
  const start = text.indexOf(heading);
  if (start === -1) return [];
  const after = text.slice(start + heading.length);
  const next = after.search(/^##\s/m);
  const body = next === -1 ? after : after.slice(0, next);
  return body
    .split("\n")
    .filter((l) => /^\s*-\s+SPEC-\d+/.test(l))
    .map((l) => l.replace(/^\s*-\s+/, "").trim().split(/\s+/)[0]);
}

function listBlockedSpecs() {
  const r = spawnSync("node", ["scripts/ops-context.mjs", "list-blocked"], {
    encoding: "utf8",
  });
  if (r.status !== 0) return [];
  return r.stdout.trim().split("\n").filter(Boolean);
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
    "Entry points + memory-reload order: AGENTS.md. Contract: .sdlc/sdlc.yaml."
  );

  const todo = readQueueSection("## todo (max 10)");
  const inProgress = readQueueSection("## in_progress (max 10)");
  const blocked = listBlockedSpecs();

  summary.push("");
  if (todo.length > 0) {
    summary.push(`TODO SPECS (${todo.length}): ${todo.join(", ")}`);
  } else {
    summary.push("Todo specs: none.");
  }
  if (inProgress.length > 0) {
    summary.push(`IN PROGRESS (${inProgress.length}): ${inProgress.join(", ")}`);
  } else {
    summary.push("In-progress specs: none.");
  }
  if (blocked.length > 0) {
    summary.push(`BLOCKED SPECS (${blocked.length}): ${blocked.join(", ")}`);
  }

  const pending = [...todo, ...inProgress];
  if (pending.length > 0) {
    summary.push(
      "DIRECTIVE (non-optional): your FIRST reply this session MUST list the todo/in-progress spec id(s) above and ask the maintainer which to `/implement` — before addressing anything else. Detail: .sdlc/memories/operational-context.md. Pickup = `/implement <spec-path>` end-to-end per agent-autonomy.mdc."
    );
  }

  process.stdout.write(
    JSON.stringify({ additional_context: summary.join("\n") })
  );
});
