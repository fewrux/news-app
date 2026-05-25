import { test, expect } from "@playwright/test";

// Required smoke test (per .cursor/rules/testing-evidence.mdc):
// runs once, retries once on CI, and is responsible for guaranteeing at least
// one piece of video evidence per PR. Keep it lean.
test.describe.configure({ retries: 1 });

test("home loads without console errors", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (err) => errors.push(err.message));
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });

  await page.goto("/");
  await expect(page.getByRole("heading", { name: "The Daily Brief" })).toBeVisible();

  expect(errors, `Console errors during home load: ${errors.join("\n")}`).toEqual([]);
});
