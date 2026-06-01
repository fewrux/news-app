#!/usr/bin/env node
/**
 * Phase exit gate runner — hard gates, no local waivers (dura lex, sed lex).
 *
 * Usage:
 *   node scripts/check-phase-exit.mjs --phase ideate   --artifact .sdlc/intents/INT-0001.md
 *   node scripts/check-phase-exit.mjs --phase specify  --artifact .sdlc/specs/SPEC-0001.md
 *   node scripts/check-phase-exit.mjs --phase design   --artifact .sdlc/decisions/0001-foo.md [--spec .sdlc/specs/SPEC-0001.md]
 *   node scripts/check-phase-exit.mjs --phase implement
 *   node scripts/check-phase-exit.mjs --phase verify   --spec .sdlc/specs/SPEC-0001.md [--head-sha SHA]
 *   node scripts/check-phase-exit.mjs --phase review   --pr 14
 *   node scripts/check-phase-exit.mjs --phase release  --tag v0.1.5
 */
import { validateIntent } from "./gates/validate-intent.mjs";
import { validateSpec } from "./gates/validate-spec.mjs";
import { validateAdr, validateDesignForSpec } from "./gates/validate-adr.mjs";
import { validateImplement } from "./gates/validate-implement.mjs";
import { validateVerify } from "./gates/validate-verify.mjs";
import { validateReview } from "./gates/validate-review.mjs";
import { validateRelease } from "./gates/validate-release.mjs";
import { fail, pass } from "./gates/common.mjs";
import { resolveManifestPath, stampPhase, readManifest, validateManifest } from "./execution-manifest.mjs";
import { existsSync } from "node:fs";
import { argv, exit, env } from "node:process";

function arg(name) {
  const i = argv.indexOf(name);
  return i >= 0 ? argv[i + 1] : undefined;
}

/**
 * If SDLC_MANIFEST env or --execution-id flag points to a manifest, stamp
 * the phase on pass. Silent no-op when neither is set (backward compatible).
 * @param {string} phase
 * @param {Record<string, unknown>} entry
 */
function tryStampManifest(phase, entry) {
  const execId = arg("--execution-id");
  const manifestPath = resolveManifestPath(execId);
  if (!manifestPath) return;
  try {
    if (!existsSync(manifestPath)) return;
    const manifest = readManifest(manifestPath);
    const err = validateManifest(manifest);
    if (err) return;
    stampPhase(manifestPath, phase, { outcome: "pass", ...entry });
  } catch {
    // Non-fatal: manifest stamping must not block a passing gate.
  }
}

const phase = arg("--phase");
if (!phase) {
  console.error("Usage: check-phase-exit.mjs --phase <ideate|specify|design|implement|verify|review|release> ...");
  exit(2);
}

async function main() {
  let msg;
  switch (phase) {
    case "ideate": {
      const artifact = arg("--artifact");
      if (!artifact) fail("--artifact required for ideate");
      msg = await validateIntent(artifact);
      tryStampManifest("ideate", { artifact });
      break;
    }
    case "specify": {
      const artifact = arg("--artifact");
      if (!artifact) fail("--artifact required for specify");
      msg = await validateSpec(artifact);
      tryStampManifest("specify", { artifact });
      break;
    }
    case "design": {
      const artifact = arg("--artifact");
      const spec = arg("--spec");
      if (artifact) {
        msg = await validateAdr(artifact, spec);
        tryStampManifest("design", { artifact });
      } else if (spec) {
        await validateDesignForSpec(spec);
        msg = "design not required";
        tryStampManifest("design", { artifact: spec, outcome: "skipped" });
      } else {
        fail("design requires --artifact (ADR) or --spec to check skip");
      }
      break;
    }
    case "implement":
      msg = validateImplement();
      tryStampManifest("implement", {});
      break;
    case "verify": {
      const spec = arg("--spec");
      if (!spec) fail("--spec required for verify");
      msg = await validateVerify(spec, arg("--head-sha"), arg("--execution-id"));
      tryStampManifest("verify", { artifact: spec });
      break;
    }
    case "review": {
      const pr = arg("--pr");
      if (!pr) fail("--pr required for review");
      msg = validateReview(pr);
      tryStampManifest("review", { pr_id: Number(pr) });
      break;
    }
    case "release": {
      const tag = arg("--tag");
      if (!tag) fail("--tag required for release");
      msg = validateRelease(tag);
      tryStampManifest("release", { tag });
      break;
    }
    default:
      fail(`unknown phase: ${phase}`);
  }
  pass(phase, msg);
}

main().catch((err) => {
  console.error(`gate: ${err.message}`);
  exit(2);
});
