import { test, expect } from "@playwright/test";

test.describe("home", () => {
  test("renders The Daily Brief header", async ({ page }) => {
    await page.goto("/");
    await expect(
      page.getByRole("heading", { level: 1, name: "The Daily Brief" })
    ).toBeVisible();
  });

  test("shows a featured article above the fold", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("Featured")).toBeVisible();
    const featuredHeading = page.locator("section").first().getByRole("heading", { level: 2 });
    await expect(featuredHeading).toBeVisible();
  });

  test("lists the remaining articles", async ({ page }) => {
    await page.goto("/");
    const cards = page.locator("section").nth(1).locator("h3");
    await expect(cards).toHaveCount(4);
  });
});
