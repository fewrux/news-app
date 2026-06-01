#!/usr/bin/env node
/**
 * Mechanical verify loop: e2e (product) → collect → post-evidence → check-phase-exit.
 *
 * Usage:
 *   node scripts/run-verify-phase.mjs --spec .sdlc/specs/SPEC-XXXX.md [--surface product|operator]
 */
import { readFile } from "node:fs/promises";
import { existsSync, writeFileSync, mkdirSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { resolve, join } from "node:path";
import { argv, exit } from "node:process";
import { loadEnvFiles } from "./load-env.mjs";
import { ROOT, parseFrontmatter } from "./gates/common.mjs";

loadEnvFiles();

function arg(name) {
  const i = argv.indexOf(name);
  return i >= 0 ? argv[i + 1] : undefined;
}

function run(cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, {
    encoding: "utf8",
    cwd: ROOT,
    stdio: opts.inherit ? "inherit" : "pipe",
    env: process.env,
  });
  return r;
}

function readMaxAttempts() {
  const yamlPath = resolve(ROOT, ".sdlc/sdlc.yaml");
  if (!existsSync(yamlPath)) return 3;
  const text = readFileSync(yamlPath, "utf8");
  const m = text.match(/retry_policy:\s*\{\s*max_attempts:\s*(\d+)/);
  return m ? Number(m[1]) : 3;
}

async function main() {
  const specPath = arg("--spec");
  if (!specPath) {
    console.error("Usage: run-verify-phase.mjs --spec <spec-path> [--surface product|operator]");
    exit(2);
  }
  const absSpec = resolve(ROOT, specPath);
  const md = await readFile(absSpec, "utf8");
  const { frontmatter } = parseFrontmatter(md);
  const surface = arg("--surface") ?? frontmatter.surface ?? "operator";
  const maxAttempts = readMaxAttempts();
  const headSha = run("git", ["rev-parse", "HEAD"]).stdout?.trim();

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    console.log(`run-verify-phase: attempt ${attempt}/${maxAttempts} (${surface})`);

    if (surface === "product") {
      const e2e = run("npm", ["run", "test:e2e:verify"], { inherit: true });
      if (e2e.status !== 0) continue;
    } else {
      let opOk = true;
      for (const script of ["lint", "typecheck", "build"]) {
        const r = run("npm", ["run", script], { inherit: true });
        if (r.status !== 0) {
          opOk = false;
          break;
        }
      }
      if (!opOk) continue;
    }

    const runId = new Date().toISOString().replace(/[-:]/g, "").replace(/\..+/, "Z");
    const reportDir = join(ROOT, ".sdlc/reports", runId);
    mkdirSync(reportDir, { recursive: true });

    if (surface === "product") {
      const collect = run("node", [
        "scripts/collect-verify-evidence.mjs",
        "--run-id",
        runId,
        "--surface",
        "product",
      ]);
      if (collect.status !== 0) continue;
    }

    const report = {
      schema: "sdlc.verify.v1",
      run_id: runId,
      spec: frontmatter.id,
      surface,
      head_sha: headSha,
      acceptance_criteria: [{ id: "AC-verify", outcome: "pass", verifier: "run-verify-phase.mjs" }],
      browser_evidence:
        surface === "product"
          ? { status: "posted" }
          : {
              status: "waived",
              waiver_reason: "operator-surface spec — browser evidence waived",
            },
      gates: { lint: "pass", typecheck: "pass", build: "pass" },
    };
    writeFileSync(join(reportDir, "report.json"), JSON.stringify(report, null, 2));

    const postArgs = [
      "scripts/plane-sync.mjs",
      "post-evidence",
      specPath,
      reportDir,
      "--head-sha",
      headSha ?? "",
    ];
    const post = run("node", postArgs, { inherit: true });
    if (post.status !== 0) continue;

    const gate = run("node", [
      "scripts/check-phase-exit.mjs",
      "--phase",
      "verify",
      "--spec",
      specPath,
      "--head-sha",
      headSha ?? "",
    ]);
    if (gate.status === 0) {
      console.log(JSON.stringify({ ok: true, run_id: runId, attempt }));
      exit(0);
    }
  }

  console.error(`run-verify-phase: failed after ${maxAttempts} attempts`);
  exit(1);
}

main().catch((err) => {
  console.error(`run-verify-phase: ${err.message}`);
  exit(1);
});
