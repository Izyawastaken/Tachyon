import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: '.', testMatch: 'themes.spec.ts', outputDir: './generated/themes-results', workers: 1, reporter: 'list',
  use: { baseURL: 'http://localhost:1420', channel: 'chrome', viewport: { width: 1440, height: 1000 }, trace: 'retain-on-failure' },
  webServer: { command: 'pnpm dev', url: 'http://localhost:1420', reuseExistingServer: true },
});
