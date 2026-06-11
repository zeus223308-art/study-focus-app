import { defineConfig, devices } from '@playwright/test';

/** Matches GitHub Pages deploy (EXPO_PUBLIC_BASE_PATH=/study-focus-app). */
const APP_BASE = '/study-focus-app';
const PORT = 4173;
const HOST = `http://127.0.0.1:${PORT}`;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? 'github' : 'list',
  timeout: 60_000,
  use: {
    baseURL: `${HOST}${APP_BASE}`,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'webkit-iphone',
      use: { ...devices['iPhone 13'] },
    },
  ],
  webServer: {
    command: 'node scripts/serve-github-pages.mjs',
    url: `${HOST}${APP_BASE}`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
