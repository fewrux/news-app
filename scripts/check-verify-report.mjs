#!/usr/bin/env node
/**
 * Validates .sdlc/reports/<run_id>/report.json after /verify (SPEC-0005).
 *
 * Usage:
 *   node scripts/check-verify-report.mjs [--spec path] [--report dir]
 *
 * Env:
 *   VERIFY_REPORT_DIR — default .sdlc/reports/latest or newest subdir
 *   VERIFY_SPEC_PATH  — spec file for surface lookup
 */
import { readFile, readdir, stat } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { env, exit } from "node:process";

const ROOT = resolve(import.meta.dirname, "..");
const REPORTS = join(ROOT, ".sdlc/reports");

function parseSurface(md) {
  const m = md.match(/^surface:\s*(product|operator)\s*$/m);
  return m?.[1] ?? "operator";
}

async function newestReportDir() {
  if (!existsSync(REPORTS)) return null;
  const entries = await readdir(REPORTS, { withFileTypes: true });
  let best = null;
  let bestTime = 0;
  for (const ent of entries) {
    if (!ent.isDirectory()) continue;
    const p = join(REPORTS, ent.name);
    const st = await stat(p);
    if (st.mtimeMs > bestTime) {
      bestTime = st.mtimeMs;
      best = p;
    }
  }
  return best;
}

async function main() {
  const args = process.argv.slice(2);
  const specIdx = args.indexOf("--spec");
  const reportIdx = args.indexOf("--report");
  const specPath = resolve(
    specIdx >= 0 ? args[specIdx + 1] : env.VERIFY_SPEC_PATH ?? ".sdlc/specs/SPEC-0005-cursor-e2e-evidence.md",
  );
  let reportDir = reportIdx >= 0 ? resolve(args[reportIdx + 1]) : env.VERIFY_REPORT_DIR;
  if (reportDir) reportDir = resolve(reportDir);
  else reportDir = await newestReportDir();

  if (!reportDir || !existsSync(join(reportDir, "report.json"))) {
    console.error("check-verify-report: missing report.json (run /verify first)");
    exit(1);
  }

  const report = JSON.parse(await readFile(join(reportDir, "report.json"), "utf8"));
  const be = report.browser_evidence ?? {};
  const surface = existsSync(specPath)
    ? parseSurface(await readFile(specPath, "utf8"))
    : report.surface ?? "operator";

  if (surface === "product") {
    if (be.status !== "posted" || !be.plane_comment_url) {
      console.error(
        "check-verify-report: product surface requires browser_evidence.status posted with plane_comment_url",
      );
      exit(1);
    }
    console.log(`check-verify-report: pass (product, posted → ${be.plane_comment_url})`);
    return;
  }

  if (be.status !== "waived" || !be.waiver_reason) {
    console.error(
      "check-verify-report: operator surface requires browser_evidence.status waived with waiver_reason",
    );
    exit(1);
  }
  console.log(`check-verify-report: pass (operator, waived: ${be.waiver_reason})`);
}

main().catch((err) => {
  console.error(`check-verify-report: ${err.message}`);
  exit(1);
});
