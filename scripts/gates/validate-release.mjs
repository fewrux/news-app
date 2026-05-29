import { spawnSync } from "node:child_process";
import { env, exit } from "node:process";
import {
  fail,
  extractMarkerPayload,
  validateProvenance,
} from "./common.mjs";

function gh(args) {
  const r = spawnSync("gh", args, {
    encoding: "utf8",
    env: { ...process.env, GH_TOKEN: env.GH_TOKEN || env.GITHUB_TOKEN },
  });
  if (r.status !== 0) {
    console.error(`gate: gh failed: ${r.stderr || r.stdout}`);
    exit(2);
  }
  return r.stdout.trim();
}

/**
 * @param {string} tag e.g. v0.1.5
 */
export function validateRelease(tag) {
  const normalized = tag.startsWith("v") ? tag : `v${tag}`;
  const repo =
    env.GITHUB_REPOSITORY ||
    gh(["repo", "view", "--json", "nameWithOwner", "-q", ".nameWithOwner"]);

  let body = "";
  try {
    body = gh([
      "api",
      `repos/${repo}/releases/tags/${normalized}`,
      "-q",
      ".body",
    ]);
  } catch {
    fail(`GitHub release not found for tag ${normalized}`);
  }

  if (!body) fail(`release ${normalized} has empty body`);

  const payload = extractMarkerPayload(body, "release");
  if (!payload || typeof payload !== "object") {
    fail(`release ${normalized} missing sdlc:release:v1 marker in body`);
  }

  const p = /** @type {Record<string, unknown>} */ (payload);
  if (p.schema !== "sdlc.release.v1") fail("release payload schema must be sdlc.release.v1");
  if (p.version !== normalized) fail(`release version must be ${normalized}`);
  if (!Array.isArray(p.spec_ids) || p.spec_ids.length < 1) {
    fail("release payload must include spec_ids array");
  }
  if (!p.pr_url?.toString().startsWith("http")) {
    fail("release payload pr_url required");
  }

  const provErr = validateProvenance(
    /** @type {Record<string, string>} */ (p.provenance),
    "releaser",
  );
  if (provErr) fail(provErr);

  return `GitHub release ${normalized} valid`;
}
