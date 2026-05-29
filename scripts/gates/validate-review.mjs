import {
  fail,
  latestMarkerPayload,
  validateProvenance,
} from "./common.mjs";
import { listPrCommentBodies } from "./github-client.mjs";

/**
 * @param {unknown} payload
 * @param {number | string} prNumber
 */
export function validateReviewPayload(payload, prNumber) {
  if (!payload || typeof payload !== "object") fail("review payload missing or invalid");
  const p = /** @type {Record<string, unknown>} */ (payload);
  if (p.schema !== "sdlc.review.v1") fail("review payload schema must be sdlc.review.v1");

  if (String(p.pr_id) !== String(prNumber)) {
    fail(`review pr_id must be ${prNumber}, got ${p.pr_id}`);
  }
  if (p.verdict !== "approved") fail(`review verdict must be approved, got ${p.verdict}`);
  if (p.implementer_distinct_from_reviewer !== true) {
    fail("review implementer_distinct_from_reviewer must be true");
  }

  const blockers = /** @type {unknown[]} */ (p.blockers ?? []);
  if (Array.isArray(blockers) && blockers.length > 0) {
    fail(`review has blockers: ${JSON.stringify(blockers)}`);
  }

  const provErr = validateProvenance(
    /** @type {Record<string, string>} */ (p.provenance),
    "reviewer",
  );
  if (provErr) fail(provErr);

  const be = /** @type {Record<string, string>} */ (p.browser_evidence ?? {});
  if (!be.status) fail("review browser_evidence.status required");
  if (be.status === "posted") {
    if (!be.plane_comment_url?.startsWith("http")) {
      fail("review browser_evidence posted requires plane_comment_url");
    }
  } else if (be.status === "waived") {
    if (!be.waiver_reason || be.waiver_reason.length < 8) {
      fail("review browser_evidence waived requires waiver_reason");
    }
  } else {
    fail("review browser_evidence.status must be posted or waived");
  }

  return true;
}

/**
 * @param {number | string} prNumber
 */
export function validateReview(prNumber) {
  const bodies = listPrCommentBodies(prNumber);
  const payload = latestMarkerPayload(bodies, "review");
  if (!payload) {
    fail(`no sdlc:review:v1 marker on PR #${prNumber} — run scripts/post-review.mjs`);
  }
  validateReviewPayload(payload, prNumber);
  return `PR #${prNumber} has valid review comment`;
}
