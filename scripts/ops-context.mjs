#!/usr/bin/env node
/**
 * Operational-context queue CRUD (SPEC-0004).
 * Manages machine lines in .sdlc/memories/operational-context.md.
 *
 * Usage:
 *   node scripts/ops-context.mjs list todo|in_progress
 *   node scripts/ops-context.mjs list-blocked
 *   node scripts/ops-context.mjs add-open <spec-path> [--adrs ADR-0001,...|-]
 *   node scripts/ops-context.mjs to-in-progress <spec-path> [--pr N]
 *   node scripts/ops-context.mjs remove <spec-path>
 */

import { readFile, writeFile, readdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { basename, resolve } from "node:path";
import { argv, cwd, exit, stderr } from "node:process";

const ROOT = resolve(cwd());
const OP_CTX_PATH = resolve(ROOT, ".sdlc/memories/operational-context.md");
const SPECS_DIR = resolve(ROOT, ".sdlc/specs");
const TODO_HEADING = "## todo (max 10)";
const IN_PROGRESS_HEADING = "## in_progress (max 10)";
const CAPS = { todo: 10, in_progress: 10 };

function today() {
  return new Date().toISOString().slice(0, 10);
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

function specIdFromPath(path) {
  const name = basename(path);
  const m = name.match(/^(SPEC-\d+)/);
  if (m) return m[1];
  return null;
}

async function resolveSpecPath(arg) {
  if (!arg) return null;
  if (arg.includes("/") || arg.endsWith(".md")) {
    const p = resolve(ROOT, arg);
    return existsSync(p) ? p : null;
  }
  if (!existsSync(SPECS_DIR)) return null;
  const entries = await readdir(SPECS_DIR);
  const hit = entries.find(
    (n) => n.startsWith(`${arg}-`) && n.endsWith(".md") && !n.startsWith("_"),
  );
  return hit ? resolve(SPECS_DIR, hit) : null;
}

function parseSpecMeta(md) {
  const { frontmatter } = parseFrontmatter(md);
  const providerMatch = md.match(/^tracker:\s*\n(?:[^\n]*\n)*?\s+provider:\s*(\S+)/m);
  const issuesMatch = md.match(/^tracker:\s*\n(?:[^\n]*\n)*?\s+issues:\s*\[(.*?)\]/m);
  const provider = (providerMatch?.[1] ?? "").replace(/^["']|["']$/g, "");
  const issuesRaw = issuesMatch?.[1]?.trim() ?? "";
  const issueId =
    issuesRaw && issuesRaw !== ""
      ? issuesRaw.split(",")[0].trim().replace(/^["']|["']$/g, "")
      : "";
  const tracker =
    provider && issueId
      ? `${provider}:${issueId}`
      : provider
        ? `${provider}:-`
        : "plane:-";
  return {
    id: frontmatter.id ?? "",
    intent: frontmatter.intent ?? "",
    status: frontmatter.status ?? "",
    tracker,
  };
}

function formatLine(specId, { intent, adrs, tracker, since, pr }) {
  const adrsStr = adrs ?? "-";
  const trackerStr = tracker ?? "plane:-";
  let line = `- ${specId}  intent:${intent}  adrs:${adrsStr}  tracker:${trackerStr}  since:${since ?? today()}`;
  if (pr) line += `  pr:${pr}`;
  return line;
}

function isMachineLine(line) {
  return /^\s*-\s+SPEC-\d+/.test(line);
}

function parseLineSpecId(line) {
  return line.match(/^\s*-\s+(SPEC-\d+)/)?.[1] ?? null;
}

function extractSection(text, heading) {
  const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`(${escaped})\\s*\\n([\\s\\S]*?)(?=\\n## |\\n$|$)`);
  const m = text.match(re);
  if (!m) return { heading, lines: [], start: -1, end: -1 };
  const body = m[2];
  const lines = body.split("\n").filter((l) => isMachineLine(l));
  return {
    heading,
    lines,
    start: m.index,
    end: m.index + m[0].length,
    rawBody: body,
  };
}

function replaceSection(text, heading, newLines) {
  const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`(${escaped})\\s*\\n([\\s\\S]*?)(?=\\n## |\\n$|$)`);
  const body =
    newLines.length === 0
      ? "\n\n- _none_\n"
      : `\n\n${newLines.join("\n")}\n`;
  if (re.test(text)) {
    return text.replace(re, `$1${body}`);
  }
  return `${text.trimEnd()}\n\n${heading}${body}`;
}

function touchMeta(text, updatedBy) {
  let out = text.replace(/^last_updated:\s*.+$/m, `last_updated: ${today()}`);
  if (!/^last_updated:/m.test(out)) {
    out = out.replace(
      /^(# Operational context[^\n]*\n)/,
      `$1\nlast_updated: ${today()}\nupdated_by: ${updatedBy}\n`,
    );
  }
  out = out.replace(/^updated_by:\s*.+$/m, `updated_by: ${updatedBy}`);
  if (!/^updated_by:/m.test(out)) {
    out = `${out.trimEnd()}\nupdated_by: ${updatedBy}\n`;
  }
  return out;
}

async function readOpCtx() {
  if (!existsSync(OP_CTX_PATH)) {
    stderr.write(`ops-context: missing ${OP_CTX_PATH}\n`);
    exit(2);
  }
  return readFile(OP_CTX_PATH, "utf8");
}

async function writeOpCtx(text, updatedBy) {
  await writeFile(OP_CTX_PATH, touchMeta(text, updatedBy), "utf8");
}

function parseArgs(args) {
  const out = { adrs: null, pr: null, positional: [] };
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === "--adrs") out.adrs = args[++i] ?? "-";
    else if (a === "--pr") out.pr = args[++i] ?? null;
    else out.positional.push(a);
  }
  return out;
}

async function listQueue(which) {
  const text = await readOpCtx();
  const heading = which === "todo" ? TODO_HEADING : IN_PROGRESS_HEADING;
  const section = extractSection(text, heading);
  for (const line of section.lines) {
    const id = parseLineSpecId(line);
    if (id) console.log(id);
  }
}

async function listBlocked() {
  if (!existsSync(SPECS_DIR)) return;
  const entries = await readdir(SPECS_DIR);
  for (const name of entries.sort()) {
    if (!name.endsWith(".md") || name.startsWith("_")) continue;
    const md = await readFile(resolve(SPECS_DIR, name), "utf8");
    const status = md.match(/^status:\s+(\S+)/m)?.[1];
    if (status === "blocked") {
      const id = md.match(/^id:\s+(\S+)/m)?.[1] ?? specIdFromPath(name);
      if (id) console.log(id);
    }
  }
}

async function addOpen(specPath, adrs) {
  const path = await resolveSpecPath(specPath);
  if (!path) {
    stderr.write(`ops-context: spec not found: ${specPath}\n`);
    exit(2);
  }
  const md = await readFile(path, "utf8");
  const meta = parseSpecMeta(md);
  const specId = meta.id || specIdFromPath(path);
  if (!specId) {
    stderr.write(`ops-context: could not resolve spec id from ${path}\n`);
    exit(2);
  }

  let text = await readOpCtx();
  const todo = extractSection(text, TODO_HEADING);
  const inProg = extractSection(text, IN_PROGRESS_HEADING);

  const filteredTodo = todo.lines.filter((l) => parseLineSpecId(l) !== specId);
  const filteredInProg = inProg.lines.filter(
    (l) => parseLineSpecId(l) !== specId,
  );

  if (filteredTodo.length >= CAPS.todo) {
    stderr.write(`ops-context: todo cap (${CAPS.todo}) exceeded\n`);
    exit(1);
  }

  const line = formatLine(specId, {
    intent: meta.intent,
    adrs: adrs ?? "-",
    tracker: meta.tracker,
    since: today(),
  });
  filteredTodo.push(line);

  text = replaceSection(text, TODO_HEADING, filteredTodo);
  text = replaceSection(text, IN_PROGRESS_HEADING, filteredInProg);
  await writeOpCtx(text, "planner");
  console.log(`ops-context: added ${specId} to todo`);
}

async function toInProgress(specPath, pr) {
  const path = await resolveSpecPath(specPath);
  if (!path) {
    stderr.write(`ops-context: spec not found: ${specPath}\n`);
    exit(2);
  }
  const md = await readFile(path, "utf8");
  const meta = parseSpecMeta(md);
  const specId = meta.id || specIdFromPath(path);
  if (!specId) {
    stderr.write(`ops-context: could not resolve spec id from ${path}\n`);
    exit(2);
  }

  let text = await readOpCtx();
  const todo = extractSection(text, TODO_HEADING);
  const inProg = extractSection(text, IN_PROGRESS_HEADING);

  const existing = [...todo.lines, ...inProg.lines].find(
    (l) => parseLineSpecId(l) === specId,
  );
  const since = existing?.match(/since:(\S+)/)?.[1] ?? today();
  const adrs = existing?.match(/adrs:([^\s]+)/)?.[1] ?? "-";

  const filteredTodo = todo.lines.filter((l) => parseLineSpecId(l) !== specId);
  const filteredInProg = inProg.lines.filter(
    (l) => parseLineSpecId(l) !== specId,
  );

  if (filteredInProg.length >= CAPS.in_progress) {
    stderr.write(`ops-context: in_progress cap (${CAPS.in_progress}) exceeded\n`);
    exit(1);
  }

  const line = formatLine(specId, {
    intent: meta.intent,
    adrs,
    tracker: meta.tracker,
    since,
    pr,
  });
  filteredInProg.push(line);

  text = replaceSection(text, TODO_HEADING, filteredTodo);
  text = replaceSection(text, IN_PROGRESS_HEADING, filteredInProg);
  await writeOpCtx(text, "implementer");
  console.log(`ops-context: moved ${specId} to in_progress`);
}

async function remove(specPath) {
  const path = await resolveSpecPath(specPath);
  if (!path) {
    stderr.write(`ops-context: spec not found: ${specPath}\n`);
    exit(2);
  }
  const specId =
    parseSpecMeta(await readFile(path, "utf8")).id || specIdFromPath(path);
  if (!specId) {
    stderr.write(`ops-context: could not resolve spec id from ${path}\n`);
    exit(2);
  }

  let text = await readOpCtx();
  const todo = extractSection(text, TODO_HEADING);
  const inProg = extractSection(text, IN_PROGRESS_HEADING);

  const filteredTodo = todo.lines.filter((l) => parseLineSpecId(l) !== specId);
  const filteredInProg = inProg.lines.filter(
    (l) => parseLineSpecId(l) !== specId,
  );

  text = replaceSection(text, TODO_HEADING, filteredTodo);
  text = replaceSection(text, IN_PROGRESS_HEADING, filteredInProg);
  await writeOpCtx(text, "releaser");
  console.log(`ops-context: removed ${specId} from queue`);
}

function printHelp() {
  console.log(`Usage:
  node scripts/ops-context.mjs list todo|in_progress
  node scripts/ops-context.mjs list-blocked
  node scripts/ops-context.mjs add-open <spec-path> [--adrs ADR-0001,...|-]
  node scripts/ops-context.mjs to-in-progress <spec-path> [--pr N]
  node scripts/ops-context.mjs remove <spec-path>`);
}

const [, , cmd, ...rest] = argv;
const parsed = parseArgs(rest);

const handlers = {
  list: async () => {
    const which = parsed.positional[0];
    if (which !== "todo" && which !== "in_progress") {
      stderr.write("ops-context: list requires todo|in_progress\n");
      exit(1);
    }
    await listQueue(which);
  },
  "list-blocked": listBlocked,
  "add-open": () => addOpen(parsed.positional[0], parsed.adrs),
  "to-in-progress": () => toInProgress(parsed.positional[0], parsed.pr),
  remove: () => remove(parsed.positional[0]),
};

if (!cmd || cmd === "--help" || cmd === "-h") {
  printHelp();
  exit(cmd ? 0 : 1);
}

const handler = handlers[cmd];
if (!handler) {
  stderr.write(`ops-context: unknown command: ${cmd}\n`);
  printHelp();
  exit(1);
}

handler().catch((err) => {
  stderr.write(`ops-context: ${err.message}\n`);
  exit(1);
});
