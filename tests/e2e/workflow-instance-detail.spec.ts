import { test, expect } from '@playwright/test';
import { DbHelper } from './db.helper';

const BASE_URL = 'http://localhost:4200';
const TEST_USER = { email: 'admin@example.com', password: 'password123' };

async function login(page: any) {
  await page.goto(BASE_URL, { waitUntil: 'networkidle' });
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  await page.goto(BASE_URL, { waitUntil: 'networkidle' });
  
  // Fill login form
  await page.locator('input[type="email"], input[name="email"]').fill(TEST_USER.email);
  await page.locator('input[type="password"]').fill(TEST_USER.password);
  await page.locator('button[type="submit"]').click();
  
  // Wait for navigation after login
  await page.waitForURL(/\/(dashboard|workflows)/, { timeout: 10000 });
}


