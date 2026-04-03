/**
 * Sub-Workflow E2E Tests - Simplified
 * 
 * Tests for nested workflow support.
 */

import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:4200';
const TEST_USER = { email: 'admin@company.com', password: 'password123' };

async function login(page: any) {
  await page.goto(BASE_URL, { waitUntil: 'networkidle' });
  await page.locator('input[type="email"], input[name="email"]').fill(TEST_USER.email);
  await page.locator('input[type="password"]').fill(TEST_USER.password);
  await page.locator('button[type="submit"]').click();
  await page.waitForTimeout(1500);
}

async function clearLocalStorage(page: any) {
  await page.goto(BASE_URL, { waitUntil: 'networkidle' });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'networkidle' });
}

test.describe('Sub-Workflow Tests', () => {

  test.beforeEach(async ({ page }) => {
    await clearLocalStorage(page);
  });

  test.afterEach(async ({ page }, testInfo) => {
    const status = testInfo.status === 'passed' ? 'pass' : 'fail';
    await page.screenshot({ 
      path: `tests/e2e/reports/${testInfo.title.replace(/\s+/g, '-')}-${status}.png`,
      fullPage: true 
    });
  });

  /**
   * TC-SUB-002: Verify sub-workflow node appears in designer palette
   */
  test('TC-SUB-002: Sub-Workflow node appears in palette', async ({ page }) => {
    await login(page);
    
    await page.goto(`${BASE_URL}/workflow-designer`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);
    
    // Verify Sub-Workflow node in palette
    const subWfNode = page.locator('.node-item', { hasText: 'Sub-Workflow' });
    await expect(subWfNode).toBeVisible();
  });

  /**
   * TC-SUB-005: Simple sub-workflow flow
   * 
   * Create:
   * 1. Child Workflow (Start → Task → End)
   * 2. Parent Workflow (Start → Sub-Workflow → End)
   * 
   * Execute:
   * 1. Start Parent
   * 2. Verify Sub-Workflow section visible
   * 3. Click Start Sub-Workflow
   * 4. Verify waiting message appears
   */
  test('TC-SUB-005: Sub-workflow UI flow', async ({ page }) => {
    await login(page);
    
    // ========== Create Child Workflow ==========
    await page.goto(`${BASE_URL}/workflow-designer`, { waitUntil: 'networkidle' });
    await page.locator('.workflow-name-input').fill('Child Workflow');
    await page.waitForTimeout(300);
    
    // Add Start
    await page.locator('button', { hasText: '+ Start' }).click();
    await page.waitForTimeout(200);
    
    // Add Task node
    const taskNode = page.locator('.node-item', { hasText: 'Task' });
    await taskNode.dragTo(page.locator('.canvas-container'), { targetPosition: { x: 200, y: 100 }, force: true });
    await page.waitForTimeout(200);
    
    // Edit task label
    await page.locator('.workflow-node').nth(1).click();
    await page.waitForTimeout(100);
    await page.locator('.property-form input[type="text"]').nth(1).fill('Child Task');
    await page.waitForTimeout(100);
    
    // Add End
    await page.keyboard.press('Escape');
    await page.waitForTimeout(100);
    const endNode = page.locator('.node-item', { hasText: 'End' });
    await endNode.dragTo(page.locator('.canvas-container'), { targetPosition: { x: 400, y: 100 }, force: true });
    await page.waitForTimeout(200);
    
    // Save Child
    page.on('dialog', dialog => dialog.accept());
    await page.locator('button', { hasText: 'Save Workflow' }).click();
    await page.waitForTimeout(2000);
    page.removeAllListeners('dialog');
    
    // Get child ID
    const childId = await page.evaluate(() => {
      const wfs = JSON.parse(localStorage.getItem('workflows') || '[]');
      const child = wfs.find((w: any) => w.name === 'Child Workflow');
      return child?.id;
    });
    
    // ========== Create Parent Workflow ==========
    await page.goto(`${BASE_URL}/workflow-designer`, { waitUntil: 'networkidle' });
    await page.locator('.workflow-name-input').fill('Parent Workflow');
    await page.waitForTimeout(300);
    
    // Add Start
    await page.locator('button', { hasText: '+ Start' }).click();
    await page.waitForTimeout(200);
    
    // Add Sub-Workflow node
    const subWfNode = page.locator('.node-item', { hasText: 'Sub-Workflow' });
    await subWfNode.dragTo(page.locator('.canvas-container'), { targetPosition: { x: 200, y: 100 }, force: true });
    await page.waitForTimeout(200);
    
    // Configure sub-workflow node
    await page.locator('.workflow-node').nth(1).click();
    await page.waitForTimeout(100);
    await page.locator('.property-form input[type="text"]').nth(1).fill('Call Child');
    await page.waitForTimeout(100);
    
    // Select child workflow
    if (childId) {
      await page.locator('.property-form select').selectOption(childId);
      await page.waitForTimeout(200);
    }
    
    // Add End
    await page.keyboard.press('Escape');
    await page.waitForTimeout(100);
    const endNode2 = page.locator('.node-item', { hasText: 'End' });
    await endNode2.dragTo(page.locator('.canvas-container'), { targetPosition: { x: 400, y: 100 }, force: true });
    await page.waitForTimeout(200);
    
    // Save Parent
    page.on('dialog', dialog => dialog.accept());
    await page.locator('button', { hasText: 'Save Workflow' }).click();
    await page.waitForTimeout(2000);
    page.removeAllListeners('dialog');
    
    // ========== Execute Parent ==========
    await page.goto(`${BASE_URL}/workflows`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    
    // Get all links with Start Workflow text
    const links = await page.locator('a', { hasText: 'Start Workflow' }).all();
    console.log('Start Workflow links count:', links.length);
    
    // Click the second one (Parent Workflow is created second)
    await page.locator('a', { hasText: 'Start Workflow' }).nth(1).click();
    await page.waitForTimeout(1000);
    
    await expect(page.locator('h1')).toContainText('Parent Workflow', { timeout: 10000 });
    
    // Start workflow
    await page.locator('button', { hasText: 'Start Workflow' }).click();
    await page.waitForTimeout(500);
    
    // Verify Sub-Workflow section visible
    await expect(page.locator('.sub-workflow-section')).toBeVisible();
    
    // Click Start Sub-Workflow (if childId was found)
    if (childId) {
      await page.locator('button', { hasText: 'Start Sub-Workflow' }).click();
      await page.waitForTimeout(500);
      
      // Verify waiting message
      await expect(page.locator('.waiting-message')).toContainText('Waiting');
    }
  });

  /**
   * TC-SUB-006: Sub-workflow properties panel shows dropdown
   */
  test('TC-SUB-006: Sub-workflow properties panel has workflow dropdown', async ({ page }) => {
    await login(page);
    
    await page.goto(`${BASE_URL}/workflow-designer`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(300);
    
    // Add Start and Sub-Workflow
    await page.locator('button', { hasText: '+ Start' }).click();
    await page.waitForTimeout(200);
    
    const subWfNode = page.locator('.node-item', { hasText: 'Sub-Workflow' });
    await subWfNode.dragTo(page.locator('.canvas-container'), { targetPosition: { x: 200, y: 100 }, force: true });
    await page.waitForTimeout(200);
    
    // Click on Sub-Workflow node to show properties
    await page.locator('.workflow-node').nth(1).click();
    await page.waitForTimeout(200);
    
    // Verify properties panel has select dropdown
    await expect(page.locator('.property-form select')).toBeVisible();
    
    // Verify checkbox for waitForCompletion
    await expect(page.locator('.property-form input[type="checkbox"]')).toBeVisible();
  });

});
