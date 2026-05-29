#!/usr/bin/env node
/**
 * Create or update a GitHub Release with embedded sdlc:release:v1 payload.
 *
 * Usage:
 *   node scripts/post-release.mjs --tag v0.1.5 --payload release.json
 */
import { readFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { argv, env, exit } from "node:process";
import { wrapMarkerPayload } from "./gates/common.mjs";
import { validateRelease } from "./gates/validate-release.mjs";

function arg(name) {
  const i = argv.indexOf(name);
  return i >= 0 ? argv[i + 1] : undefined;
}

function gh(args) {
  const r = spawnSync("gh", args, {
    encoding: "utf8",
    env: { ...process.env, GH_TOKEN: env.GH_TOKEN || env.GITHUB_TOKEN },
  });
  if (r.status !== 0) {
    console.error(r.stderr || r.stdout);
    exit(1);
  }
  return r.stdout.trim();
}

async function main() {
  const tag = arg("--tag");
  const payloadPath = arg("--payload");
  if (!tag || !payloadPath) {
    console.error("Usage: post-release.mjs --tag v0.1.5 --payload release.json");
    exit(2);
  }

  const normalized = tag.startsWith("v") ? tag : `v${tag}`;
  const payload = JSON.parse(await readFile(resolve(payloadPath), "utf8"));
  if (!payload.schema) payload.schema = "sdlc.release.v1";
  payload.version = normalized;

  const marker = wrapMarkerPayload("release", payload);
  const summary = payload.summary ?? `# Release ${normalized}`;
  const body = `${summary}\n\n${marker}`;

  const repo =
    env.GITHUB_REPOSITORY ||
    gh(["repo", "view", "--json", "nameWithOwner", "-q", ".nameWithOwner"]);

  const target = payload.head_sha ?? "main";
  gh([
    "release",
    "create",
    normalized,
    "--repo",
    repo,
    "--title",
    normalized,
    "--notes",
    body,
    "--target",
    target,
  ]);

  validateRelease(normalized);
  console.log(JSON.stringify({ ok: true, tag: normalized }));
}

main().catch((err) => {
  console.error(`post-release: ${err.message}`);
  exit(1);
});
