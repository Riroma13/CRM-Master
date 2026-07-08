import { test as setup } from '@playwright/test';
import path from 'path';

const AUTH_FILE = path.join(__dirname, '.auth', 'tenant-admin.json');

/**
 * Setup file for the calendario/booking Playwright tests.
 *
 * Since the public booking flow requires no authentication, this setup
 * simply navigates to a known-working page and saves an empty storage
 * state so the test project has one to load.
 */
setup('create empty storage state', async ({ page }) => {
  // Navigate to a page that exists to prime the storage state
  await page.goto('/calendario', { waitUntil: 'networkidle' }).catch(() => {
    // If the page isn't reachable yet, create an empty state anyway
  });

  // Ensure the .auth directory exists by saving storage state
  await page.context().storageState({ path: AUTH_FILE });
});
