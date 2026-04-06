import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:4200';

test('start IT workflow', async ({ page }) => {
  await page.goto(`${BASE_URL}/login`);
  await page.waitForTimeout(1000);
  await page.locator('input[type="email"]').fill('employee@example.com');
  await page.locator('input[type="password"]').fill('password123');
  await page.locator('button[type="submit"]').click();
  await page.waitForTimeout(1000);

  await page.goto(`${BASE_URL}/workflows`);
  await page.waitForTimeout(2000);

  const itWf = page.locator('.workflow-card', { has: page.locator('h3', { hasText: 'IT Equipment Approval' }) });
  await itWf.locator('a', { hasText: 'Start Workflow' }).click();
  await page.waitForTimeout(3000);
  
  console.log('After start workflow URL:', page.url());
  
  // Check for form
  const formSection = page.locator('.form-section');
  console.log('Form section visible:', await formSection.isVisible().catch(() => false));
  
  const formFields = await page.locator('.form-field').count();
  console.log('Form fields:', formFields);
});
