import { test, expect } from '@playwright/test';

test.describe('Login — Admin & Client dispatch', () => {
  test('login page shows admin and client tabs', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByText('Admin')).toBeVisible();
    await expect(page.getByText('Cliente')).toBeVisible();
    await expect(page.getByText('CRM-Master')).toBeVisible();
  });

  test('admin login redirects to /admin', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', 'admin@demo.local');
    await page.fill('input[type="password"]', 'password');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/admin/, { timeout: 15000 });
  });

  test('client login redirects to /portal', async ({ page }) => {
    await page.goto('/login');
    await page.getByText('Cliente').click();
    await page.fill('input[type="email"]', 'cliente@test.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/portal/, { timeout: 15000 });
  });

  test('invalid credentials show error and stay on /login', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', 'wrong@email.com');
    await page.fill('input[type="password"]', 'wrongpass');
    await page.click('button[type="submit"]');
    // Should show an error — check that we stay on /login
    await expect(page.locator('form').getByText(/credenciales|inválidas|Error|válido/i).first()).toBeVisible({ timeout: 10000 });
    await expect(page).toHaveURL(/\/login/);
  });
});

test.describe('Portal SSR protection', () => {
  test('/portal redirects to /login without session', async ({ page }) => {
    await page.goto('/portal');
    await expect(page).toHaveURL(/\/login/);
  });

  test('/portal/my-appointments redirects to /login without session', async ({ page }) => {
    await page.goto('/portal/my-appointments');
    await expect(page).toHaveURL(/\/login/);
  });

  test('/portal/my-documents redirects to /login without session', async ({ page }) => {
    await page.goto('/portal/my-documents');
    await expect(page).toHaveURL(/\/login/);
  });
});
