import { defineConfig, devices } from "@playwright/test";

// Free-tier-aware defaults:
// - dev: video/trace on-first-retry to keep storage modest
// - verify (SDLC_VERIFY=1): always record — see playwright.verify.config.ts / ADR-0008
const verifyMode = process.env.SDLC_VERIFY === "1";
// - one retry on CI so flakes still produce evidence
// - chromium-only on CI by default (override with --project=firefox|webkit)
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI
    ? [["list"], ["html", { open: "never" }]]
    : [["list"], ["html"]],

  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000",
    video: verifyMode ? "on" : "on-first-retry",
    trace: verifyMode ? "on" : "on-first-retry",
    screenshot: "only-on-failure",
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "firefox",
      use: { ...devices["Desktop Firefox"] },
    },
    {
      name: "webkit",
      use: { ...devices["Desktop Safari"] },
    },
  ],

  webServer: process.env.PLAYWRIGHT_BASE_URL
    ? undefined
    : {
        command: "npm run dev",
        url: "http://localhost:3000",
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
});
