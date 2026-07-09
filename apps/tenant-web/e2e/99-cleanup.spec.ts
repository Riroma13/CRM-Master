import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers';

test.describe('Cleanup', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('restore test state', async ({ page }) => {
    // Navigate to modules to ensure Sistemas is enabled
    await page.goto('/admin/modules');
    await expect(page.getByRole('heading', { name: 'Módulos', exact: true })).toBeVisible();
  });
});
