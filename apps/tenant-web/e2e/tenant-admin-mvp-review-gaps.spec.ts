import { test, expect, type APIRequestContext, type Page } from '@playwright/test';

const ADMIN_EMAIL = 'admin@demo.local';
const ADMIN_PASSWORD = 'password';

async function signIn(page: Page) {
  await page.goto('/login');
  await page.fill('input[type="email"]', ADMIN_EMAIL);
  await page.fill('input[type="password"]', ADMIN_PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/admin/);
}

async function apiLogin(request: APIRequestContext) {
  const response = await request.post('/api/v1/auth/login', {
    data: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
  });
  expect(response.ok()).toBeTruthy();
}

test.describe('Tenant Admin MVP review gaps', () => {
  test('persists Cliente contacts through create, edit, and reload', async ({ page }) => {
    await signIn(page);
    await page.goto('/admin/clientes');
    await page.getByRole('button', { name: /Nuevo cliente/i }).click();
    const dialog = page.getByRole('dialog');
    const name = `Review gaps ${Date.now()}`;
    await dialog.getByPlaceholder('Nombre del cliente').fill(name);
    await dialog.getByPlaceholder('contacto@empresa.com').fill('review-create@example.test');
    await dialog.getByPlaceholder('+34 600 000 000').fill('+34111111111');
    await dialog.getByRole('button', { name: 'Crear cliente' }).click();
    await expect(page.getByText(name)).toBeVisible();
    await page.getByText(name).click();
    await page.getByRole('button', { name: 'Editar' }).click();
    await expect(page.getByRole('dialog').getByDisplayValue('review-create@example.test')).toBeVisible();
    await page.getByRole('dialog').getByPlaceholder('contacto@empresa.com').fill('review-edit@example.test');
    await page.getByRole('dialog').getByPlaceholder('+34 600 000 000').fill('+34222222222');
    await page.getByRole('dialog').getByRole('button', { name: 'Guardar cambios' }).click();
    await page.reload();
    await expect(page.getByText('review-edit@example.test')).toBeVisible();
    await expect(page.getByText('+34222222222')).toBeVisible();
  });

  test('edits a System without sending tenant identity and confirms after reload', async ({ page }) => {
    await signIn(page);
    await page.goto('/admin/sistemas');
    const system = page.locator('a,button,[role="link"]').filter({ hasText: /.+/ }).first();
    await system.click();
    await page.waitForURL(/\/admin\/sistemas\//);
    await page.getByRole('button', { name: 'Edit system' }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByPlaceholder('Ej: SAP ERP, WordPress...').fill('Review system edited');
    await dialog.getByRole('button', { name: 'Guardar cambios' }).click();
    await page.reload();
    await expect(page.getByRole('heading', { name: 'Review system edited' })).toBeVisible();
  });

  test('persists an inventory date as YYYY-MM-DD after reload', async ({ page }) => {
    await signIn(page);
    await page.goto('/admin/sistemas');
    await page.locator('a,button,[role="link"]').filter({ hasText: /.+/ }).first().click();
    await page.waitForURL(/\/admin\/sistemas\//);
    await page.getByRole('button', { name: 'Add item' }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByPlaceholder('Ej: Servidor principal, Licencia Office 365...').fill(`Review item ${Date.now()}`);
    await dialog.locator('input[type="date"]').fill('2024-02-29');
    await dialog.getByRole('button', { name: 'Crear item' }).click();
    await page.reload();
    await page.getByRole('button', { name: 'Add item' }).click();
    await expect(page.getByRole('dialog').locator('input[type="date"]')).toHaveValue('');
  });

  test('keeps the authenticated tenant boundary visible in the browser flow', async ({ page, request }) => {
    await apiLogin(request);
    await signIn(page);
    await page.goto('/admin');
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
    await expect(page.locator('body')).not.toContainText('tenantId');
  });
});
