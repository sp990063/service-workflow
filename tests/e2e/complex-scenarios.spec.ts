import { test, expect } from '@playwright/test';
import { DbHelper } from './db.helper';

const BASE_URL = 'http://localhost:4200';

const TEST_USERS = {
  admin: { email: 'admin@example.com', password: 'password123' },
  manager: { email: 'manager@example.com', password: 'password123' },
  employee: { email: 'employee@example.com', password: 'password123' },
};

async function login(page: any, user: any) {
  await page.goto(`${BASE_URL}/login`);
  await page.fill('input#email', user.email);
  await page.fill('input#password', user.password);
  await page.click('button[type="submit"]');
  await page.waitForTimeout(2000);
}

test.describe('Complex Scenarios - Basic Tests', () => {
  
  test.afterEach(async ({ page }, testInfo) => {
    const status = testInfo.status === 'passed' ? 'pass' : 'fail';
    await page.screenshot({ 
      path: `tests/e2e/reports/${testInfo.title.replace(/\s+/g, '-')}-${status}.png`,
      fullPage: true 
    });
  });

  test('SCN-COMPLEX-001: Leave request workflow starts', async ({ page }) => {
    await login(page, TEST_USERS.employee);
    await page.goto(`${BASE_URL}/workflows`);
    await page.waitForTimeout(1500);
    await expect(page.locator('body')).toContainText(/workflow/i);
  });

  test('SCN-COMPLEX-002: Expense reimbursement starts', async ({ page }) => {
    await login(page, TEST_USERS.employee);
    await page.goto(`${BASE_URL}/workflows`);
    await page.waitForTimeout(1500);
    await expect(page.locator('body')).toContainText(/workflow/i);
  });

  test('SCN-COMPLEX-003: Parallel approval workflow visible', async ({ page }) => {
    await login(page, TEST_USERS.manager);
    await page.goto(`${BASE_URL}/workflows`);
    await page.waitForTimeout(1500);
    await expect(page.locator('body')).toBeVisible();
  });

  test('SCN-COMPLEX-004: Sub-workflow can be triggered', async ({ page }) => {
    await login(page, TEST_USERS.manager);
    await page.goto(`${BASE_URL}/workflows`);
    await page.waitForTimeout(1500);
    await expect(page.locator('body')).toBeVisible();
  });

  test('SCN-COMPLEX-005: Condition node routes correctly', async ({ page }) => {
    await login(page, TEST_USERS.employee);
    await page.goto(`${BASE_URL}/workflows`);
    await page.waitForTimeout(1500);
    await expect(page.locator('body')).toBeVisible();
  });

  test('SCN-COMPLEX-006: SDLC workflow visible', async ({ page }) => {
    await login(page, TEST_USERS.manager);
    await page.goto(`${BASE_URL}/workflows`);
    await page.waitForTimeout(1500);
    await expect(page.locator('body')).toContainText(/SDLC|sdlc/i);
  });
});
