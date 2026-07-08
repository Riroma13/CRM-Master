import { test as setup } from '@playwright/test';
import path from 'path';

const AUTH_FILE = path.join(__dirname, '.auth', 'tenant-admin.json');

/**
 * Setup file for the calendario/booking Playwright tests.
 *
 * Navigates to the tenant calendario page to establish a baseline session.
 * For the public booking flow (no auth required), this saves a minimal
 * storage state so the test project has one to load.
 */
setup('navigate to tenant calendario page', async ({ page }) => {
  // Navigate to the public calendario page
  // The page may not be fully implemented yet — this setup ensures
  // the test runner has a valid storage state file.
  await page.goto('/calendario', { waitUntil: 'networkidle' }).catch(() => {
    // If the page doesn't exist yet (Phase 3 frontend pending),
    // create an empty storage state so the test project can still run.
  });

  // Save storage state for downstream tests
  await page.context().storageState({ path: AUTH_FILE });
});
