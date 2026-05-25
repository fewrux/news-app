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
//   node scripts/plane-sync.mjs sync-docs            [docs-dir]  # mirrors docs/*.md to Plane pages
//   node scripts/plane-sync.mjs purge-docs           [docs-dir]  # DELETEs every page in the local map (recovery)
//   node scripts/plane-sync.mjs github-event          # reads $GITHUB_EVENT_PATH

import { readFile, writeFile, readdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
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
  // Plane sits behind Cloudflare; bursting writes returns HTTP 403 with
  // an HTML challenge body. 429 is similar. Retry both with backoff so
  // a slow sync still completes rather than half-finishing.
  const maxAttempts = 4;
  let lastErr;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const res = await fetch(url, { ...init, headers: planeHeaders() });
    const text = await res.text();
    if (res.ok) return text ? JSON.parse(text) : null;
    const isRateLimit =
      res.status === 429 ||
      (res.status === 403 && text.includes("Cloudflare"));
    lastErr = new Error(
      `plane ${res.status} ${url}: ${text.slice(0, 200).replace(/\s+/g, " ")}`,
    );
    if (!isRateLimit || attempt === maxAttempts) throw lastErr;
    const wait = 5000 * attempt;
    console.warn(
      `plane-sync: ${res.status} (rate-limited); waiting ${wait}ms before retry ${attempt + 1}/${maxAttempts}`,
    );
    await new Promise((r) => setTimeout(r, wait));
  }
  throw lastErr;
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

// Plane requires label UUIDs on issue create, not names. Resolve provided
// label names against the project's /labels/ collection, creating any that
// don't yet exist, and return the matching IDs.
async function resolveLabels(names) {
  const wanted = [...new Set((names ?? []).filter(Boolean).map(String))];
  if (wanted.length === 0) return [];

  const existing = await planeFetch(`/labels/?per_page=100`);
  const list = Array.isArray(existing) ? existing : (existing?.results ?? []);
  const byName = new Map(list.map((l) => [l.name.toLowerCase(), l.id]));

  const ids = [];
  for (const name of wanted) {
    const key = name.toLowerCase();
    let id = byName.get(key);
    if (!id) {
      const created = await planeFetch(`/labels/`, {
        method: "POST",
        body: JSON.stringify({ name }),
      });
      id = created.id;
      byName.set(key, id);
    }
    ids.push(id);
  }
  return ids;
}

async function createIssue({ name, description, labels = [], state }) {
  const labelIds = await resolveLabels(labels);
  return planeFetch(`/issues/`, {
    method: "POST",
    body: JSON.stringify({ name, description, labels: labelIds, state }),
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

// --- Docs → Plane pages ---------------------------------------------------
//
// Mirrors every Markdown file under `docs/` to a Plane native page. The
// `external_id` field (`docs/<relpath>`) drives idempotency: first sync
// creates, subsequent syncs patch in place. No state file is needed.
//
// Plane's `description_html` accepts HTML, so we ship a tiny zero-dep
// Markdown converter inline (the rest of this script is also zero-dep).
// The converter covers what the project's docs actually use: headings,
// paragraphs, fenced code, inline code, bold/italic, links, ordered and
// unordered lists, blockquotes, horizontal rules, and naive pipe tables.

const HTML_ESCAPES = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" };
function escapeHtml(s) {
  return s.replace(/[&<>"]/g, (c) => HTML_ESCAPES[c]);
}

function renderInline(s) {
  let out = escapeHtml(s);
  out = out.replace(/`([^`]+)`/g, "<code>$1</code>");
  out = out.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  out = out.replace(/(^|[^*])\*([^*\s][^*]*?)\*(?!\*)/g, "$1<em>$2</em>");
  out = out.replace(/\b_([^_\s][^_]*?)_\b/g, "<em>$1</em>");
  out = out.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
  return out;
}

function isTableSeparator(line) {
  return /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)+\|?\s*$/.test(line);
}

function splitTableRow(line) {
  return line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((c) => c.trim());
}

function mdToHtml(md) {
  const lines = md.replace(/\r\n/g, "\n").split("\n");
  const out = [];
  let i = 0;
  let listKind = null; // "ul" | "ol" | null

  const closeList = () => {
    if (listKind) {
      out.push(`</${listKind}>`);
      listKind = null;
    }
  };

  while (i < lines.length) {
    const line = lines[i];

    if (/^\s*$/.test(line)) {
      closeList();
      i++;
      continue;
    }

    if (/^```/.test(line)) {
      closeList();
      const lang = line.replace(/^```/, "").trim();
      const buf = [];
      i++;
      while (i < lines.length && !/^```/.test(lines[i])) {
        buf.push(lines[i]);
        i++;
      }
      i++;
      const cls = lang ? ` class="language-${escapeHtml(lang)}"` : "";
      out.push(`<pre><code${cls}>${escapeHtml(buf.join("\n"))}</code></pre>`);
      continue;
    }

    const h = line.match(/^(#{1,6})\s+(.+?)\s*#*\s*$/);
    if (h) {
      closeList();
      const level = h[1].length;
      out.push(`<h${level}>${renderInline(h[2])}</h${level}>`);
      i++;
      continue;
    }

    if (/^\s*-{3,}\s*$/.test(line)) {
      closeList();
      out.push("<hr />");
      i++;
      continue;
    }

    if (
      /^\s*\|/.test(line) &&
      i + 1 < lines.length &&
      isTableSeparator(lines[i + 1])
    ) {
      closeList();
      const header = splitTableRow(line);
      i += 2;
      const rows = [];
      while (i < lines.length && /^\s*\|/.test(lines[i])) {
        rows.push(splitTableRow(lines[i]));
        i++;
      }
      const th = header.map((c) => `<th>${renderInline(c)}</th>`).join("");
      const trs = rows
        .map(
          (r) =>
            `<tr>${r.map((c) => `<td>${renderInline(c)}</td>`).join("")}</tr>`,
        )
        .join("");
      out.push(`<table><thead><tr>${th}</tr></thead><tbody>${trs}</tbody></table>`);
      continue;
    }

    const ul = line.match(/^\s*[-*+]\s+(.+)$/);
    if (ul) {
      if (listKind !== "ul") {
        closeList();
        out.push("<ul>");
        listKind = "ul";
      }
      out.push(`<li>${renderInline(ul[1])}</li>`);
      i++;
      continue;
    }

    const ol = line.match(/^\s*\d+\.\s+(.+)$/);
    if (ol) {
      if (listKind !== "ol") {
        closeList();
        out.push("<ol>");
        listKind = "ol";
      }
      out.push(`<li>${renderInline(ol[1])}</li>`);
      i++;
      continue;
    }

    const bq = line.match(/^>\s?(.*)$/);
    if (bq) {
      closeList();
      const buf = [bq[1]];
      i++;
      while (i < lines.length && /^>\s?/.test(lines[i])) {
        buf.push(lines[i].replace(/^>\s?/, ""));
        i++;
      }
      out.push(`<blockquote>${renderInline(buf.join(" "))}</blockquote>`);
      continue;
    }

    closeList();
    const para = [line];
    i++;
    while (
      i < lines.length &&
      !/^\s*$/.test(lines[i]) &&
      !/^(#|```|>|\s*[-*+]\s|\s*\d+\.\s|\s*-{3,}\s*$|\s*\|)/.test(lines[i])
    ) {
      para.push(lines[i]);
      i++;
    }
    out.push(`<p>${renderInline(para.join(" "))}</p>`);
  }
  closeList();
  return out.join("\n");
}

async function collectDocFiles(rootRel) {
  const root = resolve(rootRel);
  const entries = await readdir(root, { withFileTypes: true });
  const out = [];
  for (const e of entries) {
    if (e.isFile() && e.name.endsWith(".md")) out.push(e.name);
  }
  return out.sort();
}

const EXTERNAL_SOURCE = "news-app-docs";

// Plane sits behind Cloudflare; bursting writes trips the WAF's rate
// limit (HTTP 403 with an HTML challenge body) after ~9 consecutive
// POST/PATCH calls. A pause between writes plus retry-with-backoff in
// planeFetch() keeps us under the threshold and lets a slow sync finish.
const WRITE_DELAY_MS = 1100;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Plane's `/pages/` list endpoint does NOT expose `external_id` /
// `external_source` in the summary payload (only on the detail GET),
// so we cannot rely on the API alone for idempotency without N+1
// detail fetches. Instead, we persist a committed mapping file:
//
//   docs/.plane-pages.json
//   { "<rel-path>": "<plane-page-uuid>", ... }
//
// The file is small, deterministic, and survives across local runs and
// CI runs (since it's committed). The sync upserts based on it:
// hit → PATCH; miss → POST and record the new id.
function pagesMapPath(rootRel) {
  return resolve(rootRel, ".plane-pages.json");
}

async function loadPagesMap(rootRel) {
  const p = pagesMapPath(rootRel);
  if (!existsSync(p)) return {};
  try {
    return JSON.parse(await readFile(p, "utf8"));
  } catch (err) {
    console.warn(`plane-sync: ${p} unreadable (${err.message}); starting fresh`);
    return {};
  }
}

async function savePagesMap(rootRel, map) {
  const sorted = Object.fromEntries(
    Object.entries(map).sort(([a], [b]) => a.localeCompare(b)),
  );
  await writeFile(
    pagesMapPath(rootRel),
    JSON.stringify(sorted, null, 2) + "\n",
  );
}

async function pageExists(id) {
  try {
    await planeFetch(`/pages/${id}/`);
    return true;
  } catch (err) {
    if (/\bplane 404\b/.test(err.message)) return false;
    throw err;
  }
}

async function syncDocs(rootRel = "docs") {
  ensureEnv();
  if (!existsSync(resolve(rootRel))) {
    console.error(`plane-sync: docs dir not found: ${rootRel}`);
    exit(2);
  }

  const files = await collectDocFiles(rootRel);
  if (files.length === 0) {
    console.log(`plane-sync: no .md files under ${rootRel}/; nothing to sync.`);
    return;
  }

  const map = await loadPagesMap(rootRel);
  let created = 0;
  let updated = 0;

  for (let idx = 0; idx < files.length; idx++) {
    const name = files[idx];
    if (idx > 0) await sleep(WRITE_DELAY_MS);

    const full = resolve(rootRel, name);
    const md = await readFile(full, "utf8");
    const title = firstHeading(md) || name.replace(/\.md$/, "");
    const relKey = `${rootRel}/${name}`;
    const payload = {
      name: title,
      access: 0,
      description_html: mdToHtml(md),
      external_id: relKey,
      external_source: EXTERNAL_SOURCE,
    };

    const knownId = map[relKey];
    if (knownId && (await pageExists(knownId))) {
      await planeFetch(`/pages/${knownId}/`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });
      updated++;
      console.log(`plane-sync: updated page ${knownId} (${relKey})`);
    } else {
      const page = await planeFetch(`/pages/`, {
        method: "POST",
        body: JSON.stringify(payload),
      });
      map[relKey] = page.id;
      // Persist incrementally so a mid-sync rate-limit doesn't leave us
      // with un-tracked pages that turn into duplicates on the next run.
      await savePagesMap(rootRel, map);
      created++;
      console.log(`plane-sync: created page ${page.id} (${relKey})`);
    }
  }

  await savePagesMap(rootRel, map);
  console.log(
    `plane-sync: sync-docs done — ${created} created, ${updated} updated, ${files.length} total.`,
  );
}

// One-off helper for cleanup after a failed/duplicated sync: delete
// every Plane page id named in the local map and clear the file. Use
// only when you intend to re-sync from a clean slate.
async function purgeDocs(rootRel = "docs") {
  ensureEnv();
  const map = await loadPagesMap(rootRel);
  const ids = Object.values(map);
  if (ids.length === 0) {
    console.log(`plane-sync: no ids in ${pagesMapPath(rootRel)}; nothing to purge.`);
    return;
  }
  let i = 0;
  for (const id of ids) {
    if (i > 0) await sleep(WRITE_DELAY_MS);
    try {
      await planeFetch(`/pages/${id}/`, { method: "DELETE" });
      console.log(`plane-sync: purged page ${id}`);
    } catch (err) {
      console.warn(`plane-sync: purge ${id} failed (${err.message})`);
    }
    i++;
  }
  await savePagesMap(rootRel, {});
  console.log(`plane-sync: purge-docs done — ${ids.length} ids attempted.`);
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
  "sync-docs":            ([dir])   => syncDocs(dir ?? "docs"),
  "purge-docs":           ([dir])   => purgeDocs(dir ?? "docs"),
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
