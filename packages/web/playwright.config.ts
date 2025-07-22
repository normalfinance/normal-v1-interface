import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 30 * 1000,
  fullyParallel: true,
  expect: {
    timeout: 5000,
  },
  
  use: {
    baseURL: process.env.PW_BASE_URL || 'http://localhost:8082',
    trace: 'on-first-retry',
    video: 'on',
  },
  webServer: {
    command: 'yarn dev -p 8082',
    port: 8082,
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
