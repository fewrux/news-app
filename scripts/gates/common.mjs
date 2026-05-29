/**
 * Shared marker envelope for SDLC payloads on Plane, GitHub PR comments, and releases.
 * Gate scripts extract and validate JSON between HTML comment markers.
 */
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { exit } from "node:process";

export const ROOT = resolve(import.meta.dirname, "../..");

export const MARKERS = {
  verify: { open: "<!-- sdlc:verify:v1 -->", close: "<!-- /sdlc:verify:v1 -->" },
  review: { open: "<!-- sdlc:review:v1 -->", close: "<!-- /sdlc:review:v1 -->" },
  release: { open: "<!-- sdlc:release:v1 -->", close: "<!-- /sdlc:release:v1 -->" },
};

/**
 * @param {string} text
 * @param {"verify"|"review"|"release"} kind
 * @returns {unknown | null}
 */
export function extractMarkerPayload(text, kind) {
  const { open, close } = MARKERS[kind];
  const start = text.indexOf(open);
  if (start < 0) return null;
  const jsonStart = start + open.length;
  const end = text.indexOf(close, jsonStart);
  if (end < 0) return null;
  const raw = text.slice(jsonStart, end).trim();
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * @param {"verify"|"review"|"release"} kind
 * @param {object} payload
 */
export function wrapMarkerPayload(kind, payload) {
  const { open, close } = MARKERS[kind];
  return `${open}${JSON.stringify(payload)}${close}`;
}

/**
 * Find the latest valid payload across multiple comment bodies (newest last wins).
 * @param {string[]} bodies
 * @param {"verify"|"review"|"release"} kind
 */
export function latestMarkerPayload(bodies, kind) {
  for (let i = bodies.length - 1; i >= 0; i--) {
    const p = extractMarkerPayload(bodies[i], kind);
    if (p && typeof p === "object") return p;
  }
  return null;
}

/**
 * @param {string} filePath
 */
export async function readText(filePath) {
  return readFile(resolve(filePath), "utf8");
}

/**
 * @param {string} md
 */
export function parseFrontmatter(md) {
  const m = md.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/);
  if (!m) return { frontmatter: {}, body: md };
  const fm = m[1];
  const body = md.slice(m[0].length);
  const data = {};
  for (const line of fm.split(/\r?\n/)) {
    const kv = line.match(/^(\w+):\s*(.*)$/);
    if (kv) data[kv[1]] = kv[2].trim().replace(/^["']|["']$/g, "");
  }
  return { frontmatter: data, body };
}

/**
 * @param {string} md
 * @param {string} key
 */
export function parseNestedBlock(md, key) {
  const re = new RegExp(`^${key}:\\s*\\r?\\n((?:  .+(?:\\r?\\n)?)+)`, "m");
  const m = md.match(re);
  if (!m) return {};
  const out = {};
  for (const line of m[1].split(/\r?\n/)) {
    const kv = line.match(/^  (\w+):\s*(.*)$/);
    if (kv) out[kv[1]] = kv[2].trim().replace(/^["']|["']$/g, "");
  }
  return out;
}

/**
 * @param {object} prov
 */
export function validateProvenance(prov, expectedAgent) {
  if (!prov || typeof prov !== "object") return "missing provenance object";
  if (expectedAgent && prov.agent_id !== expectedAgent) {
    return `provenance.agent_id must be ${expectedAgent}, got ${prov.agent_id ?? "(missing)"}`;
  }
  if (!prov.created_at) return "provenance.created_at required";
  return null;
}

/**
 * @param {string} msg
 */
export function fail(msg) {
  console.error(`gate: ${msg}`);
  exit(1);
}

/**
 * @param {string} phase
 * @param {string} msg
 */
export function pass(phase, msg) {
  console.log(`gate.${phase}: pass — ${msg}`);
  exit(0);
}

/**
 * @param {string} relPath
 */
export function assertPathExists(relPath) {
  const abs = resolve(ROOT, relPath);
  if (!existsSync(abs)) fail(`missing path: ${relPath}`);
  return abs;
}
