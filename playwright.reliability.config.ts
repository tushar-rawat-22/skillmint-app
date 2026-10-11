import { defineConfig, devices } from "@playwright/test";

const appOrigin = "http://127.0.0.1:3100";

export default defineConfig({
  testDir: "./e2e",
  outputDir: "test-results/reliability",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 180_000,
  expect: { timeout: 10_000 },
  reporter: [["line"]],
  use: {
    baseURL: appOrigin,
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
    video: "off",
    actionTimeout: 10_000,
    navigationTimeout: 20_000,
  },
  webServer: [
    {
      command: "node e2e/support/synthetic-auth-server.mjs",
      url: "http://127.0.0.1:54321/health",
      reuseExistingServer: false,
      timeout: 30_000,
    },
    {
      command: "npm run start -- --hostname 127.0.0.1 --port 3100",
      url: appOrigin,
      reuseExistingServer: false,
      timeout: 120_000,
      env: {
        NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
          "synthetic-reliability-publishable-key",
        NEXT_PUBLIC_APP_URL: appOrigin,
        SUPABASE_SECRET_KEY: "synthetic-local-key",
        SKILLMINT_PRIVACY_CONTACT_EMAIL: "privacy@example.test",
        NEXT_PUBLIC_ANALYTICS_COLLECTION_ENABLED: "false",
        SKILLMINT_PUBLIC_SIGNUP_ENABLED: "",
        SKILLMINT_PUBLIC_DEMO_ENABLED: "false",
      },
    },
  ],
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
