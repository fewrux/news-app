import { test, expect } from "@playwright/test";

test.describe("article detail", () => {
  test("navigates from Brief to article detail", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: /Scientists Discover New Deep-Sea Species/i }).click();
    await expect(page).toHaveURL("/article/2");
  });

  test("detail page renders article metadata", async ({ page }) => {
    await page.goto("/article/2");
    await expect(page.getByRole("heading", { level: 1, name: /Scientists Discover/i })).toBeVisible();
    await expect(page.getByText("Science")).toBeVisible();
    await expect(page.getByText("James Okafor")).toBeVisible();
    await expect(page.getByText("4 min read")).toBeVisible();
  });

  test("unknown id shows not found", async ({ page }) => {
    await page.goto("/article/999");
    await expect(page.getByRole("heading", { name: /not found/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /Back to the Brief/i })).toBeVisible();
  });

  test("back link returns to Brief", async ({ page }) => {
    await page.goto("/article/1");
    await page.getByRole("link", { name: /Back to the Brief/i }).click();
    await expect(page.getByRole("heading", { level: 1, name: "The Daily Brief" })).toBeVisible();
  });
});
