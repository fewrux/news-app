#!/usr/bin/env node
/**
 * Execution manifest — read/write/validate/stamp-phase for sdlc.execution.v1.
 *
 * Manifests live in .sdlc/runs/{execution_id}.json (gitignored).
 * They record gate outcomes for every SDLC phase of a single spec run.
 *
 * Schema: sdlc.execution.v1
 *
 * Usage (CLI):
 *   node scripts/execution-manifest.mjs init   --spec SPEC-0015 --head-sha abc123
 *   node scripts/execution-manifest.mjs stamp  --file .sdlc/runs/exec-...json --phase implement --outcome pass
 *   node scripts/execution-manifest.mjs verify --file .sdlc/runs/exec-...json
 *
 * Usage (API — import):
 *   import { initManifest, stampPhase, readManifest, resolveManifestPath } from './execution-manifest.mjs'
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync, renameSync } from "node:fs";
import { resolve, join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { argv, env, exit, stdout } from "node:process";
import { randomBytes } from "node:crypto";
import { ROOT } from "./gates/common.mjs";

export const RUNS_DIR = resolve(ROOT, ".sdlc/runs");

/**
 * Derive a stable execution_id from spec_id + head_sha + timestamp.
 * @param {string} specId
 * @param {string} headSha
 * @returns {string}
 */
export function makeExecutionId(specId, headSha) {
  const ts = new Date().toISOString().replace(/[-:]/g, "").replace(/\..+/, "Z");
  const short = headSha ? headSha.slice(0, 8) : randomBytes(4).toString("hex");
  return `exec-${specId}-${short}-${ts}`;
}

/**
 * Return the manifest path for a given execution_id, or the path stored in
 * the SDLC_MANIFEST env var (highest priority).
 * @param {string} [executionId]
 * @returns {string | null}
 */
export function resolveManifestPath(executionId) {
  if (env.SDLC_MANIFEST) return resolve(ROOT, env.SDLC_MANIFEST);
  if (executionId) return join(RUNS_DIR, `${executionId}.json`);
  return null;
}

/** @typedef {{ schema: string; execution_id: string; spec_id: string; head_sha: string; created_at: string; phases: Record<string, PhaseEntry> }} Manifest */
/** @typedef {{ stamped_at: string; outcome: string; artifact?: string; harness_id?: string; run_id?: string; report_dir?: string; pr_id?: number; tag?: string; agent?: string; claims?: Record<string, unknown> }} PhaseEntry */

/**
 * Create a new blank manifest (does NOT write to disk).
 * @param {string} specId
 * @param {string} headSha
 * @returns {Manifest}
 */
export function createManifest(specId, headSha) {
  const executionId = makeExecutionId(specId, headSha);
  return {
    schema: "sdlc.execution.v1",
    execution_id: executionId,
    spec_id: specId,
    head_sha: headSha,
    created_at: new Date().toISOString(),
    phases: {},
  };
}

/**
 * Initialise and persist a new manifest.
 * @param {string} specId
 * @param {string} headSha
 * @returns {{ manifest: Manifest; path: string }}
 */
export function initManifest(specId, headSha) {
  const manifest = createManifest(specId, headSha);
  const path = join(RUNS_DIR, `${manifest.execution_id}.json`);
  writeManifest(path, manifest);
  return { manifest, path };
}

/**
 * Read and parse a manifest file.
 * @param {string} filePath
 * @returns {Manifest}
 */
export function readManifest(filePath) {
  const abs = resolve(filePath);
  if (!existsSync(abs)) throw new Error(`manifest not found: ${abs}`);
  return JSON.parse(readFileSync(abs, "utf8"));
}

/**
 * Atomically write a manifest (write to .tmp then rename).
 * @param {string} filePath
 * @param {Manifest} manifest
 */
export function writeManifest(filePath, manifest) {
  const abs = resolve(filePath);
  mkdirSync(dirname(abs), { recursive: true });
  const tmp = `${abs}.${process.pid}.tmp`;
  writeFileSync(tmp, JSON.stringify(manifest, null, 2));
  renameSync(tmp, abs);
}

/**
 * Stamp a phase entry on the manifest at filePath.
 * @param {string} filePath
 * @param {string} phase
 * @param {PhaseEntry} entry
 * @returns {Manifest}
 */
export function stampPhase(filePath, phase, entry) {
  const manifest = readManifest(filePath);
  manifest.phases[phase] = {
    stamped_at: new Date().toISOString(),
    ...entry,
  };
  writeManifest(filePath, manifest);
  return manifest;
}

/**
 * Validate that a manifest is structurally correct.
 * @param {Manifest} manifest
 * @returns {string | null} error message or null on success
 */
export function validateManifest(manifest) {
  if (!manifest || typeof manifest !== "object") return "manifest must be an object";
  if (manifest.schema !== "sdlc.execution.v1") return "manifest.schema must be sdlc.execution.v1";
  if (!manifest.execution_id) return "manifest.execution_id required";
  if (!manifest.spec_id) return "manifest.spec_id required";
  if (!manifest.head_sha) return "manifest.head_sha required";
  if (!manifest.phases || typeof manifest.phases !== "object") return "manifest.phases must be object";
  return null;
}

/**
 * CLI entry point.
 */
async function main() {
  const sub = argv[2];
  function arg(name) {
    const i = argv.indexOf(name);
    return i >= 0 ? argv[i + 1] : undefined;
  }

  if (sub === "init") {
    const specId = arg("--spec");
    const headSha = arg("--head-sha") ?? "";
    if (!specId) {
      console.error("execution-manifest init: --spec required");
      exit(2);
    }
    const { manifest, path } = initManifest(specId, headSha);
    stdout.write(
      JSON.stringify({ ok: true, execution_id: manifest.execution_id, path }) + "\n",
    );
    return;
  }

  if (sub === "stamp") {
    const file = arg("--file") ?? resolveManifestPath(undefined);
    const phase = arg("--phase");
    const outcome = arg("--outcome") ?? "pass";
    if (!file || !phase) {
      console.error("execution-manifest stamp: --file and --phase required");
      exit(2);
    }
    const entry = { outcome };
    const artifact = arg("--artifact");
    if (artifact) entry.artifact = artifact;
    const harnessId = arg("--harness-id");
    if (harnessId) entry.harness_id = harnessId;
    const runId = arg("--run-id");
    if (runId) entry.run_id = runId;
    const reportDir = arg("--report-dir");
    if (reportDir) entry.report_dir = reportDir;
    const updated = stampPhase(file, phase, entry);
    stdout.write(JSON.stringify({ ok: true, execution_id: updated.execution_id, phase }) + "\n");
    return;
  }

  if (sub === "verify") {
    const file = arg("--file") ?? resolveManifestPath(undefined);
    if (!file) {
      console.error("execution-manifest verify: --file required (or set SDLC_MANIFEST)");
      exit(2);
    }
    const manifest = readManifest(file);
    const err = validateManifest(manifest);
    if (err) {
      console.error(`execution-manifest verify: ${err}`);
      exit(1);
    }
    stdout.write(
      JSON.stringify({ ok: true, execution_id: manifest.execution_id, phases: Object.keys(manifest.phases) }) + "\n",
    );
    return;
  }

  console.error("Usage: execution-manifest.mjs <init|stamp|verify> [options]");
  exit(2);
}

// Only run CLI when invoked directly, not when imported as a module.
if (fileURLToPath(import.meta.url) === resolve(argv[1])) {
  main().catch((err) => {
    console.error(`execution-manifest: ${err.message}`);
    exit(1);
  });
}
