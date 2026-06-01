import {
  fail,
  extractMarkerPayload,
  latestMarkerPayload,
  parseFrontmatter,
  parseNestedBlock,
  readText,
} from "./common.mjs";
import { listIssueComments } from "./plane-client.mjs";

/**
 * @param {unknown} payload
 * @param {string} surface
 * @param {string | undefined} headSha
 */
function validateVerifyPayload(payload, surface, headSha) {
  if (!payload || typeof payload !== "object") fail("verify payload missing or invalid");
  const p = /** @type {Record<string, unknown>} */ (payload);
  if (p.schema !== "sdlc.verify.v1") fail("verify payload schema must be sdlc.verify.v1");

  const ac = /** @type {Array<{ id?: string; outcome?: string; verifier?: string }>} */ (
    p.acceptance_criteria ?? p.results ?? []
  );
  if (!Array.isArray(ac) || ac.length < 1) {
    fail("verify payload must include acceptance_criteria with >= 1 row");
  }
  for (const row of ac) {
    const id = row.id ?? row.ac;
    if (!id) fail("verify AC row missing id");
    if (row.outcome !== "pass") fail(`verify AC ${id} outcome must be pass, got ${row.outcome}`);
  }

  const be = /** @type {Record<string, unknown>} */ (p.browser_evidence ?? {});
  if (surface === "product") {
    if (be.status !== "posted") fail("product verify requires browser_evidence.status posted on Plane");
    if (!be.plane_comment_url && !be.plane_comment_id) {
      fail("product verify requires plane comment reference in browser_evidence");
    }
    if (be.video_attached !== true) {
      fail("product verify requires browser_evidence.video_attached === true");
    }
    if (!be.plane_attachment_id && !be.video_path) {
      fail("product verify requires plane_attachment_id or video_path in browser_evidence");
    }
  } else {
    if (be.status !== "waived") fail("operator verify requires browser_evidence.status waived");
    if (!be.waiver_reason || be.waiver_reason.length < 8) {
      fail("operator verify requires waiver_reason (min 8 chars)");
    }
  }

  if (headSha && p.head_sha && p.head_sha !== headSha) {
    fail(`verify head_sha mismatch: expected ${headSha}, got ${p.head_sha}`);
  }

  return true;
}

/**
 * @param {string} specPath
 * @param {string | undefined} headSha
 */
export async function validateVerify(specPath, headSha) {
  const md = await readText(specPath);
  const { frontmatter } = parseFrontmatter(md);
  const tracker = parseNestedBlock(md, "tracker");
  const surface = frontmatter.surface ?? "operator";

  const issuesRaw = tracker.issues ?? "";
  const issueId = issuesRaw.replace(/[\[\]"'\s]/g, "").split(",")[0];
  if (!issueId) {
    fail("verify gate requires spec tracker.issues[0] — run plane-sync create-from-spec");
  }

  const comments = await listIssueComments(issueId);
  const bodies = comments.map((c) => c.html + "\n" + c.text);

  let payload = null;
  if (headSha) {
    // Plane lists comments newest-first; take the first matching head_sha.
    for (let i = 0; i < bodies.length; i++) {
      const p = extractMarkerPayload(bodies[i], "verify");
      if (p && typeof p === "object" && /** @type {{head_sha?: string}} */ (p).head_sha === headSha) {
        payload = p;
        break;
      }
    }
  }
  if (!payload) payload = latestMarkerPayload(bodies, "verify");
  if (!payload) {
    fail(`no sdlc:verify:v1 marker on Plane issue ${issueId} — run plane-sync post-evidence`);
  }

  validateVerifyPayload(payload, surface, headSha);
  return `Plane issue ${issueId} has valid verify payload (${surface})`;
}

/** @param {unknown} payload */
export function validateVerifyPayloadExport(payload, surface, headSha) {
  validateVerifyPayload(payload, surface, headSha);
  return true;
}
