import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  retries: 0,
  reporter: [
    ['list'],
    ['html', { outputFolder: 'e2e/playwright-report', open: 'never' }],
    ['junit', { outputFile: 'e2e/results.xml' }],
  ],
  use: {
    baseURL: 'http://localhost:3000',
    screenshot: 'on',
    video: 'off',
    trace: 'on',
    viewport: { width: 1440, height: 900 },
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  outputDir: 'e2e/test-results',
});
