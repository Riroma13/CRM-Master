import { test, expect, type Page } from '@playwright/test';
import { loginAsAdmin } from './helpers';

// Test harness stubs replace only unavailable existing read/auth responses; the app never uses them.
async function installTestHarnessStubs(page: Page) {
  await page.route('**/api/v1/auth/login', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      headers: { 'set-cookie': '__Secure-session=test-session; Path=/; Secure' },
      body: JSON.stringify({
        id: 'admin-1',
        email: 'admin@demo.local',
        name: 'Admin',
        role: 'admin',
        tenant: { id: 'tenant-1', slug: 'demo', name: 'Demo' },
        session: { token: 'session-token', expiresAt: '2099-01-01T00:00:00.000Z' },
      }),
    });
  });

  await page.route('**/admin**', async (route) => {
    if (!new URL(route.request().url()).pathname.startsWith('/admin')) {
      await route.continue();
      return;
    }
    await route.continue({
      headers: { ...route.request().headers(), cookie: '__Secure-session=test-session' },
    });
  });

  await page.route('**/api/v1/tenant/dashboard', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        totalClientes: 4,
        clientesActivos: 3,
        citasHoy: 2,
        citasPendientes: 1,
        citasSemana: 5,
        tareasPendientes: 2,
        sistemasActivos: 1,
        eventosRecientes: [{ id: 'event-1', fecha: '2026-08-31T10:00:00.000Z', tipo: 'task', titulo: 'Task updated' }],
      }),
    });
  });

  await page.route('**/api/v1/tenant/sistemas', async (route) => {
    if (new URL(route.request().url()).pathname.endsWith('/sistemas')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([{ id: 'system-1', nombreSistema: 'Billing', tipo: 'Web', estadoTecnico: 'Operational', entorno: 'Production', version: '1.2.0', cliente: { id: 'client-1', nombre: 'Acme' }, _count: { items: 2 } }]),
      });
      return;
    }
    await route.continue();
  });

  await page.route('**/api/v1/tenant/sistemas/system-1', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: 'system-1',
        nombreSistema: 'Billing',
        tipo: 'Web',
        entorno: 'Production',
        version: '1.2.0',
        estadoTecnico: 'Operational',
        cliente: { id: 'client-1', nombre: 'Acme' },
        items: [{ id: 'item-1', nombre: 'Primary database', categoria: 'Database', estado: 'Healthy' }],
      }),
    });
  });

  await page.route('**/api/v1/tenant/tareas', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([{ id: 'task-1', titulo: 'Review billing', estado: 'Pendiente', prioridad: 'Alta', fechaLimite: '2026-09-15T00:00:00.000Z', cliente: { id: 'client-1', nombre: 'Acme' } }]),
    });
  });

  await page.route('**/api/v1/tenant/tareas/task-1', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ id: 'task-1', tenantId: 'tenant-1', clienteId: 'client-1', sistemaId: 'system-1', titulo: 'Review billing', estado: 'Pendiente', prioridad: 'Alta', fechaLimite: '2026-09-15T00:00:00.000Z', cliente: { id: 'client-1', nombre: 'Acme' } }),
    });
  });
}

test.describe('CRM Client frontend phase 1 restart', () => {
  test('login entry remains available and unauthenticated admin access redirects', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByText('CRM-Master')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Iniciar sesión' })).toBeVisible();

    await page.goto('/admin');
    await expect(page).toHaveURL(/\/login/);
  });

  test('desktop shell navigates across the implemented screens', async ({ page }) => {
    await installTestHarnessStubs(page);
    await loginAsAdmin(page);
    await expect(page.getByRole('heading', { name: 'Overview', exact: true })).toBeVisible();

    await page.getByRole('link', { name: 'Sistemas', exact: true }).click();
    await expect(page).toHaveURL(/\/admin\/sistemas$/);
    await expect(page.getByRole('heading', { name: 'Systems', exact: true })).toBeVisible();

    await page.getByRole('link', { name: 'Tareas', exact: true }).click();
    await expect(page).toHaveURL(/\/admin\/tareas$/);
    await expect(page.getByRole('heading', { name: 'Tasks', exact: true })).toBeVisible();
  });

  test('mobile drawer opens, closes through overlay and Escape, and keeps navigation usable', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await installTestHarnessStubs(page);
    await loginAsAdmin(page);
    await expect(page.getByRole('heading', { name: 'Overview', exact: true })).toBeVisible();

    const menu = page.getByRole('button', { name: 'Abrir menú' });
    await menu.click();
    await expect(page.getByTestId('drawer-overlay')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Cerrar menú' })).toBeVisible();

    await page.getByTestId('drawer-overlay').click({ position: { x: 380, y: 400 } });
    await expect(page.getByTestId('drawer-overlay')).toBeHidden();

    await menu.click();
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('drawer-overlay')).toBeHidden();

    await menu.click();
    await page.getByRole('link', { name: 'Tareas', exact: true }).last().click();
    await expect(page).toHaveURL(/\/admin\/tareas$/);
    await expect(page.getByRole('heading', { name: 'Tasks', exact: true })).toBeVisible();
  });

  test('implemented pages expose structured content and supported detail links', async ({ page }) => {
    await installTestHarnessStubs(page);
    await loginAsAdmin(page);

    await page.goto('/admin/sistemas');
    await expect(page.getByRole('heading', { name: 'Systems', exact: true })).toBeVisible();
    await expect(page.getByRole('table', { name: 'Systems' })).toBeVisible();
    await page.getByRole('link', { name: 'Billing' }).click();
    await expect(page).toHaveURL(/\/admin\/sistemas\/system-1$/);
    await expect(page.getByRole('heading', { name: 'Billing', exact: true })).toBeVisible();
    await expect(page.getByRole('region', { name: 'Inventory', exact: true }).getByRole('cell', { name: 'Primary database', exact: true })).toBeVisible();

    await page.goto('/admin/tareas');
    await expect(page.getByRole('heading', { name: 'Tasks', exact: true })).toBeVisible();
    const taskLinks = page.locator('a[href^="/admin/tareas/"]');
    await expect(taskLinks.first()).toHaveAttribute('href', /\/admin\/tareas\/task-1$/);
    await taskLinks.first().click();
    await expect(page).toHaveURL(/\/admin\/tareas\/task-1$/);
    await expect(page.getByRole('heading', { name: 'Review billing', exact: true })).toBeVisible();
    await expect(page.getByText('Acme')).toBeVisible();
  });
});
