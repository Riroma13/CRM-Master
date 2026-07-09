import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers';

test.describe('Booking & Calendario', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('admin calendario shows KPIs and config', async ({ page }) => {
    await page.goto('/admin/calendario');
    await expect(page.getByRole('heading', { name: 'Calendario', exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Configuración' })).toBeVisible();
  });

  test('booking page loads with calendar', async ({ page }) => {
    await page.goto('/calendario');
    await expect(page.getByText('Agenda una cita')).toBeVisible();
  });
});
