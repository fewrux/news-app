import { existsSync } from "node:fs";
import { resolve } from "node:path";
import {
  ROOT,
  fail,
  parseFrontmatter,
  parseNestedBlock,
  readText,
  validateProvenance,
} from "./common.mjs";

const REQUIRED_SECTIONS = ["## Problem", "## Users", "## Success metric"];

/**
 * @param {string} artifactPath
 */
export async function validateIntent(artifactPath) {
  const abs = resolve(ROOT, artifactPath);
  if (!existsSync(abs)) fail(`intent artifact missing: ${artifactPath}`);

  const md = await readText(abs);
  const { frontmatter, body } = parseFrontmatter(md);

  if (!/^INT-\d+$/.test(frontmatter.id ?? "")) {
    fail("intent frontmatter id must match INT-NNNN");
  }
  if (!frontmatter.kind) fail("intent frontmatter kind required");
  if (!frontmatter.status) fail("intent frontmatter status required");

  const prov = parseNestedBlock(md, "provenance");
  const provErr = validateProvenance(
    { ...prov, created_at: prov.created_at || frontmatter.created_at },
    "planner",
  );
  if (provErr) fail(provErr);

  for (const heading of REQUIRED_SECTIONS) {
    if (!body.includes(heading)) fail(`intent missing section: ${heading}`);
  }

  const metric = body.split("## Success metric")[1]?.split("##")[0]?.trim();
  if (!metric || metric.length < 8) {
    fail("intent Success metric section too short");
  }

  return `intent ${frontmatter.id} complete`;
}
