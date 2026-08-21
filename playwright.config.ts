import { defineConfig, devices } from "@playwright/test";

const appOrigin = "http://127.0.0.1:3100";

export default defineConfig({
  testDir: "./e2e",
  outputDir: "test-results",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 30_000,
  expect: { timeout: 7_500 },
  reporter: [["line"], ["html", { outputFolder: "playwright-report", open: "never" }]],
  use: {
    baseURL: appOrigin,
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
    video: "retain-on-failure",
    actionTimeout: 7_500,
    navigationTimeout: 15_000,
  },
  webServer: [
    {
      command: "node e2e/support/synthetic-auth-server.mjs",
      url: "http://127.0.0.1:54321/health",
      reuseExistingServer: false,
      timeout: 30_000,
    },
    {
      command: "npm run dev -- --hostname 127.0.0.1 --port 3100",
      url: appOrigin,
      reuseExistingServer: false,
      timeout: 120_000,
      env: {
        NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "synthetic-playwright-publishable-key",
        NEXT_PUBLIC_APP_URL: appOrigin,
        NEXT_PUBLIC_ANALYTICS_COLLECTION_ENABLED: "true",
        SKILLMINT_PUBLIC_SIGNUP_ENABLED:
          process.env.SKILLMINT_E2E_PUBLIC_SIGNUP_ENABLED === "true"
            ? "true"
            : "",
        SKILLMINT_PUBLIC_DEMO_ENABLED:
          process.env.SKILLMINT_E2E_PUBLIC_DEMO_ENABLED === "true"
            ? "true"
            : "false",
      },
    },
  ],
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "firefox", use: { ...devices["Desktop Firefox"] } },
    { name: "webkit", use: { ...devices["Desktop Safari"] } },
  ],
});
