import { test, expect } from '@playwright/test';

test.describe('Landing pages', () => {
  test('home page shows all vertical links', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: /portal de gestión/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Asesoría fiscal', exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Salud & Estética', exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Educación', exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Acceder' })).toBeVisible();
  });

  test('fiscal landing uses correct vocabulary', async ({ page }) => {
    await page.goto('/fiscal');
    await expect(page.getByRole('heading', { name: /asesoría fiscal/i })).toBeVisible();
    await expect(page.getByText('Gestión de clientes')).toBeVisible();
    await expect(page.getByText('Agenda de consultas')).toBeVisible();
    await expect(page.getByText('Expedientes digitales')).toBeVisible();
  });

  test('salud landing uses correct vocabulary', async ({ page }) => {
    await page.goto('/salud-estetica');
    await expect(page.getByRole('heading', { name: /salud o estética/i })).toBeVisible();
    await expect(page.getByText('Reserva online 24/7')).toBeVisible();
    await expect(page.getByText('Cada profesional con su propia agenda')).toBeVisible();
    await expect(page.getByText('Recordatorio 24h antes')).toBeVisible();
  });

  test('educacion landing uses correct vocabulary', async ({ page }) => {
    await page.goto('/educacion');
    await expect(page.locator('h1').first()).toContainText(/centro educativo/i);
    await expect(page.getByText('Ficha por alumno')).toBeVisible();
    await expect(page.getByText('reserva tutoría con el profesor')).toBeVisible();
    await expect(page.getByText('incidencias de convivencia')).toBeVisible();
  });

  test('navigation between verticals works', async ({ page }) => {
    await page.goto('/fiscal');
    await page.getByText('Salud & Estética').click();
    await expect(page).toHaveURL(/\/salud-estetica/);
    await expect(page.getByRole('heading', { name: /salud o estética/i })).toBeVisible();
  });
});
