import { ROOT, fail, parseFrontmatter, readText } from "./common.mjs";

/**
 * @param {string} adrPath
 * @param {string | undefined} specPath
 */
export async function validateAdr(adrPath, specPath) {
  if (specPath) {
    const specMd = await readText(specPath);
    const { frontmatter } = parseFrontmatter(specMd);
    if (frontmatter.complexity === "trivial") {
      return "design skipped (complexity trivial)";
    }
  }

  const abs = resolve(ROOT, adrPath);
  if (!existsSync(abs)) fail(`ADR artifact missing: ${adrPath}`);

  const md = await readText(abs);
  const { body } = parseFrontmatter(md);

  const options = body.match(/^## Option/mg) ?? [];
  if (options.length < 2) {
    fail("ADR must list >= 2 alternatives (## Option … headings)");
  }
  if (!body.includes("# Decision")) fail("ADR missing # Decision section");

  return `ADR ${adrPath} has ${options.length} alternatives`;
}

/**
 * @param {string} specPath
 */
export async function validateDesignForSpec(specPath) {
  const specMd = await readFile(resolve(ROOT, specPath), "utf8");
  const { frontmatter } = parseFrontmatter(specMd);
  if (frontmatter.complexity !== "complex") {
    return "design skipped (complexity not complex)";
  }
  fail("complex spec requires --artifact pointing to an ADR under .sdlc/decisions/");
}
