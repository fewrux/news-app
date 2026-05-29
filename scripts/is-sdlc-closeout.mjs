#!/usr/bin/env node
/**
 * Detect SDLC housekeeping closeout PRs (spec status → done, ops-context only).
 *
 * Exit 0 = closeout (verify/review gates skip full Plane/PR marker checks)
 * Exit 1 = not closeout
 *
 * Usage:
 *   node scripts/is-sdlc-closeout.mjs --base <sha> [--head <sha>]
 */
import { spawnSync } from "node:child_process";
import { argv, exit } from "node:process";

function arg(name) {
  const i = argv.indexOf(name);
  return i >= 0 ? argv[i + 1] : undefined;
}

/** @param {string[]} args */
function git(args) {
  const r = spawnSync("git", args, { encoding: "utf8" });
  if (r.status !== 0) {
    throw new Error(r.stderr?.trim() || `git ${args.join(" ")} failed`);
  }
  return r.stdout;
}

const SPEC_PATH = /^\.sdlc\/specs\/SPEC-\d{4}-.+\.md$/;
const ALLOWED = new Set([".sdlc/memories/operational-context.md"]);

function main() {
  const base = arg("--base");
  const head = arg("--head") ?? "HEAD";
  if (!base) {
    console.error("Usage: is-sdlc-closeout.mjs --base SHA [--head SHA]");
    exit(2);
  }

  const range = `${base}...${head}`;
  const files = git(["diff", "--name-only", range])
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((f) => f.replace(/\\/g, "/"));

  if (files.length === 0) {
    console.log(JSON.stringify({ closeout: false, reason: "empty diff" }));
    exit(1);
  }

  for (const f of files) {
    if (ALLOWED.has(f) || SPEC_PATH.test(f)) continue;
    console.log(JSON.stringify({ closeout: false, reason: "non-closeout path", path: f }));
    exit(1);
  }

  const specFiles = files.filter((f) => SPEC_PATH.test(f));
  if (specFiles.length === 0 && !files.includes(".sdlc/memories/operational-context.md")) {
    console.log(JSON.stringify({ closeout: false, reason: "no spec status files" }));
    exit(1);
  }

  for (const f of specFiles) {
    const diff = git(["diff", range, "--", f]);
    const contentLines = diff
      .split("\n")
      .filter((l) => (l.startsWith("+") || l.startsWith("-")) && !/^[+-]{3}/.test(l));

    for (const line of contentLines) {
      const t = line.slice(1).trim();
      if (!t) continue;
      if (/^status:\s+(done|in_progress)\s*$/.test(t)) continue;
      console.log(JSON.stringify({ closeout: false, reason: "spec diff beyond status", path: f, line: t }));
      exit(1);
    }
  }

  console.log(JSON.stringify({ closeout: true, files }));
  exit(0);
}

try {
  main();
} catch (err) {
  console.error(`is-sdlc-closeout: ${err.message}`);
  exit(2);
}
