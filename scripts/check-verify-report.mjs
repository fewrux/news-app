#!/usr/bin/env node
/**
 * @deprecated Use check-phase-exit.mjs --phase verify instead.
 * Thin wrapper for backward compatibility.
 */
import { spawnSync } from "node:child_process";
import { argv, exit } from "node:process";

const specIdx = argv.indexOf("--spec");
const spec = specIdx >= 0 ? argv[specIdx + 1] : process.env.VERIFY_SPEC_PATH;
if (!spec) {
  console.error("check-verify-report: --spec required (or VERIFY_SPEC_PATH)");
  exit(2);
}

const headIdx = argv.indexOf("--head-sha");
const headArgs = headIdx >= 0 ? ["--head-sha", argv[headIdx + 1]] : [];

const r = spawnSync(
  process.execPath,
  ["scripts/check-phase-exit.mjs", "--phase", "verify", "--spec", spec, ...headArgs],
  { encoding: "utf8", stdio: "inherit" },
);
exit(r.status ?? 1);
