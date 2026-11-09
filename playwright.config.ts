import { defineConfig, devices } from '@playwright/test';

// Runs against a preview build that includes drafts: `npm run test:e2e`.
// --ignore-lock keeps Astro 7's preview in the foreground (it backgrounds itself in some environments).
export default defineConfig({
  testDir: 'e2e',
  use: { baseURL: 'http://localhost:4321' },
  webServer: { command: 'npx astro preview --port 4321 --ignore-lock', url: 'http://localhost:4321', reuseExistingServer: !process.env.CI },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['Desktop Chrome'], viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } },
  ],
});
