#!/usr/bin/env node
// Plane sync — minimal, free-tier-safe wrapper around the Plane REST API.
// See node_modules/next/dist/docs/01-app/02-guides/instrumentation.md
// for unrelated context; this script does not run in Next's runtime.
//
// Usage:
//   node scripts/plane-sync.mjs create-from-intent   <path-to-intent.md>
//   node scripts/plane-sync.mjs create-from-incident <path-to-incident.md>
//   node scripts/plane-sync.mjs link-spec            <path-to-spec.md> <issue-id>
//   node scripts/plane-sync.mjs close-cycle          <cycle-id>
//   node scripts/plane-sync.mjs github-event          # reads $GITHUB_EVENT_PATH

import { readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { argv, env, exit } from "node:process";

const REQUIRED = [
  "PLANE_API_BASE",
  "PLANE_API_TOKEN",
  "PLANE_WORKSPACE_SLUG",
  "PLANE_PROJECT_ID",
];

function ensureEnv() {
  const missing = REQUIRED.filter((k) => !env[k]);
  if (missing.length) {
    console.error(`plane-sync: missing env: ${missing.join(", ")}`);
    exit(2);
  }
}

function planeHeaders() {
  return {
    "Content-Type": "application/json",
    "X-API-Key": env.PLANE_API_TOKEN,
  };
}

function planeBase() {
  const base = env.PLANE_API_BASE.replace(/\/+$/, "");
  return `${base}/api/v1/workspaces/${env.PLANE_WORKSPACE_SLUG}/projects/${env.PLANE_PROJECT_ID}`;
}

async function planeFetch(path, init = {}) {
  const url = `${planeBase()}${path}`;
  const res = await fetch(url, { ...init, headers: planeHeaders() });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`plane ${res.status} ${url}: ${text.slice(0, 400)}`);
  }
  return text ? JSON.parse(text) : null;
}

function parseFrontmatter(md) {
  const m = md.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!m) return { frontmatter: {}, body: md };
  const fm = {};
  for (const line of m[1].split("\n")) {
    const kv = line.match(/^([\w_-]+):\s*(.*)$/);
    if (kv) fm[kv[1]] = kv[2].trim();
  }
  return { frontmatter: fm, body: m[2] };
}

function firstHeading(body) {
  const m = body.match(/^#\s+(.+)$/m);
  return m ? m[1].trim() : "Untitled";
}

async function rewriteFrontmatter(path, key, value) {
  const md = await readFile(path, "utf8");
  let updated;
  if (/^---\n[\s\S]*?\n---/.test(md)) {
    const re = new RegExp(`(^---[\\s\\S]*?\\n)${key}:.*$`, "m");
    if (re.test(md)) {
      updated = md.replace(re, `$1${key}: ${value}`);
    } else {
      updated = md.replace(/^(---\n[\s\S]*?)(\n---)/, `$1\n${key}: ${value}$2`);
    }
  } else {
    updated = `---\n${key}: ${value}\n---\n${md}`;
  }
  await writeFile(path, updated);
}

async function createIssue({ name, description, labels = [], state }) {
  return planeFetch(`/issues/`, {
    method: "POST",
    body: JSON.stringify({ name, description, labels, state }),
  });
}

// --- Subcommands ----------------------------------------------------------

async function createFromIntent(path) {
  ensureEnv();
  const md = await readFile(path, "utf8");
  const { frontmatter, body } = parseFrontmatter(md);
  const issue = await createIssue({
    name: `[Intent] ${firstHeading(body)}`,
    description: body,
    labels: ["intent", frontmatter.kind].filter(Boolean),
  });
  await rewriteFrontmatter(path, "plane_issue", issue.id);
  console.log(`plane-sync: created intent issue ${issue.id} (${issue.name})`);
}

async function createFromIncident(path) {
  ensureEnv();
  const md = await readFile(path, "utf8");
  const { frontmatter, body } = parseFrontmatter(md);
  const issue = await createIssue({
    name: `[Incident] ${firstHeading(body)}`,
    description: body,
    labels: ["incident", frontmatter.severity].filter(Boolean),
  });
  await rewriteFrontmatter(path, "plane_issue", issue.id);
  console.log(`plane-sync: created incident issue ${issue.id}`);
}

async function linkSpec(path, issueId) {
  if (!existsSync(path)) {
    console.error(`plane-sync: spec not found: ${path}`);
    exit(2);
  }
  await rewriteFrontmatter(path, "plane_issue", issueId);
  console.log(`plane-sync: linked ${path} to plane issue ${issueId}`);
}

async function closeCycle(cycleId) {
  ensureEnv();
  await planeFetch(`/cycles/${cycleId}/`, {
    method: "PATCH",
    body: JSON.stringify({ status: "completed" }),
  });
  console.log(`plane-sync: closed cycle ${cycleId}`);
}

async function fromGithubEvent() {
  ensureEnv();
  const path = env.GITHUB_EVENT_PATH;
  if (!path || !existsSync(path)) {
    console.log("plane-sync: no GITHUB_EVENT_PATH; skipping.");
    return;
  }
  const event = JSON.parse(await readFile(path, "utf8"));
  const eventName = env.GITHUB_EVENT_NAME ?? "";

  if (eventName === "pull_request") {
    const pr = event.pull_request;
    const issue = await createIssue({
      name: `[PR #${pr.number}] ${pr.title}`,
      description: `${pr.html_url}\n\n${pr.body ?? ""}`,
      labels: ["github", "pr"],
    });
    console.log(`plane-sync: created PR mirror issue ${issue.id}`);
  } else if (eventName === "issues") {
    const gh = event.issue;
    const issue = await createIssue({
      name: `[GH #${gh.number}] ${gh.title}`,
      description: `${gh.html_url}\n\n${gh.body ?? ""}`,
      labels: ["github", "issue"],
    });
    console.log(`plane-sync: created GH issue mirror ${issue.id}`);
  } else {
    console.log(`plane-sync: ignoring event ${eventName}`);
  }
}

// --- Entrypoint -----------------------------------------------------------

const [, , cmd, ...rest] = argv;

const handlers = {
  "create-from-intent":   ([p])     => createFromIntent(p),
  "create-from-incident": ([p])     => createFromIncident(p),
  "link-spec":            ([p, id]) => linkSpec(p, id),
  "close-cycle":          ([id])    => closeCycle(id),
  "github-event":         ()        => fromGithubEvent(),
};

const handler = handlers[cmd];
if (!handler) {
  console.error(`Unknown command: ${cmd ?? "<none>"}`);
  console.error(`Available: ${Object.keys(handlers).join(", ")}`);
  exit(1);
}

handler(rest).catch((err) => {
  console.error(`plane-sync: ${err.message}`);
  exit(1);
});
