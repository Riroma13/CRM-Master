import { test, expect } from '@playwright/test';

test.describe('Login — Admin & Client dispatch', () => {
  test('login page shows admin and client tabs', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('tab', { name: 'Admin' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Cliente' })).toBeVisible();
    await expect(page.getByText('CRM-Master')).toBeVisible();
  });

  test('admin login redirects to /admin', async ({ page }) => {
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
    await page.goto('/login');
    await page.fill('input[type="email"]', 'admin@demo.local');
    await page.fill('input[type="password"]', 'password');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/admin/, { timeout: 15000 });
  });

  test('client login redirects to /portal', async ({ page }) => {
    await page.route('**/api/v1/client/auth/login', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: {
          'set-cookie': 'client-session=eyJhbGciOiJub25lIn0.eyJyb2xlIjoiY2xpZW50In0.; Path=/',
        },
        body: JSON.stringify({ cliente: { nombre: 'Client' } }),
      });
    });
    await page.goto('/login');
    await page.getByRole('tab', { name: 'Cliente' }).click();
    await page.fill('input[type="email"]', 'cliente@test.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/portal/, { timeout: 15000 });
  });

  test('invalid credentials show error and stay on /login', async ({ page }) => {
    await page.route('**/api/v1/auth/login', async (route) => {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Credenciales inválidas' }),
      });
    });
    await page.goto('/login');
    await page.fill('input[type="email"]', 'wrong@email.com');
    await page.fill('input[type="password"]', 'wrongpass');
    await page.click('button[type="submit"]');
    // Should show an error — check that we stay on /login
    await expect(page.locator('form').getByText(/credenciales|inválidas|Error|válido|Request failed/i).first()).toBeVisible({ timeout: 10000 });
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

test.describe('Google OAuth integration', () => {
  test('admin initiation redirects through Better Auth without exposing credentials', async ({ page }) => {
    let requestedUrl: URL | undefined;

    await page.route('**/api/auth/sign-in/social**', async (route) => {
      requestedUrl = new URL(route.request().url());
      await route.fulfill({
        status: 302,
        headers: { location: '/login?error=oauth_failed' },
      });
    });

    await page.goto('/login');
    await page.getByRole('button', { name: 'Continuar con Google' }).click();
    await expect(page).toHaveURL(/\/login\?error=oauth_failed/);

    expect(requestedUrl?.searchParams.get('provider')).toBe('google');
    expect(requestedUrl?.searchParams.get('callbackURL')).toBe('/admin');
    expect(requestedUrl?.search).not.toMatch(/password|token|secret|code/i);
  });

  test('OAuth callback failure stays generic and does not create an admin session', async ({ page }) => {
    await page.goto('/login?error=oauth_failed');

    await expect(page).toHaveURL(/\/login\?error=oauth_failed/);
    await expect(page.getByRole('button', { name: 'Continuar con Google' })).toBeVisible();
    expect(await page.evaluate(() => sessionStorage.getItem('crm_session_token'))).toBeNull();
  });

  test('admin password login remains available after OAuth failure', async ({ page }) => {
    await page.route('**/api/v1/auth/login', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: { 'set-cookie': '__Secure-session=test-session; Path=/; Secure' },
        body: JSON.stringify({
          id: 'admin-1',
          email: 'admin@example.com',
          name: 'Admin',
          role: 'admin',
          tenant: { id: 'tenant-1', slug: 'demo', name: 'Demo' },
          session: { token: 'session-token', expiresAt: '2099-01-01T00:00:00.000Z' },
        }),
      });
    });

    await page.goto('/login?error=oauth_failed');
    await page.fill('input[type="email"]', 'admin@example.com');
    await page.fill('input[type="password"]', 'password');
    await page.getByRole('button', { name: 'Iniciar sesión' }).click();

    await expect(page).toHaveURL(/\/admin/);
  });

  test('client login excludes Google initiation and preserves portal routing', async ({ page }) => {
    await page.route('**/api/v1/client/auth/login', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: {
          'set-cookie': 'client-session=eyJhbGciOiJub25lIn0.eyJyb2xlIjoiY2xpZW50In0.; Path=/',
        },
        body: JSON.stringify({ cliente: { nombre: 'Client' } }),
      });
    });

    await page.goto('/login');
    await page.getByRole('tab', { name: 'Cliente' }).click();
    await expect(page.getByRole('button', { name: 'Continuar con Google' })).toHaveCount(0);
    await page.fill('input[type="email"]', 'client@example.com');
    await page.fill('input[type="password"]', 'password');
    await page.getByRole('button', { name: 'Iniciar sesión' }).click();

    await expect(page).toHaveURL(/\/portal/);
  });
});
