#!/usr/bin/env node
// beforeSubmitPrompt hook — refuse prompts that contain obvious secrets.
// failClosed: true is set in hooks.json, so a crash blocks the prompt.

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

  const prompt = String(parsed.prompt ?? parsed.input ?? "");

  const patterns = [
    { name: "AWS access key id", re: /\bAKIA[0-9A-Z]{16}\b/ },
    { name: "GitHub token",      re: /\bghp_[A-Za-z0-9]{36,}\b/ },
    { name: "OpenAI key",        re: /\bsk-[A-Za-z0-9]{20,}\b/ },
    { name: "Anthropic key",     re: /\bsk-ant-[A-Za-z0-9-]{20,}\b/ },
    { name: "LangSmith key",     re: /\blsv2_[a-z]{2}_[A-Za-z0-9]{20,}\b/ },
    { name: "Vercel token",      re: /\bvercel_[A-Za-z0-9]{20,}\b/i },
    { name: "Plane token",       re: /\bplane_api_[A-Za-z0-9]{20,}\b/i },
    { name: "Generic private key header", re: /-----BEGIN (RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/ },
  ];

  for (const p of patterns) {
    if (p.re.test(prompt)) {
      process.stdout.write(
        JSON.stringify({
          permission: "deny",
          user_message: `Blocked: prompt contains a ${p.name}. Move it to .env and reference via env var.`,
          agent_message: `A hook blocked this prompt because it appears to contain a ${p.name}.`,
        })
      );
      return;
    }
  }

  process.stdout.write(JSON.stringify({ permission: "allow" }));
});
