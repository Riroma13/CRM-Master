import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers';

test.describe('Module registry & Onboarding', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('modules page shows all available modules', async ({ page }) => {
    await page.goto('/admin/modules');
    await expect(page.getByRole('heading', { name: 'Módulos', exact: true })).toBeVisible();
    // Check module cards exist (their description text is unique)
    await expect(page.getByText('Panel principal con KPIs')).toBeVisible();
    await expect(page.getByText('Gestión de clientes, contactos')).toBeVisible();
    await expect(page.getByText('Gestión de incidencias, tickets')).toBeVisible();
  });

  test('onboarding page shows form', async ({ page }) => {
    await page.goto('/admin/onboarding');
    await expect(page.getByRole('heading', { name: 'Onboarding', exact: true })).toBeVisible();
    await expect(page.getByText('Crear tenant')).toBeVisible();
    await expect(page.getByText('Nombre del negocio')).toBeVisible();
  });
});
