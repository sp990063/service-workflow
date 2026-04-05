/**
 * Delegations UI Tests
 * 
 * Tests for Delegation management UI
 * Follows UI Testing Skill: screenshot evidence for pass/fail
 */

import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:4200';

async function login(page: any) {
  await page.goto(`${BASE_URL}/login`);
  await page.waitForLoadState('networkidle');
  
  const emailInput = page.locator('input[type="email"], input[type="text"]').first();
  const passwordInput = page.locator('input[type="password"]').first();
  
  await emailInput.fill('admin@example.com');
  await passwordInput.fill('password123');
  await page.locator('button[type="submit"], button:has-text("Login")').click();
  await page.waitForURL('**/dashboard**', { timeout: 10000 }).catch(() => {});
  await page.waitForTimeout(1000);
}

test.describe('Delegations UI Tests', () => {
  
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  // Screenshot after each test
  test.afterEach(async ({ page }, testInfo) => {
    const status = testInfo.status === 'passed' ? 'pass' : 'fail';
    await page.screenshot({ 
      path: `tests/e2e/reports/${testInfo.title.replace(/\s+/g, '-')}-${status}.png`,
      fullPage: true 
    });
  });

  test('TC-DEL-001: Delegations page loads', async ({ page }) => {
    await page.goto(`${BASE_URL}/delegations`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    
    // Page should have title
    const title = page.locator('h1');
    await expect(title).toContainText('Delegations');
  });

  test('TC-DEL-002: Sidebar link to Delegations works', async ({ page }) => {
    // Click Delegations in sidebar
    await page.click('a[href="/delegations"]');
    await page.waitForURL('**/delegations**');
    
    // Should show Delegations page
    const title = page.locator('h1');
    await expect(title).toContainText('Delegations');
  });

  test('TC-DEL-003: Add Delegation button opens modal', async ({ page }) => {
    await page.goto(`${BASE_URL}/delegations`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    
    // Click Add Delegation button
    const addBtn = page.locator('button:has-text("Add Delegation")');
    await expect(addBtn).toBeVisible();
    await addBtn.click();
    
    // Modal should appear
    const modal = page.locator('.modal');
    await expect(modal).toBeVisible();
  });

  test('TC-DEL-004: Delegation modal has required fields', async ({ page }) => {
    await page.goto(`${BASE_URL}/delegations`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    
    // Open modal
    await page.click('button:has-text("Add Delegation")');
    await page.waitForTimeout(500);
    
    // Check required fields exist
    const emailInput = page.locator('input[type="email"]');
    const startDate = page.locator('input[type="date"]').first();
    const endDate = page.locator('input[type="date"]').nth(1);
    
    await expect(emailInput).toBeVisible();
    await expect(startDate).toBeVisible();
    await expect(endDate).toBeVisible();
  });

  test('TC-DEL-005: Modal cancel button closes modal', async ({ page }) => {
    await page.goto(`${BASE_URL}/delegations`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    
    // Open modal
    await page.click('button:has-text("Add Delegation")');
    await page.waitForTimeout(500);
    
    // Click Cancel
    await page.click('button:has-text("Cancel")');
    await page.waitForTimeout(500);
    
    // Modal should close
    const modal = page.locator('.modal');
    await expect(modal).not.toBeVisible();
  });

  test('TC-DEL-006: My Delegations section displays', async ({ page }) => {
    await page.goto(`${BASE_URL}/delegations`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    
    // Should show My Delegations section
    const section = page.locator('.delegation-section h2', { hasText: 'My Delegations' });
    await expect(section).toBeVisible();
  });

  test('TC-DEL-007: Delegated to Me section displays', async ({ page }) => {
    await page.goto(`${BASE_URL}/delegations`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    
    // Should show Delegated to Me section
    const section = page.locator('.delegation-section h2', { hasText: 'Delegated to Me' });
    await expect(section).toBeVisible();
  });
});
