#!/usr/bin/env node
/**
 * Classify changed paths into product vs operator lanes per SPEC-0005 / ADR-0006.
 *
 * Usage:
 *   node scripts/classify-diff.mjs [--base main] [--strict]
 *   node scripts/classify-diff.mjs --paths app/page.tsx .sdlc/foo.md
 *   node scripts/classify-diff.mjs --self-test
 *
 * Exit codes: 0 ok | 1 cross-lane (with --strict) | 2 usage error
 */
import { spawnSync } from "node:child_process";
import { argv, exit, stdout } from "node:process";

/** @type {readonly string[]} */
export const PRODUCT_PREFIXES = [
  "app/",
  "lib/",
  "components/",
  "public/",
];

/** @type {readonly string[]} */
export const PRODUCT_FILES = ["next.config.ts", "next.config.js", "next.config.mjs"];

/** @type {readonly string[]} */
export const OPERATOR_PREFIXES = [
  ".sdlc/",
  ".cursor/",
  "docs/",
  ".github/",
  "scripts/",
];

/** @type {readonly string[]} */
export const OPERATOR_FILES = [
  "AGENTS.md",
  "CLAUDE.md",
  "GEMINI.md",
  "README.md",
  "playwright.config.ts",
  "playwright.verify.config.ts",
  "package.json",
  "package-lock.json",
  "vercel.json",
  "eslint.config.mjs",
  "tsconfig.json",
  "postcss.config.mjs",
];

/**
 * @param {string} p
 * @returns {"product" | "operator" | "unknown"}
 */
export function laneForPath(p) {
  const norm = p.replace(/\\/g, "/").replace(/^\.\//, "");
  if (PRODUCT_PREFIXES.some((pre) => norm.startsWith(pre))) return "product";
  if (PRODUCT_FILES.includes(norm)) return "product";
  if (OPERATOR_PREFIXES.some((pre) => norm.startsWith(pre))) return "operator";
  if (OPERATOR_FILES.includes(norm)) return "operator";
  if (norm.startsWith("tests/e2e/")) return "product";
  return "unknown";
}

/**
 * @param {string[]} paths
 */
export function classifyPaths(paths) {
  const lanes = new Set();
  const byLane = { product: [], operator: [], unknown: [] };
  for (const p of paths) {
    const lane = laneForPath(p);
    lanes.add(lane);
    byLane[lane].push(p);
  }
  const hasProduct = lanes.has("product");
  const hasOperator = lanes.has("operator");
  let verdict = "empty";
  if (hasProduct && hasOperator) verdict = "cross_lane";
  else if (hasProduct) verdict = "product";
  else if (hasOperator) verdict = "operator";
  else if (lanes.has("unknown")) verdict = "unknown";
  return { verdict, lanes: [...lanes], byLane, paths };
}

function gitChangedPaths(base) {
  const diff = spawnSync("git", ["diff", "--name-only", `${base}...HEAD`], {
    encoding: "utf8",
  });
  if (diff.status !== 0) {
    const fallback = spawnSync("git", ["diff", "--name-only", "HEAD"], {
      encoding: "utf8",
    });
    if (fallback.status !== 0) {
      console.error("classify-diff: git diff failed");
      exit(2);
    }
    return fallback.stdout.split("\n").map((s) => s.trim()).filter(Boolean);
  }
  return diff.stdout.split("\n").map((s) => s.trim()).filter(Boolean);
}

function runSelfTest() {
  const cases = [
    { paths: ["app/page.tsx"], want: "product" },
    { paths: [".sdlc/specs/x.md"], want: "operator" },
    { paths: ["app/a.tsx", ".sdlc/b.md"], want: "cross_lane" },
    { paths: ["tests/e2e/home.spec.ts"], want: "product" },
    { paths: ["docs/foo.md"], want: "operator" },
  ];
  let failed = 0;
  for (const { paths, want } of cases) {
    const { verdict } = classifyPaths(paths);
    if (verdict !== want) {
      console.error(`FAIL ${JSON.stringify(paths)} => ${verdict}, want ${want}`);
      failed++;
    }
  }
  if (failed) exit(1);
  console.log("classify-diff: self-test ok");
}

function main() {
  const args = argv.slice(2);
  if (args.includes("--self-test")) {
    runSelfTest();
    return;
  }
  const strict = args.includes("--strict");
  const baseIdx = args.indexOf("--base");
  const base = baseIdx >= 0 ? args[baseIdx + 1] : "main";
  const pathsIdx = args.indexOf("--paths");
  const paths =
    pathsIdx >= 0
      ? args.slice(pathsIdx + 1).filter((a) => !a.startsWith("--"))
      : gitChangedPaths(base);

  const result = classifyPaths(paths);
  stdout.write(`${JSON.stringify(result, null, 2)}\n`);

  if (strict && result.verdict === "cross_lane") {
    console.error(
      "classify-diff: cross-lane PR blocked — split into separate product and operator PRs",
    );
    exit(1);
  }
}

main();
