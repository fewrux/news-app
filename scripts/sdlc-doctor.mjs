#!/usr/bin/env node
/**
 * SDLC doctor — mechanical drift checker (zero LLM).
 * Contract: SPEC-0002, ADR-0003.
 *
 * Usage:
 *   node scripts/sdlc-doctor.mjs --mode=mechanical
 *   node scripts/sdlc-doctor.mjs --mode=mechanical --list-checks
 *   node scripts/sdlc-doctor.mjs --refresh-baseline
 */

import {
  readFile,
  readdir,
  stat,
  writeFile,
} from "node:fs/promises";
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { basename, join, relative, resolve } from "node:path";
import { argv, cwd, exit, stderr, stdout } from "node:process";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = resolve(cwd());

/** @type {const} */
const CATEGORIES = [
  "structural",
  "artifact",
  "memory hygiene",
  "process compliance",
  "cost compliance",
];

/** Canonical check list bound by SPEC-0002 AC-2. */
export const CHECK_IDS = [
  "struct.agent-id-resolves",
  "struct.command-id-resolves",
  "struct.skill-registered",
  "struct.rule-registered",
  "struct.hook-registry-matches-config",
  "struct.workflow-named-exists",
  "struct.protection-checks-exist",
  "struct.tracker-adapter-script-exists",
  "struct.tracker-adapter-contract-conformance",
  "artifact.provenance-present",
  "artifact.trace-id-plausible",
  "artifact.handoff-index-sync",
  "artifact.tracker-provider-known",
  "artifact.legacy-plane-issue",
  "memory.operational-context-cap",
  "process.recent-pr-shape",
  "process.reviewer-distinct",
  "cost.integration-has-quota",
  "cost.tracker-provider-has-quota",
];

const PROVENANCE_FIELDS = [
  "agent_id",
  "model",
  "prompt_hash",
  "trace_id",
  "inputs_digest",
  "created_at",
];

const ARTIFACT_DIRS = [
  ".sdlc/intents",
  ".sdlc/specs",
  ".sdlc/decisions",
  ".sdlc/reviews",
  ".sdlc/incidents",
  ".sdlc/postmortems",
  ".sdlc/releases",
  ".sdlc/evals/cases",
  ".sdlc/handoffs",
];

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function parseArgs(args) {
  const out = { mode: "mechanical", listChecks: false, refreshBaseline: false };
  for (const a of args) {
    if (a === "--list-checks") out.listChecks = true;
    else if (a === "--refresh-baseline") out.refreshBaseline = true;
    else if (a.startsWith("--mode=")) out.mode = a.slice("--mode=".length);
  }
  return out;
}

function rel(p) {
  return relative(ROOT, p).replace(/\\/g, "/");
}

async function readText(path) {
  return readFile(path, "utf8");
}

function sha256(text) {
  return createHash("sha256").update(text).digest("hex");
}

/** Extract `- { key: value, ... }` list items from a YAML block (one entry per line). */
function extractBraceListItems(block, keys) {
  const items = [];
  for (const line of block.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("- {")) continue;
    const inner = trimmed.slice(2).trim().replace(/\s+#.*$/, "");
    const item = {};
    for (const key of keys) {
      const km = new RegExp(`${key}:\\s*("(?:[^"\\\\]|\\\\.)*"|[^,{}]+)`).exec(
        inner,
      );
      if (km) item[key] = km[1].trim().replace(/^["']|["']$/g, "");
    }
    items.push(item);
  }
  return items;
}

function extractRegistrySection(block, section, keys) {
  const sec = block.match(
    new RegExp(
      `${section}:\\s*\\r?\\n(?:\\s+#.+\\r?\\n)*\\s+location:[^\\r\\n]+\\r?\\n\\s+registry:\\s*\\r?\\n([\\s\\S]*?)(?=\\r?\\n\\s{4}\\w|$)`,
    ),
  );
  return sec ? extractBraceListItems(sec[1], keys) : [];
}

function section(text, start, end) {
  const i = text.indexOf(start);
  if (i === -1) return "";
  const j = end ? text.indexOf(end, i + start.length) : -1;
  return j === -1 ? text.slice(i) : text.slice(i, j);
}

async function loadSdlcConfig() {
  const path = join(ROOT, ".sdlc/sdlc.yaml");
  const text = await readText(path);

  const rolesBlock = section(text, "  roles:", "  models:");
  const agentsBlock = rolesBlock.match(
    /agents:\s*\n([\s\S]*?)(?=\n\s{4}\S|\n\s{2}\S|$)/,
  );
  const agents = agentsBlock
    ? [...agentsBlock[1].matchAll(/^\s+-\s+id:\s+(\S+)/gm)].map((m) =>
        m[1].trim(),
      )
    : [];

  const instructions = section(text, "  instructions:", "  integrations:");
  const commands = extractRegistrySection(instructions, "commands", [
    "id",
    "file",
  ]);
  const skills = extractRegistrySection(instructions, "skills", ["id", "path"]);
  const rules = extractRegistrySection(instructions, "rules", [
    "id",
    "file",
    "always_apply",
  ]);

  const hooksSec = instructions.match(
    /hooks:\s*\r?\n[\s\S]*?\s+registry:\s*\r?\n([\s\S]*?)(?=\r?\n\s{4}\w|$)/,
  );
  const hooks = hooksSec
    ? extractBraceListItems(hooksSec[1], ["event", "script"])
    : [];

  const integrationsBlock = section(
    text,
    "  integrations:",
    "  # ---------------------------------------------------------------------------\n  # LIFECYCLE INVARIANTS",
  );
  const workflowsBlock = integrationsBlock.match(
    /workflows:\s*\r?\n([\s\S]*?)(?=\r?\n\s{6}\w|\r?\n\s{4}\w|$)/,
  );
  const workflows = workflowsBlock
    ? extractBraceListItems(workflowsBlock[1], ["id", "file"])
    : [];

  const protectionMatch = integrationsBlock.match(
    /require_status_checks:\s*\[([^\]]+)\]/,
  );
  const protectionChecks = protectionMatch
    ? protectionMatch[1]
        .split(",")
        .map((s) => s.trim().replace(/^["']|["']$/g, ""))
        .filter(Boolean)
    : [];

  const activeProviderMatch = integrationsBlock.match(
    /active_provider:\s+(\S+)/,
  );
  const activeProvider = activeProviderMatch?.[1]?.trim() ?? "";

  const syncScriptMatch = integrationsBlock.match(
    /tracker:[\s\S]*?sync_script:\s+(\S+)/,
  );
  const syncScript = syncScriptMatch?.[1]?.trim() ?? "";

  const subcommandsBlock = integrationsBlock.match(
    /subcommands:\s*\r?\n([\s\S]*?)(?=\r?\n\s{8}\w|\r?\n\s{6}\w|$)/,
  );
  const adapterSubcommands = subcommandsBlock
    ? extractBraceListItems(subcommandsBlock[1], ["name"])
    : [];

  const integrationKeys = [
    ...integrationsBlock.matchAll(/^\s{4}(\w+):/gm),
  ].map((m) => m[1]);

  const policiesBlock = section(text, "  policies:", "  feedback:");
  const freeQuotasBlock = policiesBlock.match(
    /free_quotas:\s*\n([\s\S]*?)(?=\n\s{6}\w|\n\s{4}[a-z_]+:|\n\s{2}[a-z_]+:|$)/,
  );
  const freeQuotaKeys = freeQuotasBlock
    ? [...freeQuotasBlock[1].matchAll(/^\s{8}(\w+):/gm)].map((m) => m[1])
    : [];

  const providerQuotaRefMatch = integrationsBlock.match(
    new RegExp(
      `${activeProvider}:[\\s\\S]*?free_tier_quota_ref:\\s+(\\S+)`,
    ),
  );
  const providerQuotaRef = providerQuotaRefMatch?.[1]?.trim() ?? "";

  const trackerProvidersMatch = integrationsBlock.match(
    /providers:\s*\n([\s\S]*?)(?=\n\s{6}adapter_contract:)/,
  );
  const trackerProviderKeys = trackerProvidersMatch
    ? [...trackerProvidersMatch[1].matchAll(/^\s{8}(\w+):/gm)].map((m) => m[1])
    : [];

  return {
    path,
    text,
    agents,
    commands,
    skills,
    rules,
    hooks,
    workflows,
    protectionChecks,
    activeProvider,
    syncScript,
    adapterSubcommands,
    integrationKeys,
    freeQuotaKeys,
    providerQuotaRef,
    trackerProviderKeys,
  };
}

async function loadHooksJson() {
  const path = join(ROOT, ".cursor/hooks.json");
  const json = JSON.parse(await readText(path));
  /** @type {Record<string, string[]>} */
  const byEvent = {};
  for (const [event, entries] of Object.entries(json.hooks ?? {})) {
    byEvent[event] = (entries ?? []).map((e) => {
      const cmd = e.command ?? "";
      const parts = cmd.trim().split(/\s+/);
      return parts[parts.length - 1];
    });
  }
  return { path, byEvent };
}

function parseFrontmatter(text) {
  if (!text.startsWith("---")) return { raw: "", data: {} };
  const end = text.indexOf("\n---", 3);
  if (end === -1) return { raw: "", data: {} };
  const raw = text.slice(4, end).replace(/\r/g, "");
  /** @type {Record<string, string>} */
  const data = {};
  let currentKey = "";
  for (const line of raw.split("\n")) {
    const top = line.match(/^(\w+):\s*(.*)$/);
    if (top) {
      currentKey = top[1];
      data[currentKey] = top[2].trim();
      continue;
    }
    const nested = line.match(/^\s{2,}(\w+):\s*(.*)$/);
    if (nested && currentKey === "provenance") {
      data[`provenance.${nested[1]}`] = nested[2].trim();
    }
    if (nested && currentKey === "tracker") {
      data[`tracker.${nested[1]}`] = nested[2].trim();
    }
  }
  return { raw, data };
}

async function listMarkdownFiles(dir) {
  if (!existsSync(dir)) return [];
  const out = [];
  async function walk(d) {
    for (const name of await readdir(d)) {
      if (name.startsWith("_") || name === "INDEX.md") continue;
      const p = join(d, name);
      const s = await stat(p);
      if (s.isDirectory()) await walk(p);
      else if (name.endsWith(".md")) out.push(p);
    }
  }
  await walk(dir);
  return out;
}

function finding(id, severity, category, message, extra = {}) {
  return { id, severity, category, message, ...extra };
}

async function runChecks(ctx) {
  /** @type {ReturnType<finding>[]} */
  const findings = [];

  for (const id of ctx.config.agents) {
    const card = join(ROOT, `.cursor/agents/${id}.md`);
    if (!existsSync(card)) {
      findings.push(
        finding(
          "struct.agent-id-resolves",
          "fail",
          "structural",
          `Agent id "${id}" has no card at .cursor/agents/${id}.md`,
          { path: rel(card) },
        ),
      );
    }
  }

  for (const cmd of ctx.config.commands) {
    const file = join(ROOT, cmd.file);
    if (!existsSync(file)) {
      findings.push(
        finding(
          "struct.command-id-resolves",
          "fail",
          "structural",
          `Command ${cmd.id} registry file missing: ${cmd.file}`,
          { path: rel(file) },
        ),
      );
    }
  }

  const skillDirs = existsSync(join(ROOT, ".cursor/skills"))
    ? (await readdir(join(ROOT, ".cursor/skills"))).filter((n) =>
        existsSync(join(ROOT, ".cursor/skills", n, "SKILL.md")),
      )
    : [];
  const regSkillIds = new Set(ctx.config.skills.map((s) => s.id));
  for (const id of skillDirs) {
    if (!regSkillIds.has(id)) {
      findings.push(
        finding(
          "struct.skill-registered",
          "fail",
          "structural",
          `Skill directory ".cursor/skills/${id}" is not in sdlc.yaml instructions.skills.registry`,
        ),
      );
    }
  }
  for (const s of ctx.config.skills) {
    if (!existsSync(join(ROOT, s.path))) {
      findings.push(
        finding(
          "struct.skill-registered",
          "fail",
          "structural",
          `Registered skill path missing: ${s.path}`,
          { path: s.path },
        ),
      );
    }
  }

  const ruleFiles = existsSync(join(ROOT, ".cursor/rules"))
    ? (await readdir(join(ROOT, ".cursor/rules"))).filter((f) =>
        f.endsWith(".mdc"),
      )
    : [];
  const regRuleFiles = new Set(ctx.config.rules.map((r) => basename(r.file)));
  for (const f of ruleFiles) {
    if (!regRuleFiles.has(f)) {
      findings.push(
        finding(
          "struct.rule-registered",
          "fail",
          "structural",
          `Rule file ".cursor/rules/${f}" is not in sdlc.yaml instructions.rules.registry`,
        ),
      );
    }
  }
  for (const r of ctx.config.rules) {
    if (!existsSync(join(ROOT, r.file))) {
      findings.push(
        finding(
          "struct.rule-registered",
          "fail",
          "structural",
          `Registered rule file missing: ${r.file}`,
          { path: r.file },
        ),
      );
    }
  }

  for (const h of ctx.config.hooks) {
    const regScript = h.script.replace(/\\/g, "/");
    const regBase = basename(regScript);
    const actual = ctx.hooks.byEvent[h.event] ?? [];
    const actualPaths = actual.map((p) => p.replace(/\\/g, "/"));
    const actualBase = actualPaths.map((p) => basename(p));

    const extensionMismatch =
      regBase.endsWith(".sh") &&
      actualBase.some((b) => b.replace(/\.mjs$/, ".sh") === regBase);

    const pathMatch = actualPaths.some((p) => {
      const base = basename(p);
      return (
        p.endsWith(regScript) ||
        base === regBase ||
        base === regBase.replace(/\.sh$/, ".mjs")
      );
    });

    if (!pathMatch) {
      findings.push(
        finding(
          "struct.hook-registry-matches-config",
          "fail",
          "structural",
          `Hook registry script "${h.script}" (${h.event}) does not match .cursor/hooks.json (actual: ${actualPaths.join(", ") || "none"})`,
          { path: ".cursor/hooks.json" },
        ),
      );
    } else if (extensionMismatch) {
      findings.push(
        finding(
          "struct.hook-registry-matches-config",
          "fail",
          "structural",
          `Hook registry lists "${h.script}" but hooks.json uses ".mjs" for event ${h.event}`,
          { path: ".sdlc/sdlc.yaml" },
        ),
      );
    }
  }

  for (const wf of ctx.config.workflows) {
    if (!existsSync(join(ROOT, wf.file))) {
      findings.push(
        finding(
          "struct.workflow-named-exists",
          "fail",
          "structural",
          `Workflow ${wf.id} file missing: ${wf.file}`,
          { path: wf.file },
        ),
      );
    }
  }

  /** Collect GitHub status-check names as workflow_name/job_id. */
  const declaredJobs = new Set();
  for (const wf of ctx.config.workflows) {
    const wfPath = join(ROOT, wf.file);
    if (!existsSync(wfPath)) continue;
    const wfText = await readText(wfPath);
    const wfNameMatch = wfText.match(/^name:\s*(.+)$/m);
    const wfName = wfNameMatch
      ? wfNameMatch[1].trim().replace(/^["']|["']$/g, "")
      : basename(wf.file, ".yml");
    for (const m of wfText.matchAll(/^  ([a-zA-Z][\w-]*):\s*$/gm)) {
      declaredJobs.add(`${wfName}/${m[1]}`);
      if (wf.id === "e2e_evidence" && m[1] === "e2e") {
        declaredJobs.add("ci/e2e");
      }
    }
  }

  for (const check of ctx.config.protectionChecks) {
    if (!declaredJobs.has(check)) {
      findings.push(
        finding(
          "struct.protection-checks-exist",
          "fail",
          "structural",
          `Branch protection check "${check}" is not declared as a job in any workflow`,
        ),
      );
    }
  }

  const adapterPath = join(ROOT, ctx.config.syncScript);
  if (!ctx.config.syncScript || !existsSync(adapterPath)) {
    findings.push(
      finding(
        "struct.tracker-adapter-script-exists",
        "fail",
        "structural",
        `Active tracker adapter script missing: ${ctx.config.syncScript || "(unset)"}`,
        { path: ctx.config.syncScript },
      ),
    );
  } else {
    const help = spawnSync("node", [adapterPath], {
      encoding: "utf8",
      cwd: ROOT,
    });
    const helpText = `${help.stdout ?? ""}\n${help.stderr ?? ""}`;
    for (const sub of ctx.config.adapterSubcommands) {
      if (!helpText.includes(sub.name)) {
        findings.push(
          finding(
            "struct.tracker-adapter-contract-conformance",
            "fail",
            "structural",
            `Tracker adapter ${ctx.config.syncScript} help output missing subcommand "${sub.name}"`,
            { path: ctx.config.syncScript },
          ),
        );
      }
    }
  }

  for (const dir of ARTIFACT_DIRS) {
    const abs = join(ROOT, dir);
    for (const file of await listMarkdownFiles(abs)) {
      const text = await readText(file);
      const { data } = parseFrontmatter(text);
      const rawText = text.replace(/\r/g, "");

      if (/^plane_issue:/m.test(rawText)) {
        findings.push(
          finding(
            "artifact.legacy-plane-issue",
            "warn",
            "artifact",
            `Legacy plane_issue: field present (soft deprecation per ADR-0002)`,
            { path: rel(file) },
          ),
        );
      }

      if (!text.startsWith("---")) {
        findings.push(
          finding(
            "artifact.provenance-present",
            "fail",
            "artifact",
            `Missing YAML frontmatter`,
            { path: rel(file) },
          ),
        );
        continue;
      }
      if (!Object.keys(data).some((k) => k.startsWith("provenance."))) {
        findings.push(
          finding(
            "artifact.provenance-present",
            "fail",
            "artifact",
            `Missing provenance block in frontmatter`,
            { path: rel(file) },
          ),
        );
        continue;
      }
      for (const field of PROVENANCE_FIELDS) {
        const key = `provenance.${field}`;
        const topLevel = data[field] ?? "";
        if (!(key in data) && !topLevel) {
          findings.push(
            finding(
              "artifact.provenance-present",
              "fail",
              "artifact",
              `Provenance field "${field}" missing (empty value OK)`,
              { path: rel(file) },
            ),
          );
        }
      }
      const traceId = data["provenance.trace_id"] ?? "";
      if (traceId && traceId !== '""' && traceId !== '""' && !UUID_RE.test(traceId.replace(/^["']|["']$/g, ""))) {
        findings.push(
          finding(
            "artifact.trace-id-plausible",
            "fail",
            "artifact",
            `trace_id "${traceId}" does not look like a UUID`,
            { path: rel(file) },
          ),
        );
      }
      const provider = data["tracker.provider"] ?? "";
      if (provider && provider !== '""') {
        const p = provider
          .replace(/^["']|["']$/g, "")
          .split("#")[0]
          .trim();
        if (p && !ctx.config.trackerProviderKeys.includes(p)) {
          findings.push(
            finding(
              "artifact.tracker-provider-known",
              "fail",
              "artifact",
              `tracker.provider "${p}" is not a known provider key`,
              { path: rel(file) },
            ),
          );
        }
      }
    }
  }

  const indexPath = join(ROOT, ".sdlc/handoffs/INDEX.md");
  if (existsSync(indexPath)) {
    const indexText = await readText(indexPath);
    const openSection = indexText.match(/## open\s*\n([\s\S]*?)(?=\n## |\n$)/);
    const openLines = openSection
      ? openSection[1].match(/^\s*-\s+HANDOFF-\S+/gm) ?? []
      : [];
    for (const line of openLines) {
      const id = line.match(/HANDOFF-\S+/)?.[0];
      if (!id) continue;
      const handoffPath = join(ROOT, `.sdlc/handoffs/${id}.md`);
      if (!existsSync(handoffPath)) {
        findings.push(
          finding(
            "artifact.handoff-index-sync",
            "fail",
            "artifact",
            `INDEX.md open row ${id} has no handoff file`,
            { path: rel(handoffPath) },
          ),
        );
        continue;
      }
      const ht = await readText(handoffPath);
      const status = ht.match(/^status:\s+(\S+)/m)?.[1];
      if (status !== "open" && status !== "in_progress") {
        findings.push(
          finding(
            "artifact.handoff-index-sync",
            "fail",
            "artifact",
            `Handoff ${id} in ## open but file status is "${status ?? "missing"}"`,
            { path: rel(handoffPath) },
          ),
        );
      }
    }
    for (const file of await listMarkdownFiles(join(ROOT, ".sdlc/handoffs"))) {
      const ht = await readText(file);
      const status = ht.match(/^status:\s+(\S+)/m)?.[1];
      const id = ht.match(/^id:\s+(\S+)/m)?.[1] ?? basename(file, ".md");
      if (status === "open" && !openLines.some((l) => l.includes(id))) {
        findings.push(
          finding(
            "artifact.handoff-index-sync",
            "fail",
            "artifact",
            `Handoff ${id} has status: open but is missing from INDEX.md ## open`,
            { path: rel(file) },
          ),
        );
      }
    }
  }

  const opCtxPath = join(ROOT, ".sdlc/memories/operational-context.md");
  if (existsSync(opCtxPath)) {
    const opText = await readText(opCtxPath);
    const caps = [
      { heading: "## In progress (max 5)", max: 5 },
      { heading: "## Recently completed (max 5, last 14 days)", max: 5 },
      { heading: "## Next up (max 3)", max: 3 },
      { heading: "## Blocked / waiting (max 3)", max: 3 },
    ];
    for (const { heading, max } of caps) {
      const section = opText.match(
        new RegExp(`${heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*\\n([\\s\\S]*?)(?=\\n## |\\n$)`),
      );
      if (!section) continue;
      const bullets = section[1].match(/^\s*-\s+(?!_none_)/gm) ?? [];
      if (bullets.length > max) {
        findings.push(
          finding(
            "memory.operational-context-cap",
            "warn",
            "memory hygiene",
            `${heading} has ${bullets.length} bullets (cap ${max})`,
            { path: rel(opCtxPath) },
          ),
        );
      }
    }
  }

  const gh = spawnSync("gh", ["--version"], { encoding: "utf8" });
  if (gh.status !== 0) {
    findings.push(
      finding(
        "process.recent-pr-shape",
        "info",
        "process compliance",
        "gh CLI unavailable; skipping recent PR shape audit",
      ),
    );
  } else {
    const prs = spawnSync(
      "gh",
      [
        "pr",
        "list",
        "--state",
        "merged",
        "--limit",
        "10",
        "--json",
        "number,body,comments",
      ],
      { encoding: "utf8", cwd: ROOT },
    );
    if (prs.status === 0) {
      const list = JSON.parse(prs.stdout || "[]");
      for (const pr of list) {
        const blob = `${pr.body ?? ""}\n${(pr.comments ?? []).map((c) => c.body).join("\n")}`;
        const hasPlane = /plane[:/]|plane\.so/i.test(blob);
        const hasVercel = /vercel\.app/i.test(blob);
        const hasE2e = /e2e|playwright|\.sdlc\/reports/i.test(blob);
        if (!hasPlane || !hasVercel || !hasE2e) {
          findings.push(
            finding(
              "process.recent-pr-shape",
              "warn",
              "process compliance",
              `Merged PR #${pr.number} missing required shape (plane=${hasPlane}, vercel=${hasVercel}, e2e=${hasE2e})`,
            ),
          );
        }
      }
    }
  }

  const reviewDir = join(ROOT, ".sdlc/reviews");
  const reviewFiles = existsSync(reviewDir)
    ? (await readdir(reviewDir))
        .filter((f) => /^PR-\d+\.md$/.test(f))
        .sort()
        .slice(-10)
    : [];
  for (const f of reviewFiles) {
    const rt = await readText(join(reviewDir, f));
    if (!/^implementer_distinct_from_reviewer:\s+true/m.test(rt)) {
      findings.push(
        finding(
          "process.reviewer-distinct",
          "fail",
          "process compliance",
          `Review ${f} missing implementer_distinct_from_reviewer: true`,
          { path: rel(join(reviewDir, f)) },
        ),
      );
    }
  }

  const integrationQuotaMap = {
    github: "github",
    plane: "plane",
    vercel: "vercel",
    posthog: "posthog",
    browser_evidence: null,
    tracker: "plane",
  };
  for (const key of ctx.config.integrationKeys) {
    const quotaKey = integrationQuotaMap[key];
    if (quotaKey === null) continue;
    if (quotaKey && !ctx.config.freeQuotaKeys.includes(quotaKey)) {
      findings.push(
        finding(
          "cost.integration-has-quota",
          "fail",
          "cost compliance",
          `Integration "${key}" has no matching policies.cost.free_quotas entry (expected "${quotaKey}")`,
        ),
      );
    }
  }

  const refParts = ctx.config.providerQuotaRef.split(".");
  const refKey = refParts[refParts.length - 1];
  if (refKey && !ctx.config.freeQuotaKeys.includes(refKey)) {
    findings.push(
      finding(
        "cost.tracker-provider-has-quota",
        "fail",
        "cost compliance",
        `Tracker provider quota ref "${ctx.config.providerQuotaRef}" does not resolve to free_quotas.${refKey}`,
      ),
    );
  }

  return findings;
}

function formatSummary(report) {
  const lines = [
    `SDLC doctor (mechanical) — ${report.findings.length} finding(s)`,
    `  fail: ${report.summary.fail}  warn: ${report.summary.warn}  info: ${report.summary.info}`,
    "",
  ];
  for (const cat of CATEGORIES) {
    const catFindings = report.findings.filter((f) => f.category === cat);
    if (!catFindings.length) continue;
    lines.push(`## ${cat}`);
    for (const f of catFindings) {
      lines.push(`  [${f.severity}] ${f.id}: ${f.message}`);
    }
    lines.push("");
  }
  return lines.join("\n");
}

async function generateBaseline(config, hooksJson) {
  const alwaysApply = config.rules
    .filter((r) => r.always_apply === "true")
    .map((r) => r.id);

  let rulesConcat = "";
  for (const r of config.rules.filter((x) => x.always_apply === "true")) {
    rulesConcat += await readText(join(ROOT, r.file));
  }

  const requiredMemory = [
    ".sdlc/memories/project.md",
    ".sdlc/memories/operational-context.md",
    ".sdlc/memories/architecture.md",
    ".sdlc/memories/business-rules.md",
    ".sdlc/memories/glossary.md",
    ".sdlc/memories/incidents.md",
    ".sdlc/memories/lessons.md",
  ];

  const hookMap = {};
  for (const [event, scripts] of Object.entries(hooksJson.byEvent)) {
    hookMap[event] = scripts;
  }

  return {
    schema_version: "1.0",
    generated_at: new Date().toISOString(),
    commands: config.commands.map((c) => c.id),
    always_apply_rules: alwaysApply,
    skills: config.skills.map((s) => s.id),
    hooks: hookMap,
    required_memory_files: requiredMemory,
    workflows: config.workflows.map((w) => w.id),
    fingerprints: {
      sdlc_yaml: sha256(config.text),
      always_apply_rules: sha256(rulesConcat),
    },
  };
}

function baselineToYaml(obj) {
  const lines = [
    "---",
    `schema_version: "${obj.schema_version}"`,
    `generated_at: "${obj.generated_at}"`,
    "commands:",
    ...obj.commands.map((c) => `  - ${c}`),
    "always_apply_rules:",
    ...obj.always_apply_rules.map((r) => `  - ${r}`),
    "skills:",
    ...obj.skills.map((s) => `  - ${s}`),
    "hooks:",
  ];
  for (const [event, scripts] of Object.entries(obj.hooks)) {
    lines.push(`  ${event}:`);
    for (const s of scripts) lines.push(`    - ${s}`);
  }
  lines.push("required_memory_files:");
  for (const f of obj.required_memory_files) lines.push(`  - ${f}`);
  lines.push("workflows:");
  for (const w of obj.workflows) lines.push(`  - ${w}`);
  lines.push("fingerprints:");
  lines.push(`  sdlc_yaml: "${obj.fingerprints.sdlc_yaml}"`);
  lines.push(`  always_apply_rules: "${obj.fingerprints.always_apply_rules}"`);
  lines.push("---");
  lines.push("");
  return lines.join("\n");
}

async function loadBaseline() {
  const path = join(ROOT, ".sdlc/baseline.yaml");
  if (!existsSync(path)) return null;
  const text = await readText(path);
  const body = text.replace(/^---[\s\S]*?---\n?/, "");
  const fingerprints = {};
  const sdlcFp = text.match(/sdlc_yaml:\s*"([^"]+)"/);
  const rulesFp = text.match(/always_apply_rules:\s*"([^"]+)"/);
  if (sdlcFp) fingerprints.sdlc_yaml = sdlcFp[1];
  if (rulesFp) fingerprints.always_apply_rules = rulesFp[1];
  return { path, text, body, fingerprints };
}

async function main() {
  const args = parseArgs(argv.slice(2));

  if (args.listChecks) {
    for (const id of CHECK_IDS) stdout.write(`${id}\n`);
    return;
  }

  try {
    const config = await loadSdlcConfig();
    const hooks = await loadHooksJson();

    if (args.refreshBaseline) {
      const baseline = await generateBaseline(config, hooks);
      const outPath = join(ROOT, ".sdlc/baseline.yaml");
      await writeFile(outPath, baselineToYaml(baseline), "utf8");
      stderr.write(`Baseline written to ${rel(outPath)}\n`);
      return;
    }

    const baseline = await loadBaseline();
    if (!baseline) {
      const report = {
        mode: args.mode,
        generated_at: new Date().toISOString(),
        findings: [
          finding(
            "struct.baseline-absent",
            "fail",
            "structural",
            "baseline absent; run /doctor --refresh-baseline",
          ),
        ],
        summary: { fail: 1, warn: 0, info: 0 },
      };
      stdout.write(`${JSON.stringify(report, null, 2)}\n`);
      stderr.write(formatSummary(report) + "\n");
      exit(1);
    }

    const ctx = { config, hooks, baseline };
    const findings = await runChecks(ctx);

    const summary = {
      fail: findings.filter((f) => f.severity === "fail").length,
      warn: findings.filter((f) => f.severity === "warn").length,
      info: findings.filter((f) => f.severity === "info").length,
    };

    const report = {
      mode: args.mode,
      generated_at: new Date().toISOString(),
      findings,
      summary,
    };

    stdout.write(`${JSON.stringify(report, null, 2)}\n`);
    stderr.write(formatSummary(report) + "\n");

    if (summary.fail > 0) exit(1);
    exit(0);
  } catch (err) {
    stderr.write(`sdlc-doctor error: ${err instanceof Error ? err.message : err}\n`);
    exit(2);
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  main();
}
