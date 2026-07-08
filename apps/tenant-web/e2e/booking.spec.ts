import { test, expect, Page } from '@playwright/test';

/**
 * E2E tests for the public calendario/booking flow.
 *
 * These tests mock API responses at the network level via page.route()
 * to remain deterministic without a running backend. To run against
 * real services, remove the route mocks and ensure both the API and
 * tenant-web are running (see playwright.config.ts baseURL).
 *
 * Dates use a far-future reference (2027-01-15) to avoid flakiness
 * from disabled past dates in the CalendarPicker.
 */

const FUTURE_DATE = '2027-01-15';

// ─── Mock data ──────────────────────────────────────────────────

const mockSlots = [
  { start: '2027-01-15T09:00:00.000Z', end: '2027-01-15T09:30:00.000Z', available: true },
  { start: '2027-01-15T09:30:00.000Z', end: '2027-01-15T10:00:00.000Z', available: true },
  { start: '2027-01-15T10:00:00.000Z', end: '2027-01-15T10:30:00.000Z', available: true },
];

const mockCreatedCita = {
  id: 'e2e-cita-001',
  tenantId: 'tenant-1',
  fecha: '2027-01-15T09:00:00.000Z',
  duracion: 30,
  estado: 'pendiente',
  titulo: 'Consulta',
  clienteNombre: 'E2E Test User',
  clienteEmail: 'e2e@test.com',
  createdAt: '2027-01-10T12:00:00.000Z',
  updatedAt: '2027-01-10T12:00:00.000Z',
};

// ─── Helpers ────────────────────────────────────────────────────

/**
 * Set up API route mocks so tests don't require a running backend.
 */
async function setupApiMocks(page: Page): Promise<void> {
  // Mock slots endpoint (captures any fecha query param)
  await page.route('**/api/v1/tenant/calendario/slots*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(mockSlots),
    });
  });

  // Mock create cita endpoint
  await page.route('**/api/v1/tenant/calendario/citas', async (route) => {
    if (route.request().method() === 'POST') {
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify(mockCreatedCita),
      });
    } else {
      await route.continue();
    }
  });
}

/**
 * Navigate the CalendarPicker to a far-future month (January 2027)
 * and select the first available day.
 */
async function selectFutureDate(page: Page): Promise<void> {
  // Navigate to January 2027 by clicking "next month" from current month
  const now = new Date();
  const targetYear = 2027;
  const targetMonth = 0; // January (0-indexed)

  let clicks =
    (targetYear - now.getFullYear()) * 12 + (targetMonth - now.getMonth());
  if (clicks <= 0) clicks = 12; // Ensure we always go forward

  for (let i = 0; i < clicks; i++) {
    await page.click('[aria-label="Mes siguiente"]');
  }

  // Click the first non-disabled day button in the grid
  const dayButton = page
    .locator('[role="gridcell"] button:not([disabled])')
    .first();
  await dayButton.click();
}

// ─── Tests ───────────────────────────────────────────────────────

test.describe('Public booking flow', () => {
  test('full booking flow: calendar → slots → form → confirmation', async ({
    page,
  }) => {
    await setupApiMocks(page);
    await page.goto('/calendario', { waitUntil: 'networkidle' });

    // Step 1: Verify CalendarPicker is visible
    const calendarPicker = page.locator('[data-testid="calendar-picker"]');
    await expect(calendarPicker).toBeVisible();

    // Step 2: Select a far-future date
    await selectFutureDate(page);

    // Step 3: Verify slots appear
    const slotList = page.locator('[data-testid="slot-list"]');
    await expect(slotList).toBeVisible();
    const slotButtons = slotList.locator('button');
    await expect(slotButtons.first()).toBeVisible();

    // Step 4: Select a slot
    await slotButtons.first().click();

    // Step 5: Verify BookingForm appears
    const bookingForm = page.locator('[data-testid="booking-form"]');
    await expect(bookingForm).toBeVisible();

    // Step 6: Fill form and submit
    await page.fill('#clienteNombre', 'E2E Test User');
    await page.fill('#clienteEmail', 'e2e@test.com');
    await page.click('button[type="submit"]');

    // Step 7: Verify BookingConfirmation shows with cita details
    const confirmation = page.locator(
      '[data-testid="booking-confirmation"]',
    );
    await expect(confirmation).toBeVisible();
    await expect(
      confirmation.locator('text=Cita confirmada'),
    ).toBeVisible();
    await expect(
      confirmation.locator('text=E2E Test User'),
    ).toBeVisible();
    await expect(
      confirmation.locator('text=e2e@test.com'),
    ).toBeVisible();
    await expect(
      confirmation.locator('text=e2e-cita-001'),
    ).toBeVisible();
  });
});
