import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  expect: {
    timeout: 10_000,
  },
  fullyParallel: false,
  globalSetup: "./global-setup.ts",
  reporter: [["list"]],
  testDir: ".",
  workers: 1,
  use: {
    baseURL: "http://127.0.0.1:4318",
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  webServer: [
    {
      command:
        "TIMEMAGIC_STARTUP_TOKEN=e2e-token TIMEMAGIC_DATA_ROOT=../../test-results/e2e-data pnpm --filter @timemagic/server dev",
      reuseExistingServer: false,
      timeout: 120_000,
      url: "http://127.0.0.1:4317/health",
    },
    {
      command:
        "pnpm --filter @timemagic/web dev --host 127.0.0.1 --port 4318",
      reuseExistingServer: false,
      timeout: 120_000,
      url: "http://127.0.0.1:4318",
    },
  ],
  projects: [
    {
      name: "desktop",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { height: 900, width: 1440 },
      },
    },
    {
      name: "mobile",
      use: {
        ...devices["Desktop Chrome"],
        hasTouch: true,
        isMobile: true,
        viewport: { height: 844, width: 390 },
      },
    },
  ],
});
