/**
 * Analytics UI Tests
 * 
 * Tests for Analytics Dashboard UI
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

test.describe('Analytics UI Tests', () => {
  
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

  test('TC-ANA-001: Analytics page loads', async ({ page }) => {
    await page.goto(`${BASE_URL}/analytics`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    
    // Page should have title
    const title = page.locator('h1');
    await expect(title).toContainText('Analytics');
  });

  test('TC-ANA-002: Sidebar link to Analytics works', async ({ page }) => {
    // Click Analytics in sidebar
    await page.click('a[href="/analytics"]');
    await page.waitForURL('**/analytics**');
    
    // Should show Analytics page
    const title = page.locator('h1');
    await expect(title).toContainText('Analytics');
  });

  test('TC-ANA-003: Stats cards are displayed', async ({ page }) => {
    await page.goto(`${BASE_URL}/analytics`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000); // Wait for API response
    
    // Should show 4 stat cards
    const statCards = page.locator('.stat-card');
    const count = await statCards.count();
    expect(count).toBeGreaterThanOrEqual(4);
  });

  test('TC-ANA-004: Stat cards have values', async ({ page }) => {
    await page.goto(`${BASE_URL}/analytics`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    // Stat values should be visible
    const statValues = page.locator('.stat-value');
    const firstValue = statValues.first();
    await expect(firstValue).toBeVisible();
  });

  test('TC-ANA-005: Most Used Workflows section displays', async ({ page }) => {
    await page.goto(`${BASE_URL}/analytics`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    // Should show section
    const section = page.locator('.section h2', { hasText: 'Most Used Workflows' });
    await expect(section).toBeVisible();
  });

  test('TC-ANA-006: Trends section displays', async ({ page }) => {
    await page.goto(`${BASE_URL}/analytics`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    // Should show trends section
    const section = page.locator('.section h2', { hasText: 'Approval Time Trends' });
    await expect(section).toBeVisible();
  });

  test('TC-ANA-007: Refresh button works', async ({ page }) => {
    await page.goto(`${BASE_URL}/analytics`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    
    // Click refresh
    const refreshBtn = page.locator('button:has-text("Refresh")');
    await expect(refreshBtn).toBeVisible();
    await refreshBtn.click();
    await page.waitForTimeout(2000);
    
    // Page should still be functional
    const title = page.locator('h1');
    await expect(title).toContainText('Analytics');
  });
});
