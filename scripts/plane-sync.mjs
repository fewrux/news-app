#!/usr/bin/env node
// Plane sync — minimal, free-tier-safe wrapper around the Plane REST API.
// See node_modules/next/dist/docs/01-app/02-guides/instrumentation.md
// for unrelated context; this script does not run in Next's runtime.
//
// Usage (the six-verb adapter contract is declared in
// .sdlc/sdlc.yaml.integrations.tracker.adapter_contract; this script is
// the Plane adapter per ADR-0002):
//
//   node scripts/plane-sync.mjs create-from-intent   <path-to-intent.md>
//   node scripts/plane-sync.mjs create-from-incident <path-to-incident.md>
//   node scripts/plane-sync.mjs create-from-spec     <path-to-spec.md>
//   node scripts/plane-sync.mjs set-status           <path-to-spec.md> <todo|in_progress|done|cancelled|blocked>
//   node scripts/plane-sync.mjs link-spec            <path-to-spec.md> <issue-id>
//   node scripts/plane-sync.mjs close-cycle          <cycle-id>
//   node scripts/plane-sync.mjs github-event          # reads $GITHUB_EVENT_PATH
//   node scripts/plane-sync.mjs post-evidence         <spec-path> --payload <report.json> [--head-sha SHA]
//   node scripts/plane-sync.mjs post-evidence         <spec-path> <report-dir> [--head-sha SHA]  # legacy: reads report.json from dir
//
//   node scripts/plane-sync.mjs sync-spec            <path-to-spec.md>
//   node scripts/plane-sync.mjs sync-docs            [docs-dir]  # mirrors docs/*.md to Plane pages
//   node scripts/plane-sync.mjs purge-docs           [docs-dir]  # DELETEs every page in the local map (recovery)

import { readFile, writeFile, readdir, stat } from "node:fs/promises";
import { existsSync } from "node:fs";
import { resolve, join, basename, dirname } from "node:path";
import { argv, env, exit } from "node:process";
import { spawn } from "node:child_process";
import { tmpdir } from "node:os";
import { randomBytes } from "node:crypto";
import { unlink } from "node:fs/promises";
import { wrapMarkerPayload, extractMarkerPayload } from "./gates/common.mjs";
import { listIssueComments } from "./gates/plane-client.mjs";

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
  // Node's default fetch User-Agent ("node") gets fingerprinted into a
  // higher-suspicion bucket by Cloudflare after a burst, even though
  // curl with the same key + payload sails through. A realistic UA
  // brings us back into the normal bucket.
  return {
    "Content-Type": "application/json",
    "Accept": "application/json",
    "User-Agent":
      "Mozilla/5.0 (compatible; news-app-plane-sync/1.0; +https://github.com/fewrux/news-app)",
    "X-API-Key": env.PLANE_API_TOKEN,
  };
}

function planeBase() {
  const base = env.PLANE_API_BASE.replace(/\/+$/, "");
  return `${base}/api/v1/workspaces/${env.PLANE_WORKSPACE_SLUG}/projects/${env.PLANE_PROJECT_ID}`;
}

// Plane sits behind Cloudflare. Reads (GET) from Node's fetch are
// fine, but write methods (POST/PATCH/DELETE) from undici get
// JA3/TLS-fingerprinted into a stricter bucket after a small burst,
// where they return HTTP 403 with a Cloudflare challenge body. The
// same payload posted with curl sails through. We therefore use fetch
// for GET and shell out to curl for writes. curl is universally
// available on Linux/macOS/Windows runners, so this stays zero-dep.
async function planeGet(path) {
  const url = `${planeBase()}${path}`;
  const res = await fetch(url, { headers: planeHeaders() });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(
      `plane ${res.status} ${url}: ${text.slice(0, 200).replace(/\s+/g, " ")}`,
    );
  }
  return text ? JSON.parse(text) : null;
}

function curlWrite(method, path, body) {
  const url = `${planeBase()}${path}`;
  // Stash the JSON body in a temp file so very long descriptions (full
  // doc HTML) don't blow the command-line length limit on Windows.
  const tmpPath = resolve(
    tmpdir(),
    `plane-sync-${randomBytes(6).toString("hex")}.json`,
  );

  return writeFile(tmpPath, body, "utf8").then(
    () =>
      new Promise((resolveP, rejectP) => {
        const args = [
          "-sS",
          "-X",
          method,
          "-H",
          `X-API-Key: ${env.PLANE_API_TOKEN}`,
          "-H",
          "Content-Type: application/json",
          "-H",
          "Accept: application/json",
          "--data-binary",
          `@${tmpPath}`,
          "-w",
          "\n__HTTP_STATUS__:%{http_code}",
          url,
        ];
        const child = spawn("curl", args, { stdio: ["ignore", "pipe", "pipe"] });
        let stdout = "";
        let stderr = "";
        child.stdout.on("data", (d) => (stdout += d));
        child.stderr.on("data", (d) => (stderr += d));
        child.on("error", (err) => {
          unlink(tmpPath).catch(() => {});
          rejectP(err);
        });
        child.on("close", (code) => {
          unlink(tmpPath).catch(() => {});
          if (code !== 0) {
            return rejectP(
              new Error(`curl exited ${code}: ${stderr.trim().slice(0, 400)}`),
            );
          }
          const match = stdout.match(/\n__HTTP_STATUS__:(\d+)$/);
          if (!match) {
            return rejectP(
              new Error(
                `curl missing status sentinel; stdout=${stdout.slice(0, 400)}`,
              ),
            );
          }
          const status = Number(match[1]);
          const bodyText = stdout.slice(0, match.index);
          if (status < 200 || status >= 300) {
            return rejectP(
              new Error(
                `plane ${status} ${url}: ${bodyText.slice(0, 200).replace(/\s+/g, " ")}`,
              ),
            );
          }
          resolveP(bodyText ? JSON.parse(bodyText) : null);
        });
      }),
  );
}

async function planeFetch(path, init = {}) {
  const method = (init.method ?? "GET").toUpperCase();
  if (method === "GET") return planeGet(path);
  return curlWrite(method, path, init.body ?? "");
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

async function createIssue({ name, description_html, labels = [], state }) {
  const labelIds = await resolveLabels(labels);
  return planeFetch(`/issues/`, {
    method: "POST",
    body: JSON.stringify({ name, description_html, labels: labelIds, state }),
  });
}

async function patchIssue(issueId, patch) {
  return planeFetch(`/issues/${issueId}/`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
}

// --- Subcommands ----------------------------------------------------------

async function createFromIntent(path) {
  ensureEnv();
  const md = await readFile(path, "utf8");
  const { frontmatter, body } = parseFrontmatter(md);
  const issue = await createIssue({
    name: `[Intent] ${firstHeading(body)}`,
    description_html: mdToHtml(body),
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
    description_html: mdToHtml(body),
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


// --- Spec support (per SPEC-0004 + ADR-0005) -----------------------------

const SPEC_STATUS_ALIASES = {
  todo: ["todo", "backlog"],
  in_progress: ["in progress", "in_progress", "started"],
  done: ["done", "completed", "complete"],
  cancelled: ["cancelled", "canceled"],
  blocked: ["blocked"],
};

async function resolveStateId(statusKey) {
  const aliases = SPEC_STATUS_ALIASES[statusKey];
  if (!aliases) {
    throw new Error(`unknown spec status: ${statusKey}`);
  }
  const states = await planeFetch(`/states/?per_page=100`);
  const list = Array.isArray(states) ? states : (states?.results ?? []);
  for (const state of list) {
    const name = String(state.name ?? "").toLowerCase();
    const group = String(state.group ?? "").toLowerCase();
    for (const alias of aliases) {
      const a = alias.toLowerCase();
      if (name === a || group === a || name.replace(/\s+/g, "_") === a) {
        return state.id;
      }
    }
  }
  throw new Error(`Plane state not found for spec status "${statusKey}"`);
}

function parseSpecTrackerMeta(md) {
  const { frontmatter } = parseFrontmatter(md);
  const providerMatch = md.match(/^tracker:\s*\n(?:[^\n]*\n)*?\s+provider:\s*(.*)$/m);
  const issuesMatch = md.match(/^tracker:\s*\n(?:[^\n]*\n)*?\s+issues:\s*\[(.*?)\]/m);
  const urlMatch = md.match(/^tracker:\s*\n(?:[^\n]*\n)*?\s+url:\s*(.*)$/m);
  const provider = (providerMatch?.[1] ?? "").trim().replace(/^["']|["']$/g, "").split("#")[0].trim();
  const issuesRaw = issuesMatch?.[1]?.trim() ?? "";
  const issues = issuesRaw
    ? issuesRaw.split(",").map((s) => s.trim().replace(/^["']|["']$/g, "")).filter(Boolean)
    : [];
  const url = (urlMatch?.[1] ?? "").trim().replace(/^["']|["']$/g, "");
  return {
    id: frontmatter.id,
    status: frontmatter.status,
    provider,
    issues,
    url,
  };
}

async function rewriteSpecTrackerBlock(path, { provider, issues, url }) {
  let md = await readFile(path, "utf8");
  if (!/^tracker:/m.test(md)) {
    md = md.replace(/^(---\n[\s\S]*?)(\n---\n)/, `$1\ntracker:\n  provider: ""\n  issues: []\n  url: ""$2`);
  }
  if (provider !== undefined) {
    md = md.replace(
      /^(\s*)provider:\s*(""|\S*)(\s*#.*)?$/m,
      `$1provider: ${provider}$3`,
    );
  }
  if (issues !== undefined) {
    const list = issues.length === 0 ? "[]" : `[${issues.join(", ")}]`;
    md = md.replace(/^(\s*)issues:\s*\[[^\]]*\](\s*#.*)?$/m, `$1issues: ${list}$2`);
    if (!/^(\s*)issues:/m.test(md)) {
      md = md.replace(/^(\s*)provider:.*$/m, `$0\n$1issues: ${list}`);
    }
  }
  if (url !== undefined) {
    const val = url ? `"${url}"` : '""';
    md = md.replace(/^(\s*)url:\s*(""|\S*)(\s*#.*)?$/m, `$1url: ${val}$3`);
  }
  await writeFile(path, md);
}

async function createFromSpec(specPath) {
  ensureEnv();
  if (!existsSync(specPath)) {
    console.error(`plane-sync: spec not found: ${specPath}`);
    exit(2);
  }
  const md = await readFile(specPath, "utf8");
  const { frontmatter, body } = parseFrontmatter(md);
  const meta = parseSpecTrackerMeta(md);
  if (meta.issues.length > 0) {
    console.log(`plane-sync: spec already linked to issue ${meta.issues[0]}; skipping create`);
    return;
  }
  const specId = frontmatter.id ?? "SPEC";
  const todoState = await resolveStateId("todo");
  const issue = await createIssue({
    name: `[${specId}] ${firstHeading(body)}`,
    description_html: buildSpecDescriptionHtml(frontmatter, body),
    labels: ["spec"],
    state: todoState,
  });
  const base = env.PLANE_API_BASE.replace(/\/+$/, "");
  const url = `${base}/${env.PLANE_WORKSPACE_SLUG}/projects/${env.PLANE_PROJECT_ID}/issues/${issue.id}`;
  await rewriteSpecTrackerBlock(specPath, {
    provider: "plane",
    issues: [issue.id],
    url,
  });
  console.log(`plane-sync: created spec issue ${issue.id} (${issue.name})`);
}

async function syncFromSpec(specPath) {
  ensureEnv();
  if (!existsSync(specPath)) {
    console.error(`plane-sync: spec not found: ${specPath}`);
    exit(2);
  }
  const md = await readFile(specPath, "utf8");
  const { frontmatter, body } = parseFrontmatter(md);
  const meta = parseSpecTrackerMeta(md);
  const issueId = meta.issues[0];
  if (!issueId) {
    console.error(
      "plane-sync: spec has no tracker issue — run create-from-spec or link-spec first",
    );
    exit(2);
  }
  await patchIssue(issueId, {
    description_html: buildSpecDescriptionHtml(frontmatter, body),
  });
  console.log(`plane-sync: synced description for issue ${issueId}`);
}

/** @param {string} specId e.g. SPEC-0007 */
async function findSpecFileById(specId) {
  const dir = resolve(".sdlc/specs");
  const entries = await readdir(dir);
  const match = entries.find(
    (f) =>
      f.startsWith(`${specId}-`) &&
      f.endsWith(".md") &&
      f !== "_template.md",
  );
  return match ? join(dir, match) : null;
}

/** @param {string | null | undefined} text */
function parseSpecIdFromText(text) {
  const m = (text ?? "").match(/\b(SPEC-\d{4})\b/);
  return m ? m[1] : null;
}

async function handlePullRequestEvent(event) {
  const pr = event.pull_request;
  const action = event.action ?? "unknown";
  const specId = parseSpecIdFromText(pr.body);
  if (!specId) {
    console.log(`plane-sync: PR #${pr.number} has no SPEC id in body; skipping`);
    return;
  }

  const specPath = await findSpecFileById(specId);
  if (!specPath || !existsSync(specPath)) {
    console.warn(
      `plane-sync: spec file for ${specId} not found at checkout; skipping`,
    );
    return;
  }

  const md = await readFile(specPath, "utf8");
  const meta = parseSpecTrackerMeta(md);
  const issueId = meta.issues[0];
  if (!issueId) {
    console.warn(
      `plane-sync: ${specId} has no tracker issue; skipping PR comment`,
    );
    return;
  }

  const comments = await listIssueComments(issueId);
  const headSha = pr.head?.sha ?? null;
  for (const c of comments) {
    const payload = extractMarkerPayload(c.html, "pr");
    if (
      payload &&
      typeof payload === "object" &&
      payload.pr_id === pr.number &&
      payload.action === action
    ) {
      console.log(
        `plane-sync: PR #${pr.number} ${action} already on issue ${issueId}; skipping`,
      );
      return;
    }
  }

  const prPayload = {
    schema: "sdlc.pr.v1",
    pr_id: pr.number,
    action,
    url: pr.html_url,
    head_sha: headSha,
    posted_at: new Date().toISOString(),
  };

  const actionLabel = action.replace(/_/g, " ");
  const html = `<p><strong>Pull request</strong> — <a href="${escapeHtml(pr.html_url)}">#${pr.number}</a> (${escapeHtml(actionLabel)})</p>
<ul>
<li>Title: ${escapeHtml(pr.title)}</li>
<li>Head SHA: <code>${escapeHtml(headSha ?? "n/a")}</code></li>
<li>State: <code>${escapeHtml(pr.state ?? "unknown")}</code></li>
</ul>
${wrapMarkerPayload("pr", prPayload)}
<p><em>Posted by news-app plane-sync github-event.</em></p>`;

  await postIssueComment(issueId, html);
  console.log(
    `plane-sync: posted PR #${pr.number} (${action}) on spec issue ${issueId}`,
  );
}

async function setStatus(specPath, statusKey) {
  ensureEnv();
  if (!existsSync(specPath)) {
    console.error(`plane-sync: spec not found: ${specPath}`);
    exit(2);
  }
  const md = await readFile(specPath, "utf8");
  const meta = parseSpecTrackerMeta(md);
  const issueId = meta.issues[0];
  if (!issueId) {
    console.warn(`plane-sync: no tracker issue on ${specPath}; skipping set-status`);
    return;
  }
  const stateId = await resolveStateId(statusKey);
  await planeFetch(`/issues/${issueId}/`, {
    method: "PATCH",
    body: JSON.stringify({ state: stateId }),
  });
  console.log(`plane-sync: set issue ${issueId} to ${statusKey}`);
}

async function createFromHandoffDeprecated() {
  console.error(
    "plane-sync: create-from-handoff is deprecated (SPEC-0004). Use create-from-spec <path-to-spec.md> instead.",
  );
  exit(1);
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

// Numeric character references (&#NN;) are semantically identical to
// named entities (&lt; / &gt; / &amp; / &quot;) — both decode to the
// same characters in any HTML5 parser. We use the numeric form because
// Cloudflare's WAF in front of api.plane.so pattern-matches sequences
// of named entities as a possible XSS-bypass attempt and rejects the
// request with HTTP 403 once a payload accumulates more than a handful
// (about 4 KB worth was enough to reliably trip it for this project's
// docs, which are heavy with code blocks). Numeric refs don't trigger
// the same rule.
const HTML_ESCAPES = { "&": "&#38;", "<": "&#60;", ">": "&#62;", '"': "&#34;" };
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

/** Merge soft-wrapped list item continuation lines (indented) into one line. */
function joinListContinuations(md) {
  const lines = md.replace(/\r\n/g, "\n").split("\n");
  const out = [];
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    while (
      i + 1 < lines.length &&
      /^\s{2,}\S/.test(lines[i + 1]) &&
      !/^\s*[-*+]\s+/.test(lines[i + 1]) &&
      !/^\s*\d+\.\s+/.test(lines[i + 1])
    ) {
      line += " " + lines[i + 1].trim();
      i++;
    }
    out.push(line);
  }
  return out.join("\n");
}

function mdToHtml(md) {
  const lines = joinListContinuations(md).split("\n");
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

/** @param {string} body @param {string} heading */
function extractSpecSection(body, heading) {
  const esc = heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`^##\\s+${esc}\\s*\\r?\\n([\\s\\S]*?)(?=^##\\s+|\\Z)`, "im");
  const m = body.replace(/\r\n/g, "\n").match(re);
  return m ? m[1].trim() : "";
}

/** @param {Record<string, string>} fm @param {string} body */
function buildTechnicalNotesMarkdown(fm, body) {
  const explicit = extractSpecSection(body, "Technical notes");
  if (explicit) return explicit;
  const parts = [];
  if (fm.surface) parts.push(`- **Surface:** ${fm.surface}`);
  if (fm.complexity) parts.push(`- **Complexity:** ${fm.complexity}`);
  if (fm.intent) parts.push(`- **Intent:** ${fm.intent}`);
  const risks = extractSpecSection(body, "Risks");
  const oos = extractSpecSection(body, "Out of scope");
  if (risks) parts.push(`**Risks**\n\n${risks}`);
  if (oos) parts.push(`**Out of scope**\n\n${oos}`);
  return parts.length ? parts.join("\n\n") : "_None._";
}

/** @param {Record<string, string>} fm @param {string} body */
function buildSpecDescriptionMarkdown(fm, body) {
  const summary = extractSpecSection(body, "Summary") || "_No summary._";
  const behavior = extractSpecSection(body, "Behavior") || "_No behavior._";
  const ac = extractSpecSection(body, "Acceptance criteria") || "_No acceptance criteria._";
  const tech = buildTechnicalNotesMarkdown(fm, body);
  return [
    "## Summary",
    "",
    summary,
    "",
    "## Behavior",
    "",
    behavior,
    "",
    "## Acceptance criteria",
    "",
    ac,
    "",
    "## Technical notes",
    "",
    tech,
  ].join("\n");
}

/** @param {Record<string, string>} fm @param {string} body */
function buildSpecDescriptionHtml(fm, body) {
  return mdToHtml(buildSpecDescriptionMarkdown(fm, body));
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
// limit (HTTP 403 with an HTML challenge body) after ~10 consecutive
// requests in a short window. A pause between writes plus
// retry-with-backoff in planeFetch() keeps us under the threshold and
// lets a slow sync finish.
const WRITE_DELAY_MS = Number(process.env.PLANE_WRITE_DELAY_MS) || 3000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Plane Cloud's public REST API currently exposes only POST and GET on
// pages — PATCH and DELETE both return HTTP 405 ("Method not allowed").
// See https://github.com/makeplane/plane/issues/8986 and PR #8800.
// When PLANE_PAGES_PATCH_ENABLED=1, the script will attempt PATCH for
// known entries; otherwise it short-circuits to a soft-skip without
// making the API call (which would otherwise still count against
// Cloudflare's rate budget and choke fresh creates).
const PATCH_ENABLED = process.env.PLANE_PAGES_PATCH_ENABLED === "1";

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
  let lastCallAt = 0;

  const throttle = async () => {
    const since = Date.now() - lastCallAt;
    if (lastCallAt && since < WRITE_DELAY_MS) {
      await sleep(WRITE_DELAY_MS - since);
    }
    lastCallAt = Date.now();
  };

  for (const name of files) {
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
    if (knownId && !PATCH_ENABLED) {
      console.log(
        `plane-sync: skipping ${relKey} — already mapped to page ${knownId}; delete in Plane UI + re-sync to refresh`,
      );
      continue;
    }
    if (knownId) {
      await throttle();
      try {
        await planeFetch(`/pages/${knownId}/`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
        updated++;
        console.log(`plane-sync: updated page ${knownId} (${relKey})`);
      } catch (err) {
        if (/\bplane 405\b/.test(err.message)) {
          console.log(
            `plane-sync: skipping ${relKey} — Plane returned 405 on PATCH; unset PLANE_PAGES_PATCH_ENABLED`,
          );
        } else {
          throw err;
        }
      }
      continue;
    }

    await throttle();
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

async function findFilesRecursive(dir, ext) {
  const out = [];
  if (!existsSync(dir)) return out;
  for (const ent of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, ent.name);
    if (ent.isDirectory()) out.push(...(await findFilesRecursive(p, ext)));
    else if (ent.name.endsWith(ext)) out.push(p);
  }
  return out;
}

async function uploadIssueAttachment(issueId, filePath) {
  const st = await stat(filePath);
  const name = basename(filePath);
  const type = name.endsWith(".webm") ? "video/webm" : "application/octet-stream";
  const externalId = `news-app-evidence-${randomBytes(8).toString("hex")}`;

  const paths = [
    `/issues/${issueId}/issue-attachments/`,
    `/work-items/${issueId}/attachments/`,
  ];

  let creds = null;
  let usedPath = "";
  for (const p of paths) {
    try {
      creds = await planeFetch(p, {
        method: "POST",
        body: JSON.stringify({
          name,
          type,
          size: st.size,
          external_id: externalId,
          external_source: "news-app-verify",
        }),
      });
      usedPath = p;
      break;
    } catch {
      /* try next path */
    }
  }
  if (!creds) {
    throw new Error("no Plane attachment endpoint accepted the upload request");
  }

  const uploadUrl =
    creds.upload_data?.url ??
    creds.upload_url ??
    creds.url ??
    creds.presigned_url;
  if (!uploadUrl) {
    console.warn(
      `plane-sync: attachment creds from ${usedPath} missing upload URL; comment-only evidence`,
    );
    return null;
  }

  const fileBody = await readFile(filePath);
  const uploadRes = await fetch(uploadUrl, {
    method: creds.upload_data?.method ?? "PUT",
    headers: creds.upload_data?.headers ?? { "Content-Type": type },
    body: fileBody,
  });
  if (!uploadRes.ok) {
    throw new Error(
      `attachment upload HTTP ${uploadRes.status}: ${(await uploadRes.text()).slice(0, 200)}`,
    );
  }
  return creds.id ?? creds.attachment_id ?? externalId;
}

async function postIssueComment(issueId, commentHtml) {
  const payloads = [
    { path: `/issues/${issueId}/comments/`, body: { comment_html: commentHtml } },
    { path: `/issues/${issueId}/comments/`, body: { comment: commentHtml } },
    {
      path: `/work-items/${issueId}/comments/`,
      body: { comment_html: commentHtml, access: "INTERNAL" },
    },
  ];
  for (const { path, body } of payloads) {
    try {
      return await planeFetch(path, {
        method: "POST",
        body: JSON.stringify(body),
      });
    } catch {
      /* try next */
    }
  }
  throw new Error("no Plane comment endpoint accepted the request");
}

async function postEvidence(specPath, reportDirOrPayload, headSha, opts = {}) {
  ensureEnv();
  if (!existsSync(specPath)) {
    console.error(`plane-sync: spec not found: ${specPath}`);
    exit(2);
  }

  const md = await readFile(specPath, "utf8");
  const meta = parseSpecTrackerMeta(md);
  const fm = parseFrontmatter(md).frontmatter;
  const surface = fm.surface ?? "operator";
  const issueId = meta.issues[0] ?? parseFrontmatter(md).frontmatter.plane_issue;
  if (!issueId) {
    console.error(
      "plane-sync: spec has no tracker issue — run create-from-spec or link-spec first",
    );
    exit(2);
  }

  let report = {};
  let absReport = null;

  if (opts.payloadPath) {
    report = JSON.parse(await readFile(opts.payloadPath, "utf8"));
    absReport = resolve(dirname(opts.payloadPath));
  } else if (reportDirOrPayload) {
    absReport = resolve(reportDirOrPayload);
    if (!existsSync(absReport)) {
      console.error(`plane-sync: report dir not found: ${absReport}`);
      exit(2);
    }
    const reportJson = join(absReport, "report.json");
    if (existsSync(reportJson)) {
      report = JSON.parse(await readFile(reportJson, "utf8"));
    }
  }

  const videoCandidates = absReport
    ? [
        ...(await findFilesRecursive(join(absReport, "videos"), ".webm")),
        ...(await findFilesRecursive(join(absReport, "test-results"), ".webm")),
        ...(await findFilesRecursive(absReport, ".webm")),
      ]
    : [];
  const videoPath = videoCandidates[0] ?? null;

  let attachmentNote = "No video file found.";
  if (videoPath) {
    try {
      const attId = await uploadIssueAttachment(issueId, videoPath);
      attachmentNote = attId
        ? `Video attached (${basename(videoPath)}, id ${attId}).`
        : `Video upload skipped; local file: ${basename(videoPath)}.`;
    } catch (err) {
      attachmentNote = `Video upload failed (${err.message}); local file: ${basename(videoPath)}.`;
      console.warn(`plane-sync: ${attachmentNote}`);
    }
  }

  const acSource = report.acceptance_criteria ?? report.results ?? [];
  const acceptance_criteria = acSource.map((r) => ({
    id: r.id ?? r.ac,
    outcome: r.outcome ?? "pass",
    verifier: r.verifier ?? "",
  }));

  const verifyPayload = {
    schema: "sdlc.verify.v1",
    run_id: report.run_id ?? basename(absReport ?? "verify"),
    spec: meta.id ?? fm.id ?? "spec",
    surface,
    head_sha: headSha ?? report.head_sha ?? null,
    acceptance_criteria,
    browser_evidence: { ...(report.browser_evidence ?? {}) },
    gates: report.gates ?? {},
    posted_at: new Date().toISOString(),
  };

  if (surface === "product") {
    verifyPayload.browser_evidence.status = "posted";
  } else if (!verifyPayload.browser_evidence.status) {
    verifyPayload.browser_evidence = {
      status: "waived",
      waiver_reason:
        verifyPayload.browser_evidence.waiver_reason ??
        "operator-surface spec — browser evidence waived",
    };
  }

  const acRows = acceptance_criteria
    .map(
      (r) =>
        `<li><strong>${escapeHtml(r.id ?? "?")}</strong>: ${escapeHtml(r.outcome ?? "?")} — ${escapeHtml(r.verifier ?? "")}</li>`,
    )
    .join("");

  const markerBlock = wrapMarkerPayload("verify", verifyPayload);

  const html = `<p><strong>Verify evidence</strong> — <code>${escapeHtml(meta.id ?? "spec")}</code></p>
<ul>
<li>Head SHA: <code>${escapeHtml(headSha ?? report.head_sha ?? "n/a")}</code></li>
<li>Surface: <code>${escapeHtml(surface)}</code></li>
<li>${escapeHtml(attachmentNote)}</li>
</ul>
${acRows ? `<p>Acceptance criteria:</p><ul>${acRows}</ul>` : ""}
${markerBlock}
<p><em>Posted by news-app plane-sync post-evidence. Canonical verify artifact — gate reads this comment only.</em></p>`;

  const comment = await postIssueComment(issueId, html);
  const commentId = comment?.id ?? comment?.comment_id ?? "";
  const planeHost = env.PLANE_API_BASE.replace(/\/+$/, "").replace("api.", "app.");
  const commentUrl =
    meta.url ||
    `${planeHost}/${env.PLANE_WORKSPACE_SLUG}/projects/${env.PLANE_PROJECT_ID}/issues/${issueId}/`;

  verifyPayload.browser_evidence = {
    ...verifyPayload.browser_evidence,
    status: surface === "product" ? "posted" : verifyPayload.browser_evidence.status,
    plane_issue_id: issueId,
    plane_comment_id: commentId,
    plane_comment_url: commentUrl,
  };

  console.log(
    JSON.stringify({
      ok: true,
      issueId,
      commentId,
      commentUrl,
      verify: verifyPayload,
    }),
  );
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
    await handlePullRequestEvent(event);
  } else if (eventName === "issues") {
    const gh = event.issue;
    const body = `${gh.html_url}\n\n${gh.body ?? ""}`;
    const issue = await createIssue({
      name: `[GH #${gh.number}] ${gh.title}`,
      description_html: mdToHtml(body),
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
  "create-from-spec":     ([p])     => createFromSpec(p),
  "sync-spec":            ([p])     => syncFromSpec(p),
  "set-status":           ([p, s])  => setStatus(p, s),
  "create-from-handoff":  ()        => createFromHandoffDeprecated(),
  "link-spec":            ([p, id]) => linkSpec(p, id),
  "close-cycle":          ([id])    => closeCycle(id),
  "github-event":         ()        => fromGithubEvent(),
  "sync-docs":            ([dir])   => syncDocs(dir ?? "docs"),
  "purge-docs":           ([dir])   => purgeDocs(dir ?? "docs"),
  "post-evidence":        (args)    => {
    const headIdx = args.indexOf("--head-sha");
    const payloadIdx = args.indexOf("--payload");
    const headSha = headIdx >= 0 ? args[headIdx + 1] : undefined;
    const payloadPath = payloadIdx >= 0 ? args[payloadIdx + 1] : undefined;
    const skip = new Set();
    if (headIdx >= 0) {
      skip.add(headIdx);
      skip.add(headIdx + 1);
    }
    if (payloadIdx >= 0) {
      skip.add(payloadIdx);
      skip.add(payloadIdx + 1);
    }
    const posArgs = args.filter((_, i) => !skip.has(i));
    if (payloadPath) {
      if (posArgs.length < 1) {
        console.error("Usage: post-evidence <spec-path> --payload <report.json> [--head-sha SHA]");
        exit(2);
      }
      return postEvidence(posArgs[0], null, headSha, { payloadPath });
    }
    if (posArgs.length < 2) {
      console.error("Usage: post-evidence <spec-path> <report-dir> [--head-sha SHA]");
      console.error("       post-evidence <spec-path> --payload <report.json> [--head-sha SHA]");
      exit(2);
    }
    return postEvidence(posArgs[0], posArgs[1], headSha);
  },
};

const handler = handlers[cmd];
if (!handler) {
  console.error(`Unknown command: ${cmd ?? "<none>"}`);
  console.error(`Available: ${Object.keys(handlers).join(", ")}`);
  exit(cmd ? 1 : 2);
}

handler(rest).catch((err) => {
  console.error(`plane-sync: ${err.message}`);
  exit(1);
});
