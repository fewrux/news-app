#!/usr/bin/env node
/**
 * Copy Playwright .webm videos into .sdlc/reports/{run_id}/videos/.
 * Product surface fails when zero videos are found.
 *
 * Usage:
 *   node scripts/collect-verify-evidence.mjs --run-id 20260601T120000Z [--surface product|operator]
 */
import { cp, mkdir, readdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { basename, join, resolve } from "node:path";
import { argv, exit, stdout } from "node:process";
import { ROOT } from "./gates/common.mjs";

function arg(name) {
  const i = argv.indexOf(name);
  return i >= 0 ? argv[i + 1] : undefined;
}

/**
 * @param {string} dir
 */
async function findWebm(dir) {
  const out = [];
  if (!existsSync(dir)) return out;
  for (const ent of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, ent.name);
    if (ent.isDirectory()) out.push(...(await findWebm(p)));
    else if (ent.name.endsWith(".webm")) out.push(p);
  }
  return out;
}

async function main() {
  const runId =
    arg("--run-id") ??
    new Date().toISOString().replace(/[-:]/g, "").replace(/\..+/, "Z");
  const surface = arg("--surface") ?? "product";
  const reportDir = resolve(ROOT, ".sdlc/reports", runId);
  const destDir = join(reportDir, "videos");
  await mkdir(destDir, { recursive: true });

  const searchRoots = [
    resolve(ROOT, "test-results"),
    join(reportDir, "test-results"),
  ];
  const seen = new Set();
  const copied = [];

  for (const root of searchRoots) {
    for (const webm of await findWebm(root)) {
      if (seen.has(webm)) continue;
      seen.add(webm);
      const dest = join(destDir, `${copied.length}-${basename(webm)}`);
      await cp(webm, dest);
      copied.push(dest);
    }
  }

  const result = {
    ok: true,
    run_id: runId,
    surface,
    video_count: copied.length,
    report_dir: reportDir,
    videos_dir: destDir,
  };
  stdout.write(`${JSON.stringify(result)}\n`);

  if (surface === "product" && copied.length === 0) {
    console.error(
      "collect-verify-evidence: product surface requires >= 1 .webm under test-results/",
    );
    exit(1);
  }
}

main().catch((err) => {
  console.error(`collect-verify-evidence: ${err.message}`);
  exit(1);
});
