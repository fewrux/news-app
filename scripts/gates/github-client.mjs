/**
 * Minimal GitHub API client for gate scripts (uses gh CLI).
 */
import { spawnSync } from "node:child_process";
import { env, exit } from "node:process";

function ghJson(args) {
  const r = spawnSync("gh", args, {
    encoding: "utf8",
    env: { ...process.env, GH_TOKEN: env.GH_TOKEN || env.GITHUB_TOKEN },
  });
  if (r.status !== 0) {
    console.error(`gate: gh ${args.join(" ")} failed: ${r.stderr || r.stdout}`);
    exit(2);
  }
  return r.stdout.trim();
}

function repoSlug() {
  return env.GITHUB_REPOSITORY || ghJson(["repo", "view", "--json", "nameWithOwner", "-q", ".nameWithOwner"]);
}

/**
 * @param {number | string} prNumber
 * @returns {string[]}
 */
export function listPrCommentBodies(prNumber) {
  const repo = repoSlug();
  const raw = ghJson([
    "api",
    `repos/${repo}/issues/${prNumber}/comments`,
    "--paginate",
  ]);
  if (!raw) return [];
  const rows = JSON.parse(raw);
  if (!Array.isArray(rows)) return [];
  return rows.map((c) => String(c.body ?? ""));
}

/**
 * @param {number | string} prNumber
 * @param {string} body
 */
export function postPrComment(prNumber, body) {
  const repo = repoSlug();
  spawnSync(
    "gh",
    ["api", `repos/${repo}/issues/${prNumber}/comments`, "-f", `body=${body}`],
    {
      encoding: "utf8",
      env: { ...process.env, GH_TOKEN: env.GH_TOKEN || env.GITHUB_TOKEN },
      stdio: "inherit",
    },
  );
}
