#!/usr/bin/env node
// beforeShellExecution hook — block destructive or paid-tier-triggering commands.
// Always asks the user for risky operations; outright denies a small blocklist.
//
// Branch discipline (per .cursor/rules/branch-discipline.mdc) is mechanical
// here: any attempt to push to main/master or commit while checked out on
// main is denied unconditionally. The DSL contract is at
// .sdlc/sdlc.yaml.integrations.github.branch_strategy.protection.

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function onMainBranch() {
  try {
    const head = readFileSync(resolve(process.cwd(), ".git/HEAD"), "utf8").trim();
    return /\brefs\/heads\/(main|master)$/.test(head);
  } catch {
    return false;
  }
}

let input = "";
process.stdin.on("data", (chunk) => (input += chunk));
process.stdin.on("end", () => {
  let parsed;
  try {
    parsed = JSON.parse(input);
  } catch {
    process.stdout.write(JSON.stringify({ permission: "allow" }));
    return;
  }

  const cmd = String(parsed.command ?? "");

  const denyPatterns = [
    { name: "rm -rf root or home",            re: /\brm\s+-rf?\s+(\/|~|\$HOME)(\s|$)/ },
    { name: "force push (any branch)",        re: /\bgit\s+push\b[^\n;|&]*\s(--force|--force-with-lease|-f)\b/ },
    { name: "direct push to main/master",     re: /\bgit\s+push\b(?:\s+\S+)*?\s+(?:\S+:)?(main|master)(?:\s|$)/ },
    { name: "delete remote main/master",      re: /\bgit\s+push\s+\S+\s+(--delete\s+)?:?(main|master)\b/ },
    { name: "checkout/switch onto main",      re: /\bgit\s+(checkout|switch)\s+(?:-\S+\s+)*(main|master)(?:\s|$)/ },
    { name: "commit directly while on main",  re: /\bgit\s+commit\b/, when: () => onMainBranch() },
    { name: "PR merge with --admin bypass",   re: /\bgh\s+pr\s+merge\b[^\n;|&]*--admin\b/ },
    { name: "git config write",               re: /\bgit\s+config\s+--global\b/ },
    { name: "vercel scale up",                re: /\bvercel\s+(scale|deploy\s+--prod\s+--scale)\b/ },
  ];

  for (const p of denyPatterns) {
    if (!p.re.test(cmd)) continue;
    if (typeof p.when === "function" && !p.when()) continue;
    process.stdout.write(
      JSON.stringify({
        permission: "deny",
        user_message: `Blocked by SDLC guard: ${p.name}. See .cursor/rules/branch-discipline.mdc and .cursor/hooks/guard-shell.mjs.`,
        agent_message: `Blocked: ${p.name}. Open a feature branch + PR per .cursor/rules/branch-discipline.mdc.`,
      })
    );
    return;
  }

  const askPatterns = [
    { name: "raw curl/wget",              re: /\b(curl|wget)\b/ },
    { name: "package install",            re: /\b(npm|pnpm|yarn)\s+(i|install|add)\b/ },
    { name: "vercel prod deploy",         re: /\bvercel\s+--prod\b/ },
    { name: "playwright install browsers",re: /\bplaywright\s+install\b/ },
  ];

  for (const p of askPatterns) {
    if (p.re.test(cmd)) {
      process.stdout.write(
        JSON.stringify({
          permission: "ask",
          user_message: `Confirm: this command may have side effects (${p.name}).`,
          agent_message: `Hook flagged this command as a free-tier or side-effect risk: ${p.name}.`,
        })
      );
      return;
    }
  }

  process.stdout.write(JSON.stringify({ permission: "allow" }));
});
