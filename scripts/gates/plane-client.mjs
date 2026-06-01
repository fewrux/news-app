/**
 * Minimal Plane read client for gate scripts (mirrors plane-sync auth/env).
 */
import { env, exit } from "node:process";
import { loadEnvFiles } from "../load-env.mjs";

loadEnvFiles();

const REQUIRED = [
  "PLANE_API_BASE",
  "PLANE_API_TOKEN",
  "PLANE_WORKSPACE_SLUG",
  "PLANE_PROJECT_ID",
];

export function ensurePlaneEnv() {
  const missing = REQUIRED.filter((k) => !env[k]);
  if (missing.length) {
    console.error(`gate: missing Plane env: ${missing.join(", ")}`);
    exit(2);
  }
}

function planeHeaders() {
  return {
    Accept: "application/json",
    "User-Agent":
      "Mozilla/5.0 (compatible; news-app-gates/1.0; +https://github.com/fewrux/news-app)",
    "X-API-Key": env.PLANE_API_TOKEN,
  };
}

function planeBase() {
  const base = env.PLANE_API_BASE.replace(/\/+$/, "");
  return `${base}/api/v1/workspaces/${env.PLANE_WORKSPACE_SLUG}/projects/${env.PLANE_PROJECT_ID}`;
}

async function planeGet(path) {
  const url = `${planeBase()}${path}`;
  const res = await fetch(url, { headers: planeHeaders() });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`plane ${res.status}: ${text.slice(0, 200)}`);
  }
  return text ? JSON.parse(text) : null;
}

/**
 * @param {string} issueId
 * @returns {Promise<{ id: string, html: string, text: string }[]>}
 */
export async function listIssueComments(issueId) {
  ensurePlaneEnv();
  const candidates = [
    `/issues/${issueId}/comments/`,
    `/work-items/${issueId}/comments/`,
  ];
  for (const path of candidates) {
    try {
      const data = await planeGet(path);
      const rows = Array.isArray(data) ? data : (data?.results ?? data?.comments ?? []);
      if (!Array.isArray(rows)) continue;
      return rows.map((c) => ({
        id: String(c.id ?? c.comment_id ?? ""),
        html: String(c.comment_html ?? c.comment ?? c.description ?? ""),
        text: String(c.comment_stripped ?? c.comment ?? ""),
      }));
    } catch {
      /* try next endpoint */
    }
  }
  throw new Error(`could not list comments for issue ${issueId}`);
}
