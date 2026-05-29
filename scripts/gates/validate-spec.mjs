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

/**
 * @param {string} verifierCell
 */
function verifierResolvable(verifierCell) {
  const cell = verifierCell.trim().replace(/^`+|`+$/g, "");
  if (!cell || cell.includes("<")) return false;
  const pathPart = cell.split("::")[0].split("#")[0].trim();
  if (pathPart.startsWith("tests/") || pathPart.startsWith(".sdlc/evals/")) {
    return existsSync(resolve(ROOT, pathPart));
  }
  if (cell.startsWith("node ") || cell.startsWith("npm ") || cell.startsWith("npx ")) {
    return true;
  }
  if (/^(grep|rg|inspection|manual|file absent)/i.test(cell) || /manual inspection/i.test(cell)) {
    return true;
  }
  return existsSync(resolve(ROOT, pathPart));
}

/**
 * @param {string} artifactPath
 */
export async function validateSpec(artifactPath) {
  const abs = resolve(ROOT, artifactPath);
  if (!existsSync(abs)) fail(`spec artifact missing: ${artifactPath}`);

  const md = await readText(abs);
  const { frontmatter, body } = parseFrontmatter(md);
  const tracker = parseNestedBlock(md, "tracker");

  if (!/^SPEC-\d+$/.test(frontmatter.id ?? "")) {
    fail("spec frontmatter id must match SPEC-NNNN");
  }
  if (!frontmatter.intent?.startsWith("INT-")) {
    fail("spec frontmatter intent must reference INT-NNNN");
  }
  if (!["product", "operator"].includes(frontmatter.surface ?? "")) {
    fail("spec frontmatter surface must be product or operator");
  }
  if (!frontmatter.status) fail("spec frontmatter status required");

  const prov = parseNestedBlock(md, "provenance");
  const provErr = validateProvenance(
    { ...prov, created_at: prov.created_at || frontmatter.created_at },
    "planner",
  );
  if (provErr) fail(provErr);

  if (!body.includes("## Acceptance criteria")) {
    fail("spec missing ## Acceptance criteria");
  }

  const acSection = body.split("## Acceptance criteria")[1]?.split("##")[0] ?? "";
  const rows = acSection.match(/^\|[^|]+\|[^|]+\|[^|]+\|/gm) ?? [];
  const dataRows = rows.filter((r) => !r.includes("---") && !/^\|\s*ID\s/i.test(r));
  if (dataRows.length < 1) fail("spec must have at least one acceptance criterion row");

  for (const row of dataRows) {
    const cols = row.split("|").map((c) => c.trim()).filter(Boolean);
    if (cols.length < 3) continue;
    const [id, , verifier] = cols;
    if (!/^AC-\d+$/i.test(id)) fail(`invalid AC id: ${id}`);
    if (!verifierResolvable(verifier)) {
      fail(`AC ${id} verifier not resolvable: ${verifier}`);
    }
  }

  const issuesRaw = tracker.issues ?? "";
  const hasIssue =
    issuesRaw && issuesRaw !== "[]" && issuesRaw.replace(/[\[\]"'\s]/g, "").length > 0;
  const hasWaiver = /tracker_waiver:/m.test(md);
  if (frontmatter.status === "todo" && !hasIssue && !hasWaiver) {
    fail("spec at status todo requires tracker.issues[0] or tracker_waiver note");
  }

  const affectedMatch = body.match(/affected paths?:([^\n]+)/i);
  if (affectedMatch) {
    const paths = affectedMatch[1].split(/[,;]/).map((p) => p.trim()).filter(Boolean);
    if (paths.length >= 10 && !/split:\s*true/i.test(body)) {
      fail("spec touches >= 10 paths without split: true");
    }
  }

  return `spec ${frontmatter.id} (${frontmatter.surface}) complete`;
}
