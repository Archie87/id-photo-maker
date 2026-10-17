import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 120000,
  use: {
    baseURL: 'http://127.0.0.1:3000',
    headless: true,
    launchOptions: process.env.IDPM_CHROME_PATH
      ? { executablePath: process.env.IDPM_CHROME_PATH }
      : {},
  },
  webServer: {
    command: process.env.IDPM_TEST_STATIC
      ? 'python3 -m http.server 3000 --bind 127.0.0.1 --directory apps/web/out'
      : 'pnpm dev',
    url: 'http://127.0.0.1:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});
