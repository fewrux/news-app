#!/usr/bin/env node
/**
 * Eval runner for SDLC doctor mechanical findings.
 * Contract: SPEC-0002 AC-3.
 */

import { readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { cwd, exit, stderr, stdout } from "node:process";
import { CHECK_IDS } from "./sdlc-doctor.mjs";

const ROOT = resolve(cwd());
const CASES_DIR = join(ROOT, ".sdlc/evals/cases/doctor");

async function loadCases() {
  const { readdir } = await import("node:fs/promises");
  const names = await readdir(CASES_DIR);
  const cases = [];
  for (const name of names) {
    if (!name.endsWith(".json")) continue;
    const raw = await readFile(join(CASES_DIR, name), "utf8");
    cases.push(JSON.parse(raw));
  }
  return cases;
}

function runDoctor() {
  const result = spawnSync(
    "node",
    [join(ROOT, "scripts/sdlc-doctor.mjs"), "--mode=mechanical"],
    { encoding: "utf8", cwd: ROOT },
  );
  if (result.status === 2 || !result.stdout?.trim()) {
    throw new Error(`doctor failed (exit ${result.status}): ${result.stderr}`);
  }
  return {
    exitCode: result.status ?? 0,
    report: JSON.parse(result.stdout.trim()),
  };
}

async function main() {
  const listChecks = spawnSync(
    "node",
    [join(ROOT, "scripts/sdlc-doctor.mjs"), "--mode=mechanical", "--list-checks"],
    { encoding: "utf8", cwd: ROOT },
  );
  const listed = (listChecks.stdout ?? "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  if (listed.join(",") !== CHECK_IDS.join(",")) {
    stderr.write("doctor --list-checks does not match SPEC-0002 canonical list\n");
    exit(1);
  }

  const { exitCode, report } = runDoctor();
  const findingIds = new Set(report.findings.map((f) => f.id));
  const cases = await loadCases();
  let failed = 0;

  for (const c of cases) {
    const expected = c.expected_finding_ids ?? [];
    const missing = expected.filter((id) => !findingIds.has(id));
    const forbidden = (c.forbidden_finding_ids ?? []).filter((id) =>
      findingIds.has(id),
    );
    if (missing.length || forbidden.length) {
      failed += 1;
      stderr.write(
        `FAIL ${c.id}: missing=[${missing.join(",")}] forbidden=[${forbidden.join(",")}]\n`,
      );
    } else {
      stdout.write(`PASS ${c.id}\n`);
    }
    if (typeof c.expected_exit_code === "number" && exitCode !== c.expected_exit_code) {
      failed += 1;
      stderr.write(
        `FAIL ${c.id}: expected exit ${c.expected_exit_code}, got ${exitCode}\n`,
      );
    }
  }

  if (failed) exit(1);
  stdout.write(`All ${cases.length} doctor eval case(s) passed.\n`);
}

main().catch((err) => {
  stderr.write(`${err instanceof Error ? err.message : err}\n`);
  exit(2);
});
