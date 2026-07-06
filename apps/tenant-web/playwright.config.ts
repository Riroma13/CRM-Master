import { defineConfig } from '@playwright/test';
import { config } from 'dotenv';

// Load .env.test if present, otherwise .env.local
config({ path: '.env.test' });

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  retries: 1,
  workers: 1,
  reporter: 'list',
  timeout: 30_000,

  use: {
    baseURL: process.env.TENANT_WEB_URL || 'http://localhost:3001',
    trace: 'on-first-retry',
  },

  projects: [
    {
      name: 'setup',
      testMatch: /.*\.setup\.ts/,
    },
    {
      name: 'chromium',
      use: {
        browserName: 'chromium',
        storageState: './e2e/.auth/tenant-admin.json',
      },
      dependencies: ['setup'],
    },
  ],
});
