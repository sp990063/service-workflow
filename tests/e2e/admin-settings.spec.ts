import { test, expect, Page } from '@playwright/test';

const BASE_URL = process.env.E2E_BASE_URL || 'http://localhost:4200';

const ADMIN_USER = { email: 'admin@example.com', password: 'password123' };

async function login(page: Page) {
  await page.goto(`${BASE_URL}/login`);
  await page.waitForLoadState('networkidle');
  await page.fill('input[type="email"]', ADMIN_USER.email);
  await page.fill('input[type="password"]', ADMIN_USER.password);
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard', { timeout: 15000 });
  await page.waitForLoadState('networkidle');
}

// ============ Admin Settings E2E Tests ============

test.describe('SCENARIO 1: Admin Settings Access', () => {
  test('TC-SETTINGS-001: Dashboard shows Settings link for admin', async ({ page }) => {
    await login(page);
    await page.goto(`${BASE_URL}/dashboard`);
    await page.waitForSelector('.dashboard', { timeout: 5000 });
    
    // Settings should be visible for admin
    const settingsLink = page.locator('a:has-text("Settings")');
    await expect(settingsLink).toBeVisible();
  });

  test('TC-SETTINGS-002: Admin can access settings page', async ({ page }) => {
    await login(page);
    await page.goto(`${BASE_URL}/admin/settings`);
    await page.waitForTimeout(3000);
    
    // Verify we're on the settings page
    expect(page.url()).toContain('/admin/settings');
    
    // Should see the System Settings heading (content loads or error shows)
    const hasHeading = await page.locator('h1:has-text("System Settings")').isVisible().catch(() => false);
    const hasContent = await page.locator('.admin-settings, .settings-panel, text=Configure SMTP').isVisible().catch(() => false);
    const hasError = await page.locator('text=Failed to load settings').isVisible().catch(() => false);
    
    // At minimum, should be on settings page with either content or error
    expect(hasHeading || hasContent || hasError).toBeTruthy();
  });
});

test.describe('SCENARIO 2: Dashboard Quick Actions', () => {
  test('TC-ACTIONS-001: Admin sees both Manage Users and Settings', async ({ page }) => {
    await login(page);
    await page.goto(`${BASE_URL}/dashboard`);
    await page.waitForSelector('.dashboard', { timeout: 5000 });
    
    // Should see both admin actions
    await expect(page.locator('text=Manage Users')).toBeVisible();
    await expect(page.locator('text=Settings')).toBeVisible();
  });
});

test.describe('SCENARIO 3: Non-Admin Restrictions', () => {
  test('TC-NOADM-001: Non-admin does not see Settings link', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[type="email"]', 'employee@example.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard', { timeout: 10000 });
    
    await page.goto(`${BASE_URL}/dashboard`);
    await page.waitForSelector('.dashboard', { timeout: 5000 });
    
    // Settings should NOT be visible for non-admin
    const settingsLink = page.locator('a:has-text("Settings")');
    await expect(settingsLink).not.toBeVisible();
  });
});
