// @ts-check
import { defineConfig, devices } from '@playwright/test';

/* E2E coverage for the dashboard.html RENDERER (the ~5,800-line UI that node --test can't reach).
   Loads the standalone web build in demo mode and drives every tab. Chromium only (matches the Electron
   renderer engine). Unit tests live in tests/*.test.js (node --test); E2E lives in tests/e2e/*.spec.js. */
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? 'line' : 'list',
  use: {
    baseURL: 'http://127.0.0.1:8778',
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: {
    command: 'node tests/e2e/serve.js',
    url: 'http://127.0.0.1:8778/dashboard.html',
    reuseExistingServer: !process.env.CI,
    timeout: 30000,
  },
});
