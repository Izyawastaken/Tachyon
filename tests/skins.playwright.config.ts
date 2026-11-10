import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: '.',
  testMatch: 'skins.spec.ts',
  outputDir: './generated/skins-results',
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:1420',
    channel: 'chrome',
    viewport: { width: 1440, height: 1000 },
    launchOptions: { args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] },
  },
  webServer: { command: 'pnpm dev', url: 'http://localhost:1420', reuseExistingServer: true },
});
