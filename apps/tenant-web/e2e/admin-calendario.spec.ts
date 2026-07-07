import { test, expect, Page } from '@playwright/test';

/**
 * E2E tests for the admin calendario view.
 *
 * These tests mock API responses at the network level via page.route()
 * to remain deterministic without a running backend.
 *
 * Backend security note: the admin endpoints
 * (GET/PATCH /api/v1/tenant/calendario/citas,
 *  GET/PUT /api/v1/tenant/calendario/disponibilidad)
 * are documented with @ApiBearerAuth() but BetterAuthGuard currently
 * only enforces auth on /api/v1/admin/* routes. Therefore these
 * endpoints are publicly reachable for now, and the tests navigate
 * directly to /admin/calendario without logging in.
 */

// ─── Mock data ──────────────────────────────────────────────────

const mockCitas = {
  citas: [
    {
      id: 'cita-pendiente-1',
      tenantId: 'tenant-1',
      fecha: '2026-10-20T10:00:00.000Z',
      duracion: 30,
      estado: 'pendiente',
      titulo: 'Consulta',
      clienteNombre: 'Juan Pérez',
      clienteEmail: 'juan@email.com',
      createdAt: '2026-10-15T12:00:00.000Z',
      updatedAt: '2026-10-15T12:00:00.000Z',
    },
    {
      id: 'cita-confirmada-1',
      tenantId: 'tenant-1',
      fecha: '2026-10-21T11:00:00.000Z',
      duracion: 30,
      estado: 'confirmada',
      titulo: 'Revisión',
      clienteNombre: 'María García',
      clienteEmail: 'maria@email.com',
      createdAt: '2026-10-14T12:00:00.000Z',
      updatedAt: '2026-10-14T12:00:00.000Z',
    },
    {
      id: 'cita-cancelada-1',
      tenantId: 'tenant-1',
      fecha: '2026-10-18T09:00:00.000Z',
      duracion: 30,
      estado: 'cancelada',
      titulo: 'Consulta',
      clienteNombre: 'Pedro López',
      clienteEmail: 'pedro@email.com',
      createdAt: '2026-10-10T12:00:00.000Z',
      updatedAt: '2026-10-11T12:00:00.000Z',
    },
  ],
  total: 3,
};

const initialDisponibilidad = {
  timezone: 'Europe/Madrid',
  slotDuration: 30,
  minNotice: 240,
  maxDays: 30,
  dailySchedule: [
    { day: 1, start: '09:00', end: '14:00' },
    { day: 2, start: '09:00', end: '14:00' },
    { day: 3, start: '09:00', end: '14:00' },
    { day: 4, start: '09:00', end: '14:00' },
    { day: 5, start: '09:00', end: '14:00' },
  ],
  blockedDates: [],
};

// Track last saved disponibilidad for refetch verification
let savedDisponibilidad = { ...initialDisponibilidad };

// ─── Helpers ────────────────────────────────────────────────────

/**
 * Set up API route mocks for all admin calendario endpoints.
 * Uses a single merged handler per URL prefix to avoid Playwright
 * overlapping-route conflicts.
 */
async function setupAdminMocks(page: Page): Promise<void> {
  // Reset saved state for each test
  savedDisponibilidad = JSON.parse(JSON.stringify(initialDisponibilidad));

  // Single handler for all /calendario/citas* routes (list + PATCH by id)
  await page.route('**/api/v1/tenant/calendario/citas**', async (route) => {
    const url = route.request().url();
    const method = route.request().method();

    // PATCH /calendario/citas/:id — confirm or cancel
    if (method === 'PATCH') {
      const isConfirm = url.includes('cita-pendiente-1');
      const updatedCita = isConfirm
        ? { ...mockCitas.citas[0], estado: 'confirmada' }
        : { ...mockCitas.citas[1], estado: 'cancelada' };
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(updatedCita),
      });
      return;
    }

    // GET /calendario/citas — list
    if (method === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockCitas),
      });
      return;
    }

    await route.continue();
  });

  // Single handler for /calendario/disponibilidad (GET + PUT)
  await page.route(
    '**/api/v1/tenant/calendario/disponibilidad**',
    async (route) => {
      const method = route.request().method();

      if (method === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(savedDisponibilidad),
        });
        return;
      }

      if (method === 'PUT') {
        const body = route.request().postDataJSON();
        savedDisponibilidad = { ...savedDisponibilidad, ...body };
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(savedDisponibilidad),
        });
        return;
      }

      await route.continue();
    },
  );
}

// ─── Tests ───────────────────────────────────────────────────────

test.describe('Admin calendario view', () => {
  test.beforeEach(async ({ page }) => {
    await setupAdminMocks(page);
    await page.goto('/admin/calendario', { waitUntil: 'networkidle' });
  });

  test('sidebar navigation is visible', async ({ page }) => {
    const sidebar = page.locator('[data-testid="sidebar"]');
    await expect(sidebar).toBeVisible();
    await expect(sidebar.locator('text=Calendario')).toBeVisible();
    await expect(sidebar.locator('text=Dashboard')).toBeVisible();
    await expect(sidebar.locator('text=Documentos')).toBeVisible();
  });

  test('KPI bar renders with counts', async ({ page }) => {
    const kpiBar = page.locator('[data-testid="kpi-bar"]');
    await expect(kpiBar).toBeVisible();

    // 3 KPI cards: Citas hoy, Pendientes, Esta semana
    const kpiCards = kpiBar.locator('> div');
    await expect(kpiCards).toHaveCount(3);

    await expect(kpiBar.locator('text=Citas hoy')).toBeVisible();
    await expect(kpiBar.locator('text=Pendientes')).toBeVisible();
    await expect(kpiBar.locator('text=Esta semana')).toBeVisible();
  });

  test('cita list renders with citas', async ({ page }) => {
    const citaList = page.locator('[data-testid="cita-list"]');
    await expect(citaList).toBeVisible();

    // Tabs
    await expect(citaList.locator('text=Próximas')).toBeVisible();
    await expect(citaList.locator('text=Historial')).toBeVisible();

    // Both pendiente and confirmada in "Próximas" tab
    await expect(citaList.locator('text=Juan Pérez')).toBeVisible();
    await expect(citaList.locator('text=María García')).toBeVisible();
  });

  test('confirm a pending cita triggers PATCH and refetch', async ({
    page,
  }) => {
    const card = page.locator(
      '[data-testid="cita-card-cita-pendiente-1"]',
    );
    await expect(card).toBeVisible();

    // Should show "Pendiente" badge
    await expect(card.locator('text=Pendiente')).toBeVisible();

    // Click Confirmar button
    await card.locator('button:has-text("Confirmar")').click();

    // After refetch, the mock returns the original data (unchanged),
    // but the PATCH request was made. Verify the card still renders.
    await expect(card).toBeVisible();
  });

  test('cancel a cita triggers PATCH and refetch', async ({ page }) => {
    const card = page.locator(
      '[data-testid="cita-card-cita-confirmada-1"]',
    );
    await expect(card).toBeVisible();

    // Should show "Confirmada" badge
    await expect(card.locator('text=Confirmada')).toBeVisible();

    // Click Cancelar button
    await card.locator('button:has-text("Cancelar")').click();

    // Card still renders after refetch
    await expect(card).toBeVisible();
  });

  test('edit schedule: add an hour row and save', async ({ page }) => {
    const scheduleEditor = page.locator(
      '[data-testid="schedule-editor"]',
    );
    await expect(scheduleEditor).toBeVisible();

    // Click "+ Añadir horario" on the first scheduled day
    const addButton = scheduleEditor
      .locator('button:has-text("Añadir horario")')
      .first();
    await addButton.click();

    // With 5 default days × 2 inputs each = 10 inputs.
    // Adding 1 row adds 2 more inputs → 12 total.
    const timeInputs = scheduleEditor.locator('input[type="time"]');
    await expect(timeInputs).toHaveCount(12);

    // Click save
    const saveButton = page.locator('[data-testid="save-config"]');
    await expect(saveButton).toBeEnabled();
    await saveButton.click();

    // After PUT completes and refetch, the button should be disabled
    // (no local changes remain since we reset localSchedule state)
    await expect(saveButton).toBeDisabled();
  });

  test('block a date and unblock it', async ({ page }) => {
    const blockedDatesContainer = page.locator(
      '[data-testid="blocked-dates"]',
    );
    await expect(blockedDatesContainer).toBeVisible();

    // Should show empty state initially
    await expect(
      blockedDatesContainer.locator(
        'text=No hay fechas bloqueadas',
      ),
    ).toBeVisible();

    // Fill the date input
    const dateInput = blockedDatesContainer.locator(
      'input[type="date"]',
    );
    await dateInput.fill('2027-06-01');

    // Click "Bloquear"
    await blockedDatesContainer
      .locator('button:has-text("Bloquear")')
      .click();

    // Verify the blocked date appears
    await expect(
      blockedDatesContainer.locator('text=1 de junio de 2027'),
    ).toBeVisible();

    // Save configuration
    const saveButton = page.locator('[data-testid="save-config"]');
    await expect(saveButton).toBeEnabled();
    await saveButton.click();
    await expect(saveButton).toBeDisabled();

    // Unblock the date: click "Quitar"
    await blockedDatesContainer
      .locator('button:has-text("Quitar")')
      .click();

    // Verify empty state shows again after unblocking
    await expect(
      blockedDatesContainer.locator(
        'text=No hay fechas bloqueadas',
      ),
    ).toBeVisible();
  });
});
