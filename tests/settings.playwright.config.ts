import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: '.', testMatch: 'settings.spec.ts', outputDir: './generated/settings-results',
  workers: 1, reporter: 'list',
  use: { baseURL: 'http://localhost:1420', channel: 'chrome', viewport: { width: 1440, height: 1000 } },
  webServer: { command: 'pnpm dev', url: 'http://localhost:1420', reuseExistingServer: true },
});
