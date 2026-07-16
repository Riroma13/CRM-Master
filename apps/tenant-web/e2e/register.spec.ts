import { test, expect } from '@playwright/test';

test.describe('Client Self-Registration', () => {
  test('registration page shows form fields', async ({ page }) => {
    await page.goto('/registro');
    await expect(page.getByText('Crear cuenta')).toBeVisible();
    await expect(page.locator('input[name="name"]')).toBeVisible();
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });

  test('register with valid data redirects to login with success param', async ({ page }) => {
    const testEmail = `e2e-test-${Date.now()}@example.com`;
    await page.goto('/registro');
    await page.fill('input[name="name"]', 'Test User');
    await page.fill('input[type="email"]', testEmail);
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');

    // On success, should redirect to /login?registered=true
    await expect(page).toHaveURL(/\/login\?registered=true/, { timeout: 15000 });
    // Should show success message
    await expect(page.getByText(/registrada|registrado|Cuenta creada/i).first()).toBeVisible({ timeout: 10000 });
  });

  test('register with existing email shows error', async ({ page }) => {
    // Register once
    const testEmail = `e2e-dup-${Date.now()}@example.com`;
    await page.goto('/registro');
    await page.fill('input[name="name"]', 'First User');
    await page.fill('input[type="email"]', testEmail);
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/login\?registered=true/, { timeout: 15000 });

    // Try registering with same email again
    await page.goto('/registro');
    await page.fill('input[name="name"]', 'Duplicate User');
    await page.fill('input[type="email"]', testEmail);
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');

    // Should show duplicate email error and stay on /registro
    await expect(page.getByText(/registrado|exists/i).first()).toBeVisible({ timeout: 10000 });
    await expect(page).toHaveURL(/\/registro/);
  });
});
