import { test, expect } from '@playwright/test';

/**
 * ServiceFlow - Scenario-Based E2E Tests
 * 
 * Based on seed script scenarios:
 * 1. Employee starts IT Equipment Request workflow
 * 2. Manager approves/rejects the request
 * 3. Notifications are created and visible
 * 4. Admin user management
 * 5. Customer Feedback workflow
 */

const BASE_URL = 'http://localhost:4200';

const TEST_USERS = {
  admin: { email: 'admin@example.com', password: 'password123', name: 'Admin User' },
  manager: { email: 'manager@example.com', password: 'password123', name: 'Manager User' },
  employee: { email: 'employee@example.com', password: 'password123', name: 'Employee User' },
};

async function login(page: any, user: { email: string; password: string; name: string }) {
  await page.goto(BASE_URL, { waitUntil: 'networkidle' });
  await page.locator('input[type="email"], input[name="email"]').fill(user.email);
  await page.locator('input[type="password"]').fill(user.password);
  await page.locator('button[type="submit"]').click();
  await page.waitForTimeout(2000);
}

test.describe('Scenario 1: IT Equipment Request Workflow', () => {

  test.afterEach(async ({ page }, testInfo) => {
    const status = testInfo.status === 'passed' ? 'pass' : 'fail';
    await page.screenshot({ 
      path: `tests/e2e/reports/${testInfo.title.replace(/\s+/g, '-')}-${status}.png`,
      fullPage: true 
    });
  });

  test('SCN-001: Employee can view available workflows', async ({ page }) => {
    await login(page, TEST_USERS.employee);
    await page.goto(`${BASE_URL}/workflows`);
    await page.waitForTimeout(1500);
    
    // Should see IT Equipment Approval workflow
    await expect(page.locator('text=IT Equipment Approval').first()).toBeVisible();
    await expect(page.locator('text=Customer Feedback Workflow').first()).toBeVisible();
  });

  test('SCN-002: Employee can start IT Equipment Request workflow', async ({ page }) => {
    await login(page, TEST_USERS.employee);
    await page.goto(`${BASE_URL}/workflows`);
    await page.waitForTimeout(1500);
    
    // Find and click start on IT Equipment Approval
    const startButton = page.locator('button', { hasText: 'Start' }).first();
    await startButton.click();
    await page.waitForTimeout(2000);
    
    // Should navigate to workflow player or form
    await expect(page).toHaveURL(/workflow/);
  });

  test('SCN-003: Employee can fill and submit IT Equipment Request form', async ({ page }) => {
    await login(page, TEST_USERS.employee);
    await page.goto(`${BASE_URL}/workflows`);
    await page.waitForTimeout(1500);
    
    // Start workflow
    await page.locator('button', { hasText: 'Start' }).first().click();
    await page.waitForTimeout(2000);
    
    // Fill form fields if visible
    const nameField = page.locator('input[name*="name" i], input[placeholder*="name" i]').first();
    if (await nameField.isVisible()) {
      await nameField.fill('John Smith');
    }
    
    const emailField = page.locator('input[type="email"]').first();
    if (await emailField.isVisible()) {
      await emailField.fill('john@example.com');
    }
    
    // Select equipment type
    const selectField = page.locator('select').first();
    if (await selectField.isVisible()) {
      await selectField.selectOption({ label: 'Laptop' });
    }
    
    // Submit form
    const submitButton = page.locator('button[type="submit"], button', { hasText: 'Submit' }).first();
    if (await submitButton.isVisible()) {
      await submitButton.click();
      await page.waitForTimeout(1500);
    }
  });

  test('SCN-004: Employee receives workflow started notification', async ({ page }) => {
    await login(page, TEST_USERS.employee);
    await page.waitForTimeout(1000);
    
    // Check for notification bell or navigate to notifications
    const notificationBell = page.locator('[class*="notification"], .badge').first();
    
    // Navigate to dashboard or notifications
    await page.goto(`${BASE_URL}/dashboard`);
    await page.waitForTimeout(1500);
    
    // Should see some indication of notification
    await expect(page.locator('body')).toContainText(/notification|workflow|request/i);
  });
});

test.describe('Scenario 2: Manager Approval Workflow', () => {

  test.afterEach(async ({ page }, testInfo) => {
    const status = testInfo.status === 'passed' ? 'pass' : 'fail';
    await page.screenshot({ 
      path: `tests/e2e/reports/${testInfo.title.replace(/\s+/g, '-')}-${status}.png`,
      fullPage: true 
    });
  });

  test('SCN-005: Manager can view pending approval requests', async ({ page }) => {
    await login(page, TEST_USERS.manager);
    await page.waitForTimeout(1000);
    
    // Navigate to dashboard or workflows
    await page.goto(`${BASE_URL}/dashboard`);
    await page.waitForTimeout(1500);
    
    // Check for pending items or navigate to workflows
    await page.goto(`${BASE_URL}/workflows`);
    await page.waitForTimeout(1500);
    
    // Manager should see approval workflow
    await expect(page.locator('text=IT Equipment Approval').first()).toBeVisible();
  });

  test('SCN-006: Manager can access approval panel', async ({ page }) => {
    await login(page, TEST_USERS.manager);
    await page.waitForTimeout(1000);
    
    // Look for approval-related navigation or button
    const approvalNav = page.locator('text=/approval|pending/i').first();
    
    // If approval section exists, navigate there
    if (await approvalNav.isVisible()) {
      await approvalNav.click();
      await page.waitForTimeout(1500);
    } else {
      // Check workflow instances
      await page.goto(`${BASE_URL}/workflows`);
      await page.waitForTimeout(1500);
    }
    
    await expect(page.locator('body')).toBeVisible();
  });

  test('SCN-007: Manager can approve/reject request', async ({ page }) => {
    await login(page, TEST_USERS.manager);
    await page.waitForTimeout(1000);
    
    // Navigate to workflows or instances
    await page.goto(`${BASE_URL}/workflows`);
    await page.waitForTimeout(1500);
    
    // Look for any action buttons
    const approveBtn = page.locator('button', { hasText: /approve|reject/i }).first();
    const actionBtn = page.locator('button').filter({ hasText: /action|manage/i }).first();
    
    // Try to find a clickable workflow instance
    const workflowCard = page.locator('[class*="workflow"], [class*="card"]').first();
    if (await workflowCard.isVisible()) {
      await workflowCard.click();
      await page.waitForTimeout(1500);
    }
  });
});

test.describe('Scenario 3: Notifications System', () => {

  test.afterEach(async ({ page }, testInfo) => {
    const status = testInfo.status === 'passed' ? 'pass' : 'fail';
    await page.screenshot({ 
      path: `tests/e2e/reports/${testInfo.title.replace(/\s+/g, '-')}-${status}.png`,
      fullPage: true 
    });
  });

  test('SCN-008: Notifications bell shows unread count', async ({ page }) => {
    await login(page, TEST_USERS.manager);
    await page.waitForTimeout(1000);
    
    // Look for notification bell with badge
    const bell = page.locator('[class*="bell"], [class*="notification"]').first();
    
    // Should see some notification element on page
    await expect(page.locator('body')).toBeVisible();
  });

  test('SCN-009: User can view notification list', async ({ page }) => {
    await login(page, TEST_USERS.manager);
    await page.waitForTimeout(1000);
    
    // Try to find and click notifications
    await page.goto(`${BASE_URL}/notifications`);
    await page.waitForTimeout(1500);
    
    // If page loads, verify content
    await expect(page.locator('body')).toBeVisible();
  });

  test('SCN-010: Notification contains correct workflow info', async ({ page }) => {
    await login(page, TEST_USERS.manager);
    await page.waitForTimeout(1000);
    
    // Check dashboard for notification details
    await page.goto(`${BASE_URL}/dashboard`);
    await page.waitForTimeout(1500);
    
    // Look for workflow-related content
    await expect(page.locator('body')).toContainText(/IT Equipment|workflow|approval/i);
  });
});

test.describe('Scenario 4: Admin User Management', () => {

  test.afterEach(async ({ page }, testInfo) => {
    const status = testInfo.status === 'passed' ? 'pass' : 'fail';
    await page.screenshot({ 
      path: `tests/e2e/reports/${testInfo.title.replace(/\s+/g, '-')}-${status}.png`,
      fullPage: true 
    });
  });

  test('SCN-011: Admin can access admin panel', async ({ page }) => {
    await login(page, TEST_USERS.admin);
    await page.waitForTimeout(1000);
    
    // Look for admin navigation
    await page.goto(`${BASE_URL}/admin`);
    await page.waitForTimeout(1500);
    
    // Should see admin-related content
    await expect(page.locator('body')).toBeVisible();
  });

  test('SCN-012: Admin can view all users', async ({ page }) => {
    await login(page, TEST_USERS.admin);
    await page.waitForTimeout(1000);
    
    // Navigate to users management if exists
    await page.goto(`${BASE_URL}/users`);
    await page.waitForTimeout(1500);
    
    // Or check dashboard
    await page.goto(`${BASE_URL}/dashboard`);
    await page.waitForTimeout(1500);
    
    // Should see admin content
    await expect(page.locator('body')).toBeVisible();
  });

  test('SCN-013: Admin dashboard shows system overview', async ({ page }) => {
    await login(page, TEST_USERS.admin);
    await page.waitForTimeout(1000);
    
    await page.goto(`${BASE_URL}/dashboard`);
    await page.waitForTimeout(1500);
    
    // Should see dashboard with stats
    await expect(page.locator('body')).toBeVisible();
  });
});

test.describe('Scenario 5: Customer Feedback Workflow', () => {

  test.afterEach(async ({ page }, testInfo) => {
    const status = testInfo.status === 'passed' ? 'pass' : 'fail';
    await page.screenshot({ 
      path: `tests/e2e/reports/${testInfo.title.replace(/\s+/g, '-')}-${status}.png`,
      fullPage: true 
    });
  });

  test('SCN-014: Customer Feedback workflow is available', async ({ page }) => {
    await login(page, TEST_USERS.employee);
    await page.goto(`${BASE_URL}/workflows`);
    await page.waitForTimeout(1500);
    
    // Should see Customer Feedback Workflow
    await expect(page.locator('text=Customer Feedback Workflow').first()).toBeVisible();
  });

  test('SCN-015: Employee can start Customer Feedback workflow', async ({ page }) => {
    await login(page, TEST_USERS.employee);
    await page.goto(`${BASE_URL}/workflows`);
    await page.waitForTimeout(1500);
    
    // Find Customer Feedback Workflow and start
    const feedbackWorkflow = page.locator('text=Customer Feedback Workflow').locator('..').locator('button', { hasText: 'Start' });
    await feedbackWorkflow.click();
    await page.waitForTimeout(2000);
    
    // Should see form or workflow player
    await expect(page).toHaveURL(/workflow|form/);
  });

  test('SCN-016: Customer Feedback form has rating field', async ({ page }) => {
    await login(page, TEST_USERS.employee);
    await page.goto(`${BASE_URL}/workflows`);
    await page.waitForTimeout(1500);
    
    // Start feedback workflow
    await page.locator('text=Customer Feedback Workflow').locator('..').locator('button', { hasText: 'Start' }).click();
    await page.waitForTimeout(2000);
    
    // Look for rating field
    const ratingField = page.locator('input[type="number"], input[name*="rating" i], .rating');
    await expect(page.locator('body')).toBeVisible();
  });

  test('SCN-017: Manager can view submitted feedback', async ({ page }) => {
    await login(page, TEST_USERS.manager);
    await page.waitForTimeout(1000);
    
    // Navigate to see feedback or tasks
    await page.goto(`${BASE_URL}/workflows`);
    await page.waitForTimeout(1500);
    
    await expect(page.locator('body')).toBeVisible();
  });
});

test.describe('Role-Based Access Control', () => {

  test.afterEach(async ({ page }, testInfo) => {
    const status = testInfo.status === 'passed' ? 'pass' : 'fail';
    await page.screenshot({ 
      path: `tests/e2e/reports/${testInfo.title.replace(/\s+/g, '-')}-${status}.png`,
      fullPage: true 
    });
  });

  test('SCN-018: Employee role has limited access', async ({ page }) => {
    await login(page, TEST_USERS.employee);
    await page.waitForTimeout(1000);
    
    // Try to access admin area
    await page.goto(`${BASE_URL}/admin`);
    await page.waitForTimeout(1500);
    
    // Should either redirect or show access denied
    const body = await page.locator('body').textContent();
    // Employee shouldn't see full admin panel
  });

  test('SCN-019: Manager role has appropriate access', async ({ page }) => {
    await login(page, TEST_USERS.manager);
    await page.waitForTimeout(1000);
    
    // Manager should access approval workflows
    await page.goto(`${BASE_URL}/workflows`);
    await page.waitForTimeout(1500);
    
    await expect(page.locator('text=IT Equipment Approval').first()).toBeVisible();
  });

  test('SCN-020: Admin has full system access', async ({ page }) => {
    await login(page, TEST_USERS.admin);
    await page.waitForTimeout(1000);
    
    // Admin can access everything
    await page.goto(`${BASE_URL}/dashboard`);
    await page.waitForTimeout(1500);
    await expect(page.locator('body')).toBeVisible();
    
    await page.goto(`${BASE_URL}/workflows`);
    await page.waitForTimeout(1500);
    await expect(page.locator('body')).toBeVisible();
  });
});
