import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  use: { baseURL: 'http://localhost:3100', launchOptions: { executablePath: process.env.PW_CHROMIUM || undefined } },
  webServer: { command: 'npx next build && npx next start -p 3100', url: 'http://localhost:3100', reuseExistingServer: true, timeout: 180_000 },
  projects: [
    { name: 'mobile', use: { ...devices['iPhone 14'], browserName: 'chromium', defaultBrowserType: 'chromium' } },
    { name: 'desktop', use: { viewport: { width: 1280, height: 800 } } },
  ],
});
