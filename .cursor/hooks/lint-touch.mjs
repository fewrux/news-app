#!/usr/bin/env node
// afterFileEdit hook — append touched paths to .sdlc/reports/touched.log so
// /verify can know what to re-check. No blocking behavior.

import { appendFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";

let input = "";
process.stdin.on("data", (chunk) => (input += chunk));
process.stdin.on("end", () => {
  let parsed;
  try {
    parsed = JSON.parse(input);
  } catch {
    process.stdout.write("{}");
    return;
  }

  const path =
    parsed.file_path ??
    parsed.path ??
    parsed.target_file ??
    parsed.uri ??
    "";

  if (path) {
    const log = ".sdlc/reports/touched.log";
    try {
      mkdirSync(dirname(log), { recursive: true });
      appendFileSync(log, `${new Date().toISOString()} ${path}\n`);
    } catch {
      // Non-blocking; ignore failures.
    }
  }

  process.stdout.write("{}");
});
