import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers';

test.describe('Login & Auth', () => {
  test('login page renders correctly', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByText('CRM-Master')).toBeVisible();
    await expect(page.getByText('Portal del cliente')).toBeVisible();
    await expect(page.getByText('Iniciar sesión')).toBeVisible();
  });

  test('successful login redirects to admin', async ({ page }) => {
    await loginAsAdmin(page);
    await expect(page.getByRole('heading', { name: 'Dashboard', exact: true })).toBeVisible();
  });

  test('invalid credentials shows error', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', 'wrong@email.com');
    await page.fill('input[type="password"]', 'wrongpass');
    await page.click('button[type="submit"]');
    // Should show an error message — either from API or client-side validation
    await expect(page.locator('form').getByText(/credenciales|inválidas|Error|válido/i).first()).toBeVisible({ timeout: 10000 });
  });

  test('admin pages redirect to login without session', async ({ page }) => {
    await page.goto('/admin');
    await expect(page).toHaveURL(/\/login/);
  });
});
