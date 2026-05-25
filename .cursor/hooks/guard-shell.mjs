#!/usr/bin/env node
// beforeShellExecution hook — block destructive or paid-tier-triggering commands.
// Always asks the user for risky operations; outright denies a small blocklist.

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
    { name: "rm -rf root or home",       re: /\brm\s+-rf?\s+(\/|~|\$HOME)(\s|$)/ },
    { name: "force push to main/master", re: /\bgit\s+push\s+(--force|-f)\b.*\b(main|master)\b/ },
    { name: "delete remote main",        re: /\bgit\s+push\s+\S+\s+:?(main|master)\b/ },
    { name: "git config write",          re: /\bgit\s+config\s+--global\b/ },
    { name: "vercel scale up",           re: /\bvercel\s+(scale|deploy\s+--prod\s+--scale)\b/ },
  ];

  for (const p of denyPatterns) {
    if (p.re.test(cmd)) {
      process.stdout.write(
        JSON.stringify({
          permission: "deny",
          user_message: `Blocked by SDLC guard: ${p.name}. See .cursor/hooks/guard-shell.mjs.`,
          agent_message: `Blocked: ${p.name}. Choose a reversible alternative.`,
        })
      );
      return;
    }
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
