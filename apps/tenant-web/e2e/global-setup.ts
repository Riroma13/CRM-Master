import { chromium, type FullConfig } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

async function globalSetup(config: FullConfig) {
  const authDir = path.resolve('.auth');
  if (!fs.existsSync(authDir)) fs.mkdirSync(authDir, { recursive: true });

  const browser = await chromium.launch();
  const page = await browser.newPage({ baseURL: 'https://crm-master.duckdns.org' });

  await page.goto('/login');
  await page.fill('input[type="email"]', 'admin@demo.local');
  await page.fill('input[type="password"]', 'password');
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/admin/, { timeout: 15000 });

  await page.context().storageState({ path: path.join(authDir, 'admin.json') });
  await browser.close();
}

export default globalSetup;
