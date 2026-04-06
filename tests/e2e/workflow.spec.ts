import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:4200';
const TEST_USER = { email: 'admin@example.com', password: 'password123' };

async function login(page: any) {
  await page.goto(BASE_URL, { waitUntil: 'networkidle' });
  await page.locator('input[type="email"], input[name="email"]').fill(TEST_USER.email);
  await page.locator('input[type="password"]').fill(TEST_USER.password);
  await page.locator('button[type="submit"]').click();
  await page.waitForTimeout(1500);
}

test.describe('Workflow Integration', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });
    await page.evaluate(() => localStorage.clear());
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });
  });

  test.afterEach(async ({ page }, testInfo) => {
    const status = testInfo.status === 'passed' ? 'pass' : 'fail';
    await page.screenshot({ 
      path: `tests/e2e/reports/${testInfo.title.replace(/\s+/g, '-')}-${status}.png`,
      fullPage: true 
    });
  });

  test('TC-WFLIST-001: Workflows list page loads', async ({ page }) => {
    await login(page);
    await page.goto(`${BASE_URL}/workflows`, { waitUntil: 'networkidle' });
    await page.waitForSelector('.workflow-card, h3', { timeout: 30000 });
    await expect(page.locator('h3').first()).toBeVisible();
  });

  test('TC-WFDESIGN-001: Can create workflow with multiple nodes', async ({ page }) => {
    await login(page);
    await page.goto(`${BASE_URL}/workflow-designer`, { waitUntil: 'networkidle' });
    
    await page.locator('.workflow-name-input').fill('Test Workflow Designer');
    
    // Add start node
    await page.locator('button', { hasText: '+ Start' }).click();
    await page.waitForTimeout(500);
    
    // Drag task node
    const taskNode = page.locator('.node-item', { hasText: 'Task' });
    await taskNode.dragTo(page.locator('.canvas-container'), { targetPosition: { x: 300, y: 80 } });
    await page.waitForTimeout(500);
    
    // Drag end node
    const endNode = page.locator('.node-item', { hasText: 'End' });
    await endNode.dragTo(page.locator('.canvas-container'), { targetPosition: { x: 500, y: 80 } });
    await page.waitForTimeout(500);
    
    // Verify nodes on canvas
    await expect(page.locator('.workflow-node')).toHaveCount(3);
    
    page.on('dialog', dialog => dialog.accept());
    await page.locator('button', { hasText: 'Save Workflow' }).click();
    await page.waitForTimeout(1500);
  });

  test('TC-WFDESIGN-002: Can edit node properties', async ({ page }) => {
    await login(page);
    await page.goto(`${BASE_URL}/workflow-designer`, { waitUntil: 'networkidle' });
    await page.locator('.workflow-name-input').fill('Node Edit Test');
    await page.locator('button', { hasText: '+ Start' }).click();
    await page.waitForTimeout(300);
    
    const taskNode = page.locator('.node-item', { hasText: 'Task' });
    await taskNode.dragTo(page.locator('.canvas-container'), { targetPosition: { x: 300, y: 80 } });
    await page.waitForTimeout(300);
    
    await page.locator('.workflow-node').nth(1).click();
    await page.waitForTimeout(200);
    
    const labelInput = page.locator('.property-form input[type="text"]').nth(1);
    await labelInput.fill('Updated Task Name');
    await page.waitForTimeout(200);
    
    await expect(labelInput).toHaveValue('Updated Task Name');
  });

  test('TC-WFDESIGN-003: Can save workflow', async ({ page }) => {
    const wfName = `Save Test WF ${Date.now()}`;
    await login(page);
    await page.goto(`${BASE_URL}/workflow-designer`, { waitUntil: 'networkidle' });
    await page.locator('.workflow-name-input').fill(wfName);
    await page.locator('button', { hasText: '+ Start' }).click();
    await page.waitForTimeout(300);
    
    const taskNode = page.locator('.node-item', { hasText: 'Task' });
    await taskNode.dragTo(page.locator('.canvas-container'), { targetPosition: { x: 300, y: 80 } });
    await page.waitForTimeout(300);
    
    page.on('dialog', dialog => dialog.accept());
    await page.locator('button', { hasText: 'Save Workflow' }).click();
    await page.waitForTimeout(2000);
    
    // Navigate to workflows list and verify the workflow was saved
    await page.goto(`${BASE_URL}/workflows`, { waitUntil: 'networkidle' });
    await page.waitForSelector('.workflow-card, h3', { timeout: 30000 });
    await expect(page.locator('h3', { hasText: wfName }).first()).toBeVisible();
  });

  test('TC-WFPLAYER-001: Can start and complete a workflow', async ({ page }) => {
    const workflowName = `Player Test ${Date.now()}`;
    page.on('console', msg => { if (msg.text().includes('DEBUG')) process.stdout.write('BROWSER LOG: ' + msg.text() + '\n'); });
    await login(page);
    
    // Create workflow in designer
    await page.goto(`${BASE_URL}/workflow-designer`, { waitUntil: 'networkidle' });
    await page.locator('.workflow-name-input').fill(workflowName);
    await page.locator('button', { hasText: '+ Start' }).click();
    await page.waitForTimeout(500);
    
    // Add Task node
    const taskNode = page.locator('.node-item', { hasText: 'Task' });
    await taskNode.dragTo(page.locator('.canvas-container'), { targetPosition: { x: 300, y: 80 } });
    await page.waitForTimeout(500);
    
    // Add End node
    const endNode = page.locator('.node-item', { hasText: 'End' });
    await endNode.dragTo(page.locator('.canvas-container'), { targetPosition: { x: 500, y: 80 } });
    await page.waitForTimeout(500);
    
    // Verify 3 nodes on canvas
    await expect(page.locator('.workflow-node')).toHaveCount(3);
    
    // Edit task label
    await page.locator('.workflow-node').nth(1).click();
    await page.waitForTimeout(300);
    await page.locator('.property-form input[type="text"]').nth(1).fill('Review Request');
    await page.waitForTimeout(300);
    
    // Save workflow
    page.on('dialog', dialog => dialog.accept());
    await page.locator('button', { hasText: 'Save Workflow' }).click();
    await page.waitForTimeout(2000);
    
    // Navigate to workflows list and find our specific workflow
    await page.goto(`${BASE_URL}/workflows`, { waitUntil: 'networkidle' });
    await page.waitForSelector(`h3:has-text("${workflowName}")`, { timeout: 30000 });
    
    // Click the Start Workflow button for our specific workflow
    // The list shows workflows in cards, find the card with our workflow name then click its Start button
    const workflowCard = page.locator('.workflow-card', { has: page.locator(`h3:has-text("${workflowName}")`) });
    await workflowCard.locator('a:has-text("Start Workflow")').click();
    await page.waitForTimeout(1000);
    
    // Verify we're in the player
    await expect(page.locator('.workflow-player')).toBeVisible();
    await expect(page.locator('h1')).toContainText(workflowName);
    
    // Verify 3 step items are rendered (Start + Task + End)
    await expect(page.locator('.step-item')).toHaveCount(3);
    
    // Click Start Workflow button
    await expect(page.locator('button', { hasText: 'Start Workflow' })).toBeVisible();
    await page.locator('button', { hasText: 'Start Workflow' }).click();
    
    // Wait for start section to disappear (proves startWorkflow was called)
    // Also check if button is actually clickable
    const btnVisible = await page.locator('.start-section button').isVisible();
    console.log('Start button visible:', btnVisible);
    
    try {
      await page.waitForSelector('.start-section', { state: 'hidden', timeout: 5000 });
    } catch {
      await page.screenshot({ path: 'tests/e2e/reports/start-debug.png', fullPage: true });
      throw new Error('Start section not hidden after click');
    }
    await page.waitForTimeout(1000);
    
    // After starting: Task step should be active, Start should be completed
    await expect(page.locator('.step-item.active .step-label')).toContainText('Review Request');
    await expect(page.locator('.step-item.completed')).toHaveCount(1);
    
    // Complete task - click Next Step
    await page.locator('button', { hasText: 'Next Step' }).click();
    await page.waitForTimeout(2000);
    
    // Workflow should be completed
    await expect(page.locator('.completed-section h2')).toContainText('Workflow Completed');
  });

  test('TC-WFPLAYER-002: Workflow progress is tracked correctly', async ({ page }) => {
    const workflowName = `Multi-Step ${Date.now()}`;
    await login(page);
    
    // Create multi-step workflow
    await page.goto(`${BASE_URL}/workflow-designer`, { waitUntil: 'networkidle' });
    await page.locator('.workflow-name-input').fill(workflowName);
    await page.locator('button', { hasText: '+ Start' }).click();
    await page.waitForTimeout(300);
    
    const taskNode = page.locator('.node-item', { hasText: 'Task' });
    await taskNode.dragTo(page.locator('.canvas-container'), { targetPosition: { x: 200, y: 80 } });
    await page.waitForTimeout(300);
    
    const approvalNode = page.locator('.node-item', { hasText: 'Approval' });
    await approvalNode.dragTo(page.locator('.canvas-container'), { targetPosition: { x: 400, y: 80 } });
    await page.waitForTimeout(300);
    
    page.on('dialog', dialog => dialog.accept());
    await page.locator('button', { hasText: 'Save Workflow' }).click();
    await page.waitForTimeout(2000);
    
    // Go to player
    await page.goto(`${BASE_URL}/workflows`, { waitUntil: 'networkidle' });
    await page.waitForSelector(`h3:has-text("${workflowName}")`, { timeout: 30000 });
    const workflowCard = page.locator('.workflow-card', { has: page.locator(`h3:has-text("${workflowName}")`) });
    await workflowCard.locator('a:has-text("Start Workflow")').click();
    await page.waitForTimeout(1000);
    
    // Should have 4 step items (Start, 2x Task, Approval, End?) - at minimum Start + Task + Approval
    const stepCount = await page.locator('.step-item').count();
    expect(stepCount).toBeGreaterThanOrEqual(3);
    
    // Start the workflow
    await page.locator('button', { hasText: 'Start Workflow' }).click();
    await page.waitForSelector('.start-section', { state: 'hidden', timeout: 10000 }).catch(() => {
      console.log('START SECTION STILL VISIBLE');
    });
    await page.waitForTimeout(1000);
    
    // Verify progress tracking
    await expect(page.locator('.step-item.completed')).toHaveCount(1);
    await expect(page.locator('.step-item.active')).toHaveCount(1);
  });
});
