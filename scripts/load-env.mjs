/**
 * Load .env then .env.local into process.env (does not override existing vars).
 * Used by plane-sync and gate scripts that need PLANE_* locally.
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { env } from "node:process";

const ROOT = resolve(import.meta.dirname, "..");

/**
 * @param {string} [root]
 */
export function loadEnvFiles(root = ROOT) {
  for (const name of [".env", ".env.local"]) {
    const p = resolve(root, name);
    if (!existsSync(p)) continue;
    const text = readFileSync(p, "utf8");
    for (const line of text.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq < 0) continue;
      const key = trimmed.slice(0, eq).trim();
      let val = trimmed.slice(eq + 1).trim();
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      if (env[key] === undefined) env[key] = val;
    }
  }
}
