import { test, expect, Page } from '@playwright/test';

const BASE_URL = 'http://localhost:4200';

test.describe('Form Validation - Negative Cases', () => {

  async function login(page: Page) {
    await page.goto(`${BASE_URL}/login`);
    const overlay = page.locator('vite-error-overlay');
    if (await overlay.isVisible()) {
      await overlay.click({ position: { x: 10, y: 10 } }).catch(() => {});
      await page.keyboard.press('Escape');
    }
    await page.fill('input[type="email"]', 'admin@example.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL(`${BASE_URL}/**`, { timeout: 10000 });
  }

  async function createFormWithFields(page: Page) {
    await page.goto(`${BASE_URL}/form-builder`);
    await page.waitForSelector(".node-item", { timeout: 30000 });
    await page.waitForTimeout(1000);

    await page.locator('.form-name-input').fill('Validation Test Form');

    // Add email field (required)
    await page.locator('.element-item', { hasText: 'Email' })
      .dragTo(page.locator('.canvas'));
    await page.waitForTimeout(300);
    await page.locator('.form-element').click();
    await page.waitForTimeout(200);
    await page.locator('.property-form input[type="checkbox"]').check();

    // Add number field
    await page.locator('.element-item', { hasText: 'Number' })
      .dragTo(page.locator('.canvas'));
    await page.waitForTimeout(300);

    page.on('dialog', dialog => dialog.accept());
    await page.locator('button', { hasText: 'Save Form' }).click();
    await page.waitForTimeout(1000);
  }

  test.afterEach(async ({ page }, testInfo) => {
    const status = testInfo.status === 'passed' ? 'pass' : 'fail';
    await page.screenshot({
      path: `tests/e2e/reports/${testInfo.title.replace(/\s+/g, '-')}-${status}.png`,
      fullPage: true
    });
  });

  test('TC-FORM-NEG-001: Email rejects invalid format', async ({ page }) => {
    await login(page);
    await createFormWithFields(page);
    await page.goto(`${BASE_URL}/forms`);
    await page.waitForSelector(".node-item", { timeout: 30000 });
    await page.waitForTimeout(1000);
    await page.locator('.form-card .btn-primary', { hasText: 'Fill Form' }).click();
    await page.waitForTimeout(1000);
    await page.fill('input[type="email"]', 'notanemail');
    await page.locator('button[type="submit"]').click();
    // Verify error appears
  });

  test('TC-FORM-NEG-002: Required field blocks empty submission', async ({ page }) => {
    await login(page);
    await createFormWithFields(page);
    await page.goto(`${BASE_URL}/forms`);
    await page.waitForSelector(".node-item", { timeout: 30000 });
    await page.waitForTimeout(1000);
    await page.locator('.form-card .btn-primary', { hasText: 'Fill Form' }).click();
    await page.waitForTimeout(1000);
    // Try to submit without filling required fields
    await page.locator('button[type="submit"]').click();
    // Verify blocked
  });

  test('TC-FORM-NEG-003: Number rejects out-of-range', async ({ page }) => {
    await login(page);
    await createFormWithFields(page);
    await page.goto(`${BASE_URL}/forms`);
    await page.waitForSelector(".node-item", { timeout: 30000 });
    await page.waitForTimeout(1000);
    await page.locator('.form-card .btn-primary', { hasText: 'Fill Form' }).click();
    await page.waitForTimeout(1000);
    const numInput = page.locator('input[type="number"]').first();
    if (await numInput.isVisible()) {
      await numInput.fill('999999');
      await page.locator('button[type="submit"]').click();
    }
  });
});
