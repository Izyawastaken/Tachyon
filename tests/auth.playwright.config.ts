import { defineConfig } from '@playwright/test';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  testDir: '.', testMatch: 'auth.spec.ts', outputDir: './generated/auth-results',
  workers: 1, reporter: 'list',
  use: { baseURL: 'http://localhost:1420', channel: 'chrome', viewport: { width: 1440, height: 1000 } },
  webServer: {
    command: 'node node_modules/vite/bin/vite.js --configLoader native',
    cwd: fileURLToPath(new URL('..', import.meta.url)),
    url: 'http://localhost:1420', reuseExistingServer: true,
  },
});
