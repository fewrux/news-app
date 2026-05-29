import { spawnSync } from "node:child_process";
import { fail } from "./common.mjs";

const COMMANDS = [
  { name: "lint", cmd: "npm", args: ["run", "lint"] },
  { name: "typecheck", cmd: "npm", args: ["run", "typecheck"] },
  { name: "build", cmd: "npm", args: ["run", "build"] },
];

export function validateImplement() {
  for (const { name, cmd, args } of COMMANDS) {
    const r = spawnSync(cmd, args, { encoding: "utf8", shell: process.platform === "win32" });
    if (r.status !== 0) {
      console.error(r.stdout);
      console.error(r.stderr);
      fail(`implement gate.${name} failed (exit ${r.status})`);
    }
  }
  return "lint, typecheck, build passed";
}
