#!/usr/bin/env node
/**
 * Post structured review verdict as a PR comment (canonical review artifact).
 *
 * Usage:
 *   node scripts/post-review.mjs --pr 14 --payload review.json
 *   node scripts/post-review.mjs --pr 14 --payload review.json --summary "Approved: ..."
 */
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { argv, exit } from "node:process";
import { wrapMarkerPayload } from "./gates/common.mjs";
import { validateReviewPayload } from "./gates/validate-review.mjs";
import { postPrComment } from "./gates/github-client.mjs";

function arg(name) {
  const i = argv.indexOf(name);
  return i >= 0 ? argv[i + 1] : undefined;
}

async function main() {
  const pr = arg("--pr");
  const payloadPath = arg("--payload");
  const summary = arg("--summary") ?? "SDLC review verdict (see embedded payload).";

  if (!pr || !payloadPath) {
    console.error("Usage: post-review.mjs --pr <N> --payload <review.json> [--summary text]");
    exit(2);
  }

  const raw = await readFile(resolve(payloadPath), "utf8");
  const payload = JSON.parse(raw);
  if (!payload.schema) payload.schema = "sdlc.review.v1";
  payload.pr_id = Number(pr);

  validateReviewPayload(payload, pr);

  const be = /** @type {Record<string, string>} */ (payload.browser_evidence ?? {});
  const blockers = /** @type {unknown[]} */ (payload.blockers ?? []);

  const body = `${summary}

| Field | Value |
|-------|-------|
| Verdict | **${payload.verdict}** |
| PR | #${pr} |
| Browser evidence | ${be.status ?? "n/a"}${be.waiver_reason ? ` — ${be.waiver_reason}` : ""} |
| Blockers | ${blockers.length === 0 ? "none" : blockers.length} |

${wrapMarkerPayload("review", payload)}

*Posted by news-app post-review (gate.review_approved).*`;

  postPrComment(pr, body);
  console.log(JSON.stringify({ ok: true, pr_id: Number(pr), verdict: payload.verdict }));
}

main().catch((err) => {
  console.error(`post-review: ${err.message}`);
  exit(1);
});
