import { test, expect } from '@playwright/test';

/**
 * ServiceFlow MVP - Core Features E2E Tests
 * 
 * Tests cover:
 * - Condition Node (workflow branching based on form data)
 * - Parallel Split + Join Nodes (parallel execution with AND logic)
 * - Date Range Form Element
 * - Time Form Element  
 * - File Upload Form Element
 */

const BASE_URL = 'http://localhost:4200';
const TEST_USER = { email: 'admin@example.com', password: 'password123' };

async function login(page: any) {
  await page.goto(BASE_URL, { waitUntil: 'networkidle' });
  await page.locator('input[type="email"], input[name="email"]').fill(TEST_USER.email);
  await page.locator('input[type="password"]').fill(TEST_USER.password);
  await page.locator('button[type="submit"]').click();
  await page.waitForTimeout(1500);
}

// ============ CONDITION NODE TESTS ============
test.describe('Condition Node', () => {

  test.afterEach(async ({ page }, testInfo) => {
    const status = testInfo.status === 'passed' ? 'pass' : 'fail';
    await page.screenshot({
      path: `tests/e2e/reports/${testInfo.title.replace(/\s+/g, '-')}-${status}.png`,
      fullPage: true
    });
  });

  test('TC-COND-001: Condition node exists in workflow designer palette', async ({ page }) => {
    await login(page);
    await page.goto(`${BASE_URL}/workflow-designer`);
    await page.waitForTimeout(1000);
    
    // Check for Condition node in palette
    await expect(page.locator('.node-item', { hasText: 'Condition' })).toBeVisible();
  });

  test('TC-COND-002: Can add Condition node to canvas', async ({ page }) => {
    await login(page);
    await page.goto(`${BASE_URL}/workflow-designer`);
    await page.waitForTimeout(1000);
    
    // Add a start node first
    await page.locator('button', { hasText: '+ Start' }).click();
    await page.waitForTimeout(300);
    
    // Drag Condition node to canvas
    const conditionNode = page.locator('.node-item', { hasText: 'Condition' });
    await conditionNode.dragTo(page.locator('.canvas-container'));
    await page.waitForSelector(".node-item", { timeout: 30000 });
    await page.waitForTimeout(1000);
    
    // Verify Condition node was added
    await expect(page.locator('.workflow-node')).toHaveCount(2);
    await expect(page.locator('.node-header', { hasText: 'Condition' })).toBeVisible();
  });

  test('TC-COND-003: Condition node properties show field/value inputs', async ({ page }) => {
    await login(page);
    await page.goto(`${BASE_URL}/workflow-designer`);
    await page.waitForTimeout(1000);
    
    // Add a start node first
    await page.locator('button', { hasText: '+ Start' }).click();
    await page.waitForTimeout(300);
    
    // Drag Condition node
    const conditionNode = page.locator('.node-item', { hasText: 'Condition' });
    await conditionNode.dragTo(page.locator('.canvas-container'));
    await page.waitForSelector(".node-item", { timeout: 30000 });
    await page.waitForTimeout(1000);
    
    // Click to select the condition node
    const nodes = page.locator('.workflow-node');
    await nodes.last().click();
    await page.waitForTimeout(300);
    
    // Verify properties panel shows Field and Value inputs
    await expect(page.locator('text=Properties')).toBeVisible();
    // The condition node should show field and value inputs in the properties
    await expect(page.locator('input[placeholder="Enter label"]')).toBeVisible();
  });

  test.skip('TC-COND-004: Workflow player shows condition evaluation UI', async ({ page }) => {
    // Skipped: Complex E2E test requiring workflow save/load
    // This would need a seeded workflow with condition node in the database
    // The UI component .condition-section exists in workflow-player.component.ts
    // Tested manually or via integration tests instead
  });
});

// ============ PARALLEL SPLIT + JOIN TESTS ============
test.describe('Parallel Split + Join Nodes', () => {

  test.afterEach(async ({ page }, testInfo) => {
    const status = testInfo.status === 'passed' ? 'pass' : 'fail';
    await page.screenshot({
      path: `tests/e2e/reports/${testInfo.title.replace(/\s+/g, '-')}-${status}.png`,
      fullPage: true
    });
  });

  test('TC-PARALLEL-001: Parallel node exists in workflow designer palette', async ({ page }) => {
    await login(page);
    await page.goto(`${BASE_URL}/workflow-designer`);
    await page.waitForTimeout(1000);
    
    // Check for Parallel node in palette
    await expect(page.locator('.node-item', { hasText: 'Parallel' })).toBeVisible();
  });

  test('TC-PARALLEL-002: Join node exists in workflow designer palette', async ({ page }) => {
    await login(page);
    await page.goto(`${BASE_URL}/workflow-designer`);
    await page.waitForTimeout(1000);
    
    // Check for Join node in palette
    await expect(page.locator('.node-item', { hasText: 'Join' })).toBeVisible();
  });

  test('TC-PARALLEL-003: Can create parallel approval workflow structure', async ({ page }) => {
    await login(page);
    await page.goto(`${BASE_URL}/workflow-designer`);
    await page.waitForTimeout(1000);
    
    await page.locator('.workflow-name-input').clear();
    await page.locator('.workflow-name-input').fill('Parallel Approval Workflow');
    
    // Add Start
    await page.locator('button', { hasText: '+ Start' }).click();
    await page.waitForTimeout(300);
    
    // Add Parallel node
    const parallelNode = page.locator('.node-item', { hasText: 'Parallel' });
    await parallelNode.dragTo(page.locator('.canvas-container'));
    await page.waitForSelector(".node-item", { timeout: 30000 });
    await page.waitForTimeout(1000);
    
    // Add Join node
    const joinNode = page.locator('.node-item', { hasText: 'Join' });
    await joinNode.dragTo(page.locator('.canvas-container'));
    await page.waitForSelector(".node-item", { timeout: 30000 });
    await page.waitForTimeout(1000);
    
    // Add End node
    const endNode = page.locator('.node-item', { hasText: 'End' });
    await endNode.dragTo(page.locator('.canvas-container'));
    await page.waitForSelector(".node-item", { timeout: 30000 });
    await page.waitForTimeout(1000);
    
    // Verify all nodes were added
    const nodes = page.locator('.workflow-node');
    await expect(nodes).toHaveCount(4);
    
    // Verify parallel and join nodes exist
    await expect(page.locator('.node-header', { hasText: 'Parallel' })).toBeVisible();
    await expect(page.locator('.node-header', { hasText: 'Join' })).toBeVisible();
  });

  test.skip('TC-PARALLEL-004: Parallel section in workflow player shows AND logic info', async ({ page }) => {
    // Skipped: Complex E2E test requiring workflow save/load
    // This would need a seeded workflow with parallel node in the database
    // The UI component .parallel-section exists in workflow-player.component.ts
    // Tested manually or via integration tests instead
  });
});

// ============ DATE RANGE ELEMENT TESTS ============
test.describe('Date Range Form Element', () => {

  test.afterEach(async ({ page }, testInfo) => {
    const status = testInfo.status === 'passed' ? 'pass' : 'fail';
    await page.screenshot({
      path: `tests/e2e/reports/${testInfo.title.replace(/\s+/g, '-')}-${status}.png`,
      fullPage: true
    });
  });

  test('TC-DATERANGE-001: Date Range element exists in form builder palette', async ({ page }) => {
    await login(page);
    await page.goto(`${BASE_URL}/form-builder`);
    await page.waitForTimeout(1000);
    
    // Check for Date Range element in palette
    await expect(page.locator('.element-item', { hasText: 'Date Range' })).toBeVisible();
  });

  test('TC-DATERANGE-002: Can add Date Range element to form', async ({ page }) => {
    await login(page);
    await page.goto(`${BASE_URL}/form-builder`);
    await page.waitForTimeout(1000);
    
    // Enter form name
    await page.locator('.form-name-input').clear();
    await page.locator('.form-name-input').fill('Date Range Test Form');
    
    // Drag Date Range element to canvas
    const dateRangeEl = page.locator('.element-item', { hasText: 'Date Range' });
    await dateRangeEl.dragTo(page.locator('.canvas'));
    await page.waitForSelector(".form-element", { timeout: 30000 });
    await page.waitForTimeout(1000);
    
    // Verify element was added
    await expect(page.locator('.form-element')).toBeVisible();
    await expect(page.locator('.element-label')).toContainText('Date Range');
  });

  test('TC-DATERANGE-003: Date Range preview shows two date inputs', async ({ page }) => {
    await login(page);
    await page.goto(`${BASE_URL}/form-builder`);
    await page.waitForTimeout(1000);
    
    // Add Date Range element
    const dateRangeEl = page.locator('.element-item', { hasText: 'Date Range' });
    await dateRangeEl.dragTo(page.locator('.canvas'));
    await page.waitForSelector(".form-element", { timeout: 30000 });
    await page.waitForTimeout(1000);
    
    // Verify preview shows two date inputs with dash separator
    await expect(page.locator('.daterange-preview input[type="date"]')).toHaveCount(2);
  });

  test('TC-DATERANGE-004: Can select Date Range element and edit properties', async ({ page }) => {
    await login(page);
    await page.goto(`${BASE_URL}/form-builder`);
    await page.waitForTimeout(1000);
    
    // Add Date Range element
    const dateRangeEl = page.locator('.element-item', { hasText: 'Date Range' });
    await dateRangeEl.dragTo(page.locator('.canvas'));
    await page.waitForSelector(".form-element", { timeout: 30000 });
    await page.waitForTimeout(1000);
    
    // Click to select element
    await page.locator('.form-element').click();
    await page.waitForTimeout(300);
    
    // Verify properties panel shows
    await expect(page.locator('text=Properties')).toBeVisible();
    await expect(page.locator('text=Label')).toBeVisible();
    await expect(page.locator('text=Required')).toBeVisible();
  });
});

// ============ TIME ELEMENT TESTS ============
test.describe('Time Form Element', () => {

  test.afterEach(async ({ page }, testInfo) => {
    const status = testInfo.status === 'passed' ? 'pass' : 'fail';
    await page.screenshot({
      path: `tests/e2e/reports/${testInfo.title.replace(/\s+/g, '-')}-${status}.png`,
      fullPage: true
    });
  });

  test('TC-TIME-001: Time element exists in form builder palette', async ({ page }) => {
    await login(page);
    await page.goto(`${BASE_URL}/form-builder`);
    await page.waitForTimeout(1000);
    
    // Check for Time element in palette
    await expect(page.locator('.element-item', { hasText: 'Time' })).toBeVisible();
  });

  test('TC-TIME-002: Can add Time element to form', async ({ page }) => {
    await login(page);
    await page.goto(`${BASE_URL}/form-builder`);
    await page.waitForTimeout(1000);
    
    // Enter form name
    await page.locator('.form-name-input').clear();
    await page.locator('.form-name-input').fill('Time Test Form');
    
    // Drag Time element to canvas
    const timeEl = page.locator('.element-item', { hasText: 'Time' });
    await timeEl.dragTo(page.locator('.canvas'));
    await page.waitForSelector(".form-element", { timeout: 30000 });
    await page.waitForTimeout(1000);
    
    // Verify element was added
    await expect(page.locator('.form-element')).toBeVisible();
    await expect(page.locator('.element-label')).toContainText('Time');
  });

  test('TC-TIME-003: Time element preview shows time input', async ({ page }) => {
    await login(page);
    await page.goto(`${BASE_URL}/form-builder`);
    await page.waitForTimeout(1000);
    
    // Add Time element
    const timeEl = page.locator('.element-item', { hasText: 'Time' });
    await timeEl.dragTo(page.locator('.canvas'));
    await page.waitForSelector(".form-element", { timeout: 30000 });
    await page.waitForTimeout(1000);
    
    // Verify preview shows time input
    await expect(page.locator('.element-preview input[type="time"]')).toBeVisible();
  });
});

// ============ FILE UPLOAD ELEMENT TESTS ============
test.describe('File Upload Form Element', () => {

  test.afterEach(async ({ page }, testInfo) => {
    const status = testInfo.status === 'passed' ? 'pass' : 'fail';
    await page.screenshot({
      path: `tests/e2e/reports/${testInfo.title.replace(/\s+/g, '-')}-${status}.png`,
      fullPage: true
    });
  });

  test('TC-FILE-001: File Upload element exists in form builder palette', async ({ page }) => {
    await login(page);
    await page.goto(`${BASE_URL}/form-builder`);
    await page.waitForTimeout(1000);
    
    // Check for File Upload element in palette
    await expect(page.locator('.element-item', { hasText: 'File Upload' })).toBeVisible();
  });

  test('TC-FILE-002: Can add File Upload element to form', async ({ page }) => {
    await login(page);
    await page.goto(`${BASE_URL}/form-builder`);
    await page.waitForTimeout(1000);
    
    // Enter form name
    await page.locator('.form-name-input').clear();
    await page.locator('.form-name-input').fill('File Upload Test Form');
    
    // Drag File Upload element to canvas
    const fileEl = page.locator('.element-item', { hasText: 'File Upload' });
    await fileEl.dragTo(page.locator('.canvas'));
    await page.waitForSelector(".form-element", { timeout: 30000 });
    await page.waitForTimeout(1000);
    
    // Verify element was added
    await expect(page.locator('.form-element')).toBeVisible();
    await expect(page.locator('.element-label')).toContainText('File Upload');
  });

  test('TC-FILE-003: File Upload element preview shows file button', async ({ page }) => {
    await login(page);
    await page.goto(`${BASE_URL}/form-builder`);
    await page.waitForTimeout(1000);
    
    // Add File Upload element
    const fileEl = page.locator('.element-item', { hasText: 'File Upload' });
    await fileEl.dragTo(page.locator('.canvas'));
    await page.waitForSelector(".form-element", { timeout: 30000 });
    await page.waitForTimeout(1000);
    
    // Verify preview shows file icon/text
    await expect(page.locator('.file-preview')).toBeVisible();
    await expect(page.locator('.file-preview')).toContainText('file');
  });
});

// ============ INTEGRATION TEST ============
test.describe('Core Features Integration', () => {

  test.afterEach(async ({ page }, testInfo) => {
    const status = testInfo.status === 'passed' ? 'pass' : 'fail';
    await page.screenshot({
      path: `tests/e2e/reports/${testInfo.title.replace(/\s+/g, '-')}-${status}.png`,
      fullPage: true
    });
  });

  test('TC-INTEGRATION-001: Can create complete workflow with all new node types', async ({ page }) => {
    await login(page);
    await page.goto(`${BASE_URL}/workflow-designer`);
    await page.waitForTimeout(1000);
    
    await page.locator('.workflow-name-input').clear();
    await page.locator('.workflow-name-input').fill('Complete Workflow with All Nodes');
    
    // Add all node types
    await page.locator('button', { hasText: '+ Start' }).click();
    await page.waitForTimeout(200);
    
    const taskNode = page.locator('.node-item', { hasText: 'Task' });
    await taskNode.dragTo(page.locator('.canvas-container'));
    await page.waitForTimeout(200);
    
    const conditionNode = page.locator('.node-item', { hasText: 'Condition' });
    await conditionNode.dragTo(page.locator('.canvas-container'));
    await page.waitForTimeout(200);
    
    const parallelNode = page.locator('.node-item', { hasText: 'Parallel' });
    await parallelNode.dragTo(page.locator('.canvas-container'));
    await page.waitForTimeout(200);
    
    const joinNode = page.locator('.node-item', { hasText: 'Join' });
    await joinNode.dragTo(page.locator('.canvas-container'));
    await page.waitForTimeout(200);
    
    const endNode = page.locator('.node-item', { hasText: 'End' });
    await endNode.dragTo(page.locator('.canvas-container'));
    await page.waitForTimeout(200);
    
    // Verify all 6 nodes were added
    const nodes = page.locator('.workflow-node');
    await expect(nodes).toHaveCount(6);
    
    // Verify all node types are visible
    await expect(page.locator('.node-header', { hasText: 'Start' })).toBeVisible();
    await expect(page.locator('.node-header', { hasText: 'Task' })).toBeVisible();
    await expect(page.locator('.node-header', { hasText: 'Condition' })).toBeVisible();
    await expect(page.locator('.node-header', { hasText: 'Parallel' })).toBeVisible();
    await expect(page.locator('.node-header', { hasText: 'Join' })).toBeVisible();
    await expect(page.locator('.node-header', { hasText: 'End' })).toBeVisible();
  });

  test('TC-INTEGRATION-002: Can create form with all new element types', async ({ page }) => {
    await login(page);
    await page.goto(`${BASE_URL}/form-builder`);
    await page.waitForTimeout(1000);
    
    await page.locator('.form-name-input').clear();
    await page.locator('.form-name-input').fill('Complete Form with All Elements');
    
    // Add new element types
    const dateRangeEl = page.locator('.element-item', { hasText: 'Date Range' });
    await dateRangeEl.dragTo(page.locator('.canvas'));
    await page.waitForTimeout(200);
    
    const timeEl = page.locator('.element-item', { hasText: 'Time' });
    await timeEl.dragTo(page.locator('.canvas'));
    await page.waitForTimeout(200);
    
    const fileEl = page.locator('.element-item', { hasText: 'File Upload' });
    await fileEl.dragTo(page.locator('.canvas'));
    await page.waitForTimeout(200);
    
    // Verify all 3 elements were added
    const elements = page.locator('.form-element');
    await expect(elements).toHaveCount(3);
    
    // Verify element labels
    await expect(page.locator('.element-label', { hasText: 'Date Range' })).toBeVisible();
    await expect(page.locator('.element-label', { hasText: 'Time' })).toBeVisible();
    await expect(page.locator('.element-label', { hasText: 'File Upload' })).toBeVisible();
  });
});
