import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers';

test.describe('Modules CRUD', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('Tareas page renders', async ({ page }) => {
    await page.goto('/admin/tareas');
    await expect(page.getByRole('heading', { name: 'Tareas', exact: true })).toBeVisible();
  });

  test('Sistemas page renders', async ({ page }) => {
    await page.goto('/admin/sistemas');
    await expect(page.getByRole('heading', { name: 'Sistemas', exact: true })).toBeVisible();
  });

  test('Recursos page renders', async ({ page }) => {
    await page.goto('/admin/recursos');
    await expect(page.getByRole('heading', { name: 'Recursos', exact: true })).toBeVisible();
  });

  test('Incidencias page renders', async ({ page }) => {
    await page.goto('/admin/incidencias');
    await expect(page.getByRole('heading', { name: 'Incidencias', exact: true })).toBeVisible();
  });

  test('Documentos page renders', async ({ page }) => {
    await page.goto('/admin/documentos');
    await expect(page.getByRole('heading', { name: 'Documentos', exact: true })).toBeVisible();
  });

  test('Perfil shows business info', async ({ page }) => {
    await page.goto('/admin/perfil');
    await expect(page.getByRole('heading', { name: 'Perfil del negocio' })).toBeVisible();
    await expect(page.getByText('Nombre del negocio')).toBeVisible();
  });

  test('Dashboard shows KPIs', async ({ page }) => {
    await page.goto('/admin');
    await expect(page.getByRole('heading', { name: 'Dashboard', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Actualizar' })).toBeVisible();
  });
});
