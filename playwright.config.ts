import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  timeout: 15_000,
  expect: { timeout: 5_000 },
  retries: 0,
  workers: process.env.CI ? 4 : undefined,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: 'http://127.0.0.1:4173',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    // Functional browser acceptance should exercise the production UI and persistence
    // deterministically. The PWA/service-worker lifecycle is covered separately and must
    // not race IndexedDB fixture seeding or serve stale assets between navigations.
    serviceWorkers: 'block',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    // WebKit is materially slower on the hosted Ubuntu runner, especially during the
    // first parallel app boots. Keep Chromium's strict 15 s budget, but give WebKit a
    // still-bounded budget below Playwright's 30 s default and reduce CPU contention.
    { name: 'webkit', timeout: 25_000, workers: process.env.CI ? 2 : undefined, use: { ...devices['Desktop Safari'] } },
    { name: 'mobile-webkit', timeout: 25_000, workers: process.env.CI ? 2 : undefined, use: { ...devices['iPhone 15'] } },
  ],
  webServer: {
    command: 'npm run preview -- --host 127.0.0.1 --port 4173',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
