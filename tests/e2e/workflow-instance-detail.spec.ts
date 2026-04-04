import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:4200';
const TEST_USER = { email: 'admin@example.com', password: 'password123' };

// Real instance ID from database seed data
const REAL_INSTANCE_ID = '3961a9c7-ec5d-44cb-9420-7df9061d2b50';

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

// TC-WFINST-001: Workflow instance detail page loads
test('TC-WFINST-001: Workflow instance detail page loads', async ({ page }) => {
  await login(page);
  
  // Navigate directly to workflow instance
  await page.goto(`${BASE_URL}/workflow-instance/${REAL_INSTANCE_ID}`, { waitUntil: 'networkidle' });
  
  // Wait for the instance detail component to load
  await page.waitForSelector('.detail-header', { timeout: 15000 });
  
  // Should see the header
  const header = page.locator('.detail-header h1');
  await expect(header).toBeVisible();
  await expect(header).toContainText('Workflow Instance');
});

// TC-WFINST-002: Workflow steps are displayed
test('TC-WFINST-002: Workflow steps are displayed', async ({ page }) => {
  await login(page);
  
  await page.goto(`${BASE_URL}/workflow-instance/${REAL_INSTANCE_ID}`, { waitUntil: 'networkidle' });
  await page.waitForSelector('.workflow-steps', { timeout: 15000 });
  
  await expect(page.locator('.workflow-steps h2')).toContainText('Workflow Steps');
  const stepCards = await page.locator('.step-card').count();
  expect(stepCards).toBeGreaterThan(0);
});

// TC-WFINST-003: History section is displayed
test('TC-WFINST-003: History section is displayed', async ({ page }) => {
  await login(page);
  
  await page.goto(`${BASE_URL}/workflow-instance/${REAL_INSTANCE_ID}`, { waitUntil: 'networkidle' });
  await page.waitForSelector('.history-section', { timeout: 15000 });
  
  await expect(page.locator('.history-section h2')).toContainText('History');
});

// TC-WFINST-004: Back to workflows link works
test('TC-WFINST-004: Back to workflows link works', async ({ page }) => {
  await login(page);
  
  await page.goto(`${BASE_URL}/workflow-instance/${REAL_INSTANCE_ID}`, { waitUntil: 'networkidle' });
  await page.waitForSelector('.detail-header a', { timeout: 15000 });
  
  await page.locator('.detail-header a', { hasText: 'Back to Workflows' }).click();
  await page.waitForURL(/\/workflows/, { timeout: 10000 });
});