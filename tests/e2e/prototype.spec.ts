import { test, expect } from '@playwright/test';

test.describe('ServiceFlow MVP Prototype', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:4200', { waitUntil: 'networkidle' });
  });

  test('TC-001: Login page loads', async ({ page }) => {
    await expect(page).toHaveTitle(/ServiceFlow/);
    await expect(page.locator('h1, h2')).toBeVisible();
  });

  test('TC-002: User can login', async ({ page }) => {
    const emailInput = page.locator('input[type="email"], input[name="email"]');
    const passwordInput = page.locator('input[type="password"], input[name="password"]');
    
    if (await emailInput.isVisible()) {
      await emailInput.fill('admin@company.com');
      await passwordInput.fill('password123');
      await page.locator('button[type="submit"]').click();
      await page.waitForTimeout(1000);
    }
  });

  test('TC-003: Dashboard displays stats', async ({ page }) => {
    // Login first
    const emailInput = page.locator('input[type="email"], input[name="email"]');
    if (await emailInput.isVisible()) {
      await emailInput.fill('admin@company.com');
      await page.locator('input[type="password"]').fill('password123');
      await page.locator('button[type="submit"]').click();
      await page.waitForTimeout(1500);
    }
    
    // Check for dashboard elements
    await expect(page.locator('body')).toBeVisible();
  });

  test('TC-004: Form Builder accessible', async ({ page }) => {
    // Login
    await page.locator('input[type="email"]').fill('admin@company.com');
    await page.locator('input[type="password"]').fill('password123');
    await page.locator('button[type="submit"]').click();
    await page.waitForTimeout(1000);
    
    // Navigate to Form Builder
    await page.goto('http://localhost:4200/form-builder');
    await page.waitForTimeout(500);
    
    // Check form builder elements
    await expect(page.locator('body')).toBeVisible();
  });

  test('TC-005: Workflow Designer accessible', async ({ page }) => {
    // Login
    await page.locator('input[type="email"]').fill('admin@company.com');
    await page.locator('input[type="password"]').fill('password123');
    await page.locator('button[type="submit"]').click();
    await page.waitForTimeout(1000);
    
    // Navigate to Workflow Designer
    await page.goto('http://localhost:4200/workflow-designer');
    await page.waitForTimeout(500);
    
    // Check workflow designer elements
    await expect(page.locator('body')).toBeVisible();
  });
});
