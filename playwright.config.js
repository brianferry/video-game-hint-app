import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30000,
  use: {
    baseURL: 'http://localhost:5178',
    headless: true,
  },
  webServer: {
    command: 'npx vite --port 5178',
    port: 5178,
    reuseExistingServer: false,
  },
});
