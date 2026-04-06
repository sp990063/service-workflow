import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:4200';
const TEST_USERS = {
  employee: { email: 'employee@example.com', password: 'password123', name: 'Employee User', role: 'USER' },
  manager: { email: 'manager@example.com', password: 'password123', name: 'Manager User', role: 'MANAGER' },
};

test('Debug SCN-EXP-002-P step by step', async ({ page }) => {
  // Step 1: Employee submits form
  await page.goto(`${BASE_URL}/login`);
  await page.waitForTimeout(2000);
  await page.locator('input[type="email"]').fill(TEST_USERS.employee.email);
  await page.locator('input[type="password"]').fill(TEST_USERS.employee.password);
  await page.locator('button[type="submit"]').click();
  await page.waitForTimeout(2000);
  
  await page.goto(`${BASE_URL}/workflows`);
  await page.waitForTimeout(1000);
  
  const wfCard = page.locator('.workflow-card', { has: page.locator('h3', { hasText: 'Expense Reimbursement' }) });
  await wfCard.locator('a', { hasText: 'Start Workflow' }).click();
  await page.waitForTimeout(1500);
  
  // Click Start Workflow button
  await page.locator('button', { hasText: 'Start Workflow' }).click();
  await page.waitForTimeout(2000);
  
  // Fill and submit form
  await page.locator('input[type="number"]').first().fill('1000');
  await page.locator('textarea').first().fill('Client dinner');
  await page.locator('button', { hasText: 'Submit Form' }).click();
  await page.waitForTimeout(2000);
  
  console.log('[STEP 1 - After employee submit]');
  console.log('URL:', page.url());
  const content1 = await page.locator('app-workflow-player').textContent();
  console.log('Content:', content1?.substring(0, 300));
  
  // Step 2: Manager logs in and approves
  await page.goto(`${BASE_URL}/login`);
  await page.waitForTimeout(2000);
  await page.locator('input[type="email"]').fill(TEST_USERS.manager.email);
  await page.locator('input[type="password"]').fill(TEST_USERS.manager.password);
  await page.locator('button[type="submit"]').click();
  await page.waitForTimeout(2000);
  
  // Go to dashboard
  await page.goto(`${BASE_URL}/dashboard`);
  await page.waitForTimeout(2000);
  
  console.log('[STEP 2 - Manager dashboard]');
  const dashboard = await page.locator('body').innerText();
  console.log('Dashboard:', dashboard.substring(0, 400));
  
  // Find and click approve
  const approveBtn = page.locator('button', { hasText: /approve/i });
  console.log('Approve button count:', await approveBtn.count());
  
  if (await approveBtn.count() > 0) {
    await approveBtn.first().click();
    await page.waitForTimeout(3000);
  }
  
  // Step 3: Go back to workflow to see parallel section
  await page.goto(`${BASE_URL}/workflows`);
  await page.waitForTimeout(1000);
  
  console.log('[STEP 3 - After manager approval]');
  const wfCard2 = page.locator('.workflow-card', { has: page.locator('h3', { hasText: 'Expense Reimbursement' }) });
  const viewBtn = wfCard2.locator('a', { hasText: 'View' });
  console.log('View button count:', await viewBtn.count());
  
  if (await viewBtn.count() > 0) {
    await viewBtn.first().click();
    await page.waitForTimeout(2000);
    
    const content2 = await page.locator('app-workflow-player').textContent();
    console.log('Workflow content:', content2?.substring(0, 400));
    
    const parallelSection = page.locator('.parallel-section');
    console.log('Parallel section visible:', await parallelSection.isVisible().catch(() => false));
  }
});
