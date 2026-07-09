import { Page } from '@playwright/test';

const ADMIN_EMAIL = 'admin@demo.local';
const ADMIN_PASS = 'password';

export async function loginAsAdmin(page: Page) {
  await page.goto('/login');
  await page.fill('input[type="email"]', ADMIN_EMAIL);
  await page.fill('input[type="password"]', ADMIN_PASS);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/admin/, { timeout: 15000 });
}
