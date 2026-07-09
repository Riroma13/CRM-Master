import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers';

test.describe('Clientes CRUD', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('list page loads and shows heading', async ({ page }) => {
    await page.goto('/admin/clientes');
    await expect(page.getByRole('heading', { name: 'Clientes', exact: true })).toBeVisible();
  });

  test('create client via modal', async ({ page }) => {
    await page.goto('/admin/clientes');
    // Click the "Nuevo cliente" button in the header
    await page.locator('button').filter({ hasText: 'Nuevo cliente' }).click();
    await page.waitForTimeout(300);
    await expect(page.getByText('Nombre *')).toBeVisible();
    await page.fill('input[placeholder="Nombre del cliente"]', 'Playwright Test');
    await page.fill('input[placeholder*="Asesoría"]', 'E2E Testing');
    // Click submit inside the dialog
    await page.locator('[role="dialog"] button').filter({ hasText: 'Crear cliente' }).click();
    await page.waitForTimeout(2000);
    // Check for success toast or that the client appears
    const toast = page.getByText(/creado|correctamente/);
    if (await toast.isVisible().catch(() => false)) {
      await expect(toast).toBeVisible({ timeout: 5000 });
    }
    await expect(page.getByText('Playwright Test')).toBeVisible({ timeout: 5000 });
  });

  test('client card navigates to detail', async ({ page }) => {
    await page.goto('/admin/clientes');
    const card = page.getByText('Test E2E').first();
    if (await card.isVisible()) {
      await card.click();
      await page.waitForURL(/\/admin\/clientes\//);
      await expect(page.getByRole('heading', { name: 'Test E2E' })).toBeVisible();
    }
  });
});
