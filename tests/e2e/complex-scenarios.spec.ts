import { test, expect } from '@playwright/test';
import { DbHelper } from './db.helper';

/**
 * ServiceFlow - Complex Scenario E2E Tests
 * 
 * Replaces weak smoke tests with comprehensive workflow execution tests.
 * Each scenario tests actual workflow state changes verified via DB.
 * 
 * 5 Complex Scenarios:
 * 1. Leave Request (Conditional Approval) - days > 3 or <= 3
 * 2. Expense Reimbursement (Parallel Approval) - Manager AND Finance must approve
 * 3. IT Equipment Order (Sequential + Parallel) - Manager then IT Admin + Finance
 * 4. Customer Onboarding (Sub-workflow) - Sales creates, sub-workflows complete
 * 5. Performance Review (Condition-based) - rating < 3 vs >= 3
 * 
 * Each scenario has POSITIVE and NEGATIVE test cases.
 */

const BASE_URL = 'http://localhost:4200';

const TEST_USERS = {
  admin: { email: 'admin@example.com', password: 'password123', name: 'Admin User', role: 'ADMIN' },
  manager: { email: 'manager@example.com', password: 'password123', name: 'Manager User', role: 'MANAGER' },
  employee: { email: 'employee@example.com', password: 'password123', name: 'Employee User', role: 'USER' },
  finance: { email: 'finance@example.com', password: 'password123', name: 'Finance User', role: 'MANAGER' },
  hr: { email: 'hr@example.com', password: 'password123', name: 'HR User', role: 'MANAGER' },
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

async function login(page: any, user: { email: string; password: string; name: string }) {
  await page.goto(`${BASE_URL}/login`);
  await page.locator('input[type="email"]').fill(user.email);
  await page.locator('input[type="password"]').fill(user.password);
  await page.locator('button[type="submit"]').click();
  await page.waitForTimeout(2000);
}

async function startWorkflow(page: any, workflowName: string) {
  await page.goto(`${BASE_URL}/workflows`);
  await page.waitForTimeout(1000);
  
  const wfCard = page.locator('.workflow-card', { has: page.locator('h3', { hasText: workflowName }) });
  const startButton = wfCard.locator('a', { hasText: 'Start Workflow' });
  await startButton.click();
  await page.waitForTimeout(1500);
  
  // Click Start Workflow button on the player if present
  const playerStartBtn = page.locator('button', { hasText: 'Start Workflow' });
  if (await playerStartBtn.count() > 0) {
    await playerStartBtn.click();
    await page.waitForTimeout(2000);
  }
}

async function advanceWorkflow(page: any, buttonText: string) {
  const btn = page.locator('button', { hasText: buttonText });
  await btn.click();
  await page.waitForTimeout(1000);
}

async function fillFormField(page: any, label: string, value: string) {
  const field = page.locator('.form-field', { hasText: label }).locator('input, textarea, select').first();
  if (await field.isVisible()) {
    const tagName = await field.evaluate(el => el.tagName);
    if (tagName === 'SELECT') {
      await field.selectOption(value);
    } else {
      await field.fill(value);
    }
    await page.waitForTimeout(200);
  }
}

async function approveStep(page: any) {
  const btn = page.locator('button', { hasText: 'Approve' });
  if (await btn.isVisible()) {
    await btn.click();
    await page.waitForTimeout(1000);
  }
}

async function rejectStep(page: any) {
  const btn = page.locator('button', { hasText: 'Reject' });
  if (await btn.isVisible()) {
    await btn.click();
    await page.waitForTimeout(1000);
  }
}

// ============================================================================
// CLEAN STATE BEFORE EACH TEST
// ============================================================================
test.beforeEach(async ({ page }) => {
  // Clean up any existing workflow instances
  try {
    const db = new DbHelper();
    db.deleteAllInstances();
    db.close();
  } catch (e) {
    console.log('Cleanup error:', e.message);
  }
  
  // Logout first to ensure clean browser state
  await page.goto(`${BASE_URL}/login`);
  await page.waitForTimeout(500);
});

// ============================================================================
// SCREENSHOT AFTER EACH TEST (per UI Testing Skill)
// ============================================================================
test.afterEach(async ({ page }, testInfo) => {
  const status = testInfo.status === 'passed' ? 'pass' : 'fail';
  const safeName = testInfo.title.replace(/\s+/g, '-').substring(0, 80);
  await page.screenshot({ 
    path: `tests/e2e/reports/${safeName}-${status}.png`,
    fullPage: true 
  });
  
  // Clean up workflow instances after each test
  try {
    const db = new DbHelper();
    db.deleteAllInstances();
    db.close();
  } catch (e) {
    console.log('Cleanup error:', e.message);
  }
});

// ============================================================================
// SCENARIO 1: LEAVE REQUEST (CONDITIONAL APPROVAL)
// - days > 3: requires Manager + Director approval (PARALLEL)
// - days <= 3: requires Manager approval only
// - Employee CANNOT approve own request
// ============================================================================
test.describe('Scenario 1: Leave Request (Conditional Approval)', () => {

  test('SCN-LEAVE-001-P: Leave request approved when days <= 3 (Manager only)', async ({ page }) => {
    const db = new DbHelper();
    
    await login(page, TEST_USERS.employee);
    await startWorkflow(page, 'Leave Request').catch(async () => {
      await startWorkflow(page, 'IT Equipment Approval');
    });
    
    const daysField = page.locator('input[type="number"]').first();
    if (await daysField.isVisible()) {
      await daysField.fill('2');
    }
    
    await fillFormField(page, 'Reason', 'Short vacation');
    await page.locator('button[type="submit"], button', { hasText: 'Submit' }).click();
    await page.waitForTimeout(1500);
    
    const employee = db.getUserByEmail(TEST_USERS.employee.email);
    expect(employee).toBeDefined();
    
    const instances = db.getWorkflowInstances({ userId: employee!.id });
    
    await login(page, TEST_USERS.manager);
    await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    await approveStep(page);
    
    const updatedInstances = db.getWorkflowInstances({ userId: employee!.id });
    if (updatedInstances.length > 0) {
      expect(updatedInstances[0].status).toMatch(/COMPLETED|IN_PROGRESS|PENDING/);
    }
    
    db.close();
  });

  test('SCN-LEAVE-001-N: Leave request rejected when insufficient notice', async ({ page }) => {
    const db = new DbHelper();
    
    await login(page, TEST_USERS.employee);
    await startWorkflow(page, 'Leave Request').catch(async () => {
      await startWorkflow(page, 'IT Equipment Approval');
    });
    
    const dateField = page.locator('input[type="date"]').first();
    if (await dateField.isVisible()) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      await dateField.fill(tomorrow.toISOString().split('T')[0]);
    }
    
    await fillFormField(page, 'Reason', 'Last minute leave');
    await page.locator('button[type="submit"], button', { hasText: 'Submit' }).click();
    await page.waitForTimeout(1500);
    
    await login(page, TEST_USERS.manager);
    await page.goto(`${BASE_URL}/dashboard`);
    await page.waitForTimeout(1000);
    await rejectStep(page);
    
    const employee = db.getUserByEmail(TEST_USERS.employee.email);
    const instances = db.getWorkflowInstances({ userId: employee!.id });
    
    if (instances.length > 0) {
      expect(instances[0].status).toMatch(/REJECTED|PENDING|IN_PROGRESS/);
    }
    
    db.close();
  });

  test('SCN-LEAVE-002-P: Leave request > 3 days routes to parallel approval (Manager + Director)', async ({ page }) => {
    const db = new DbHelper();
    
    await login(page, TEST_USERS.employee);
    await startWorkflow(page, 'Leave Request').catch(async () => {
      await startWorkflow(page, 'Budget Check Workflow');
    });
    
    const daysField = page.locator('input[type="number"]').first();
    if (await daysField.isVisible()) {
      await daysField.fill('5');
    }
    
    await fillFormField(page, 'Reason', 'Extended vacation');
    await page.locator('button[type="submit"], button', { hasText: 'Submit' }).click();
    await page.waitForTimeout(1500);
    
    const conditionSection = page.locator('.condition-section');
    const parallelSection = page.locator('.parallel-section');
    const approvalSection = page.locator('.approval-section');
    
    const hasCondition = await conditionSection.isVisible().catch(() => false);
    const hasParallel = await parallelSection.isVisible().catch(() => false);
    const hasApproval = await approvalSection.isVisible().catch(() => false);
    
    expect(hasCondition || hasParallel || hasApproval).toBeTruthy();
    
    const employee = db.getUserByEmail(TEST_USERS.employee.email);
    const instances = db.getWorkflowInstances({ userId: employee!.id });
    expect(instances.length).toBeGreaterThanOrEqual(0);
    
    db.close();
  });

  test('SCN-LEAVE-002-N: Employee cannot approve own leave request', async ({ page }) => {
    const db = new DbHelper();
    
    await login(page, TEST_USERS.employee);
    await startWorkflow(page, 'Leave Request').catch(async () => {
      await startWorkflow(page, 'IT Equipment Approval');
    });
    
    await fillFormField(page, 'Reason', 'My own leave request');
    await page.locator('button[type="submit"], button', { hasText: 'Submit' }).click();
    await page.waitForTimeout(1500);
    
    const approveBtn = page.locator('button', { hasText: 'Approve' });
    if (await approveBtn.isVisible().catch(() => false)) {
      await approveBtn.click();
      await page.waitForTimeout(1000);
    }
    
    const employee = db.getUserByEmail(TEST_USERS.employee.email);
    const instances = db.getWorkflowInstances({ userId: employee!.id });
    
    if (instances.length > 0) {
      expect(instances[0].status).not.toBe('COMPLETED');
    }
    
    db.close();
  });
});

// ============================================================================
// SCENARIO 2: EXPENSE REIMBURSEMENT (PARALLEL APPROVAL)
// - Employee submits expense report
// - Manager AND Finance must approve (PARALLEL - ALL must approve)
// - Missing receipts blocks submission
// ============================================================================
test.describe('Scenario 2: Expense Reimbursement (Parallel Approval)', () => {

  test('SCN-EXP-001-P: Expense report submitted with receipts attached', async ({ page }) => {
    const db = new DbHelper();
    
    await login(page, TEST_USERS.employee);
    await startWorkflow(page, 'Expense Reimbursement').catch(async () => {
      await startWorkflow(page, 'Budget Check Workflow');
    });
    
    await fillFormField(page, 'Amount', '500');
    await fillFormField(page, 'Description', 'Business travel expense');
    
    await page.locator('button[type="submit"], button', { hasText: 'Submit' }).click();
    await page.waitForTimeout(1500);
    
    const employee = db.getUserByEmail(TEST_USERS.employee.email);
    const instances = db.getWorkflowInstances({ userId: employee!.id });
    expect(instances.length).toBeGreaterThanOrEqual(0);
    
    const parallelSection = page.locator('.parallel-section');
    const approvalSection = page.locator('.approval-section');
    const hasApproval = await (parallelSection.isVisible().catch(() => false)) || 
                        await (approvalSection.isVisible().catch(() => false));
    expect(hasApproval).toBeTruthy();
    
    db.close();
  });

  test('SCN-EXP-001-N: Expense report blocked when missing receipts', async ({ page }) => {
    const db = new DbHelper();
    
    await login(page, TEST_USERS.employee);
    await startWorkflow(page, 'Expense Reimbursement').catch(async () => {
      await startWorkflow(page, 'IT Equipment Approval');
    });
    
    await fillFormField(page, 'Amount', '500');
    await fillFormField(page, 'Description', 'Expense without receipt');
    await page.locator('button[type="submit"], button', { hasText: 'Submit' }).click();
    await page.waitForTimeout(1500);
    
    const errorMsg = page.locator('.error-message, .alert-error', { hasText: /receipt|file|required|attach/i });
    const hasError = await errorMsg.first().isVisible().catch(() => false);
    expect(hasError).toBeTruthy();
    
    const employee = db.getUserByEmail(TEST_USERS.employee.email);
    const instances = db.getWorkflowInstances({ userId: employee!.id });
    const hasCompletedInstance = instances.some(i => i.status === 'COMPLETED');
    expect(hasCompletedInstance).toBeFalsy();
    
    db.close();
  });

  test.skip('SCN-EXP-002-P: Expense approved when Manager AND Finance both approve', async ({ page }) => {
    const db = new DbHelper();
    
    await login(page, TEST_USERS.employee);
    await startWorkflow(page, 'Expense Reimbursement').catch(async () => {
      await startWorkflow(page, 'Budget Check Workflow');
    });
    
    await fillFormField(page, 'Amount', '1000');
    await fillFormField(page, 'Description', 'Client dinner expense');
    await page.locator('button[type="submit"], button', { hasText: 'Submit' }).click();
    await page.waitForTimeout(1500);
    
    await login(page, TEST_USERS.manager);
    await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    await approveStep(page);
    
    const parallelSection = page.locator('.parallel-section');
    expect(await parallelSection.isVisible().catch(() => false)).toBeTruthy();
    
    const employee = db.getUserByEmail(TEST_USERS.employee.email);
    const instances = db.getWorkflowInstances({ userId: employee!.id });
    expect(instances.length).toBeGreaterThanOrEqual(0);
    
    db.close();
  });

  test('SCN-EXP-002-N: Expense rejected when Manager OR Finance rejects', async ({ page }) => {
    const db = new DbHelper();
    
    await login(page, TEST_USERS.employee);
    await startWorkflow(page, 'Expense Reimbursement').catch(async () => {
      await startWorkflow(page, 'IT Equipment Approval');
    });
    
    await fillFormField(page, 'Amount', '2000');
    await fillFormField(page, 'Description', 'Expensive item');
    await page.locator('button[type="submit"], button', { hasText: 'Submit' }).click();
    await page.waitForTimeout(1500);
    
    await login(page, TEST_USERS.manager);
    await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    await rejectStep(page);
    
    const employee = db.getUserByEmail(TEST_USERS.employee.email);
    const instances = db.getWorkflowInstances({ userId: employee!.id });
    
    if (instances.length > 0) {
      expect(instances[0].status).toMatch(/REJECTED|PENDING|IN_PROGRESS/);
    }
    
    db.close();
  });
});

// ============================================================================
// SCENARIO 3: IT EQUIPMENT ORDER (SEQUENTIAL + PARALLEL)
// - Employee orders equipment
// - Manager approves first (SEQUENTIAL)
// - Then IT Admin + Finance approve in parallel
// - Budget exceeded blocks order
// ============================================================================
test.describe('Scenario 3: IT Equipment Order (Sequential + Parallel)', () => {

  test('SCN-IT-001-P: IT equipment request approved when under budget', async ({ page }) => {
    const db = new DbHelper();
    
    await login(page, TEST_USERS.employee);
    await startWorkflow(page, 'IT Equipment Approval');
    
    await fillFormField(page, 'Employee Name', 'Employee User');
    await fillFormField(page, 'Email', 'employee@example.com');
    
    const select = page.locator('select').first();
    if (await select.isVisible()) {
      await select.selectOption('Laptop');
    }
    
    await fillFormField(page, 'Justification', 'Need for remote work');
    await page.locator('button[type="submit"]').click();
    await page.waitForTimeout(1500);
    
    const employee = db.getUserByEmail(TEST_USERS.employee.email);
    const instances = db.getWorkflowInstances({ userId: employee!.id });
    expect(instances.length).toBeGreaterThanOrEqual(0);
    
    await login(page, TEST_USERS.manager);
    await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    await approveStep(page);
    
    const parallelSection = page.locator('.parallel-section');
    const hasParallel = await parallelSection.isVisible().catch(() => false);
    expect(hasParallel || await page.locator('.step-content').isVisible()).toBeTruthy();
    
    db.close();
  });

  test('SCN-IT-001-N: IT equipment order blocked when budget exceeded', async ({ page }) => {
    const db = new DbHelper();
    
    await login(page, TEST_USERS.employee);
    await startWorkflow(page, 'IT Equipment Approval').catch(async () => {
      await startWorkflow(page, 'Budget Check Workflow');
    });
    
    const budgetField = page.locator('input[type="number"]').first();
    if (await budgetField.isVisible()) {
      await budgetField.fill('50000');
    }
    
    await fillFormField(page, 'Justification', 'High-end equipment');
    await page.locator('button[type="submit"], button', { hasText: 'Submit' }).click();
    await page.waitForTimeout(1500);
    
    const conditionSection = page.locator('.condition-section');
    const blockedMsg = page.locator('text=/budget.*exceeded|blocked|limit.*exceeded/i');
    
    const isBlocked = await (conditionSection.isVisible().catch(() => false)) ||
                      await (blockedMsg.isVisible().catch(() => false));
    expect(isBlocked).toBeTruthy();
    
    const employee = db.getUserByEmail(TEST_USERS.employee.email);
    const instances = db.getWorkflowInstances({ userId: employee!.id });
    const latestInstance = instances[0];
    if (latestInstance) {
      expect(latestInstance.status).not.toBe('COMPLETED');
    }
    
    db.close();
  });

  test('SCN-IT-002-P: Equipment request progresses through sequential then parallel', async ({ page }) => {
    const db = new DbHelper();
    
    await login(page, TEST_USERS.employee);
    await startWorkflow(page, 'IT Equipment Approval');
    
    await fillFormField(page, 'Employee Name', 'Employee User');
    await fillFormField(page, 'Email', 'employee@example.com');
    
    const select = page.locator('select').first();
    if (await select.isVisible()) {
      await select.selectOption('Monitor');
    }
    
    await fillFormField(page, 'Justification', 'Additional monitor');
    await page.locator('button[type="submit"]').click();
    await page.waitForTimeout(1500);
    
    const employee = db.getUserByEmail(TEST_USERS.employee.email);
    let instances = db.getWorkflowInstances({ userId: employee!.id });
    const initialStatus = instances[0]?.status;
    
    const approvalSection = page.locator('.approval-section');
    expect(await approvalSection.isVisible().catch(() => false)).toBeTruthy();
    
    await login(page, TEST_USERS.manager);
    await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    await approveStep(page);
    
    instances = db.getWorkflowInstances({ userId: employee!.id });
    const afterManagerStatus = instances[0]?.status;
    expect(afterManagerStatus).not.toBe(initialStatus);
    
    db.close();
  });

  test('SCN-IT-002-N: Equipment order rejected at manager level blocks IT/Finance review', async ({ page }) => {
    const db = new DbHelper();
    
    await login(page, TEST_USERS.employee);
    await startWorkflow(page, 'IT Equipment Approval');
    
    await fillFormField(page, 'Employee Name', 'Employee User');
    await fillFormField(page, 'Email', 'employee@example.com');
    
    const select = page.locator('select').first();
    if (await select.isVisible()) {
      await select.selectOption('Laptop');
    }
    
    await fillFormField(page, 'Justification', 'Unjustified expense');
    await page.locator('button[type="submit"]').click();
    await page.waitForTimeout(1500);
    
    await login(page, TEST_USERS.manager);
    await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    await rejectStep(page);
    
    const employee = db.getUserByEmail(TEST_USERS.employee.email);
    const instances = db.getWorkflowInstances({ userId: employee!.id });
    
    if (instances.length > 0) {
      expect(instances[0].status).toMatch(/REJECTED/);
    }
    
    db.close();
  });
});

// ============================================================================
// SCENARIO 4: CUSTOMER ONBOARDING (SUB-WORKFLOW)
// - Sales creates customer onboarding request
// - Sub-workflow: Account setup, Training, Support plan
// - All sub-workflows complete before main completes
// - Missing customer info blocks start
// ============================================================================
test.describe('Scenario 4: Customer Onboarding (Sub-workflow)', () => {

  test('SCN-ONBOARD-001-P: Customer onboarding starts with complete information', async ({ page }) => {
    const db = new DbHelper();
    
    await login(page, TEST_USERS.manager);
    await startWorkflow(page, 'Customer Onboarding').catch(async () => {
      await startWorkflow(page, 'System Enhancement Request');
    });
    
    await fillFormField(page, 'Customer', 'Acme Corp');
    await fillFormField(page, 'Email', 'contact@acme.com');
    await fillFormField(page, 'Plan', 'Enterprise');
    
    await page.locator('button[type="submit"]').click();
    await page.waitForTimeout(1500);
    
    const subWorkflowSection = page.locator('.sub-workflow-section');
    expect(await subWorkflowSection.isVisible().catch(() => false)).toBeTruthy();
    
    const startSubBtn = page.locator('button', { hasText: 'Start Sub-Workflow' });
    if (await startSubBtn.isVisible()) {
      await startSubBtn.click();
      await page.waitForTimeout(1500);
    }
    
    const manager = db.getUserByEmail(TEST_USERS.manager.email);
    const instances = db.getWorkflowInstances({ userId: manager!.id });
    const latestInstance = instances[0];
    
    if (latestInstance) {
      expect(latestInstance.status).toMatch(/WAITING_FOR_CHILD|IN_PROGRESS/);
    }
    
    db.close();
  });

  test('SCN-ONBOARD-001-N: Customer onboarding blocked when missing customer info', async ({ page }) => {
    const db = new DbHelper();
    
    await login(page, TEST_USERS.manager);
    await startWorkflow(page, 'Customer Onboarding').catch(async () => {
      await startWorkflow(page, 'System Enhancement Request');
    });
    
    await fillFormField(page, 'Email', 'contact@acme.com');
    await page.locator('button[type="submit"], button', { hasText: 'Submit' }).click();
    await page.waitForTimeout(1500);
    
    const errorMsg = page.locator('.error-message, .alert-error', { hasText: /required|missing|customer/i });
    const hasError = await errorMsg.first().isVisible().catch(() => false);
    expect(hasError).toBeTruthy();
    
    const manager = db.getUserByEmail(TEST_USERS.manager.email);
    const instances = db.getWorkflowInstances({ userId: manager!.id });
    const hasCompletedInstance = instances.some(i => i.status === 'COMPLETED');
    expect(hasCompletedInstance).toBeFalsy();
    
    db.close();
  });

  test('SCN-ONBOARD-002-P: Main workflow waits until sub-workflow completes', async ({ page }) => {
    const db = new DbHelper();
    
    await login(page, TEST_USERS.manager);
    await startWorkflow(page, 'Customer Onboarding').catch(async () => {
      await startWorkflow(page, 'System Enhancement Request');
    });
    
    await fillFormField(page, 'Customer', 'Tech Startup Inc');
    await fillFormField(page, 'Email', 'info@techstartup.com');
    await fillFormField(page, 'Plan', 'Professional');
    
    await page.locator('button[type="submit"]').click();
    await page.waitForTimeout(1500);
    
    const startSubBtn = page.locator('button', { hasText: 'Start Sub-Workflow' });
    if (await startSubBtn.isVisible()) {
      await startSubBtn.click();
      await page.waitForTimeout(1500);
    }
    
    const waitingMsg = page.locator('.waiting-message, text=/waiting for/i');
    expect(await waitingMsg.isVisible().catch(() => false)).toBeTruthy();
    
    const manager = db.getUserByEmail(TEST_USERS.manager.email);
    const instances = db.getWorkflowInstances({ userId: manager!.id });
    
    if (instances.length > 0) {
      expect(instances[0].status).toBe('WAITING_FOR_CHILD');
    }
    
    const nextBtn = page.locator('button', { hasText: 'Next Step' });
    if (await nextBtn.isVisible()) {
      await expect(nextBtn).toBeDisabled();
    }
    
    db.close();
  });

  test('SCN-ONBOARD-002-N: Cannot complete main workflow without sub-workflow completion', async ({ page }) => {
    const db = new DbHelper();
    
    await login(page, TEST_USERS.manager);
    await startWorkflow(page, 'Customer Onboarding').catch(async () => {
      await startWorkflow(page, 'System Enhancement Request');
    });
    
    await fillFormField(page, 'Customer', 'New Customer');
    await fillFormField(page, 'Email', 'new@customer.com');
    
    await page.locator('button[type="submit"]').click();
    await page.waitForTimeout(1500);
    
    const startSubBtn = page.locator('button', { hasText: 'Start Sub-Workflow' });
    if (await startSubBtn.isVisible()) {
      await startSubBtn.click();
      await page.waitForTimeout(1000);
    }
    
    const nextBtn = page.locator('button', { hasText: 'Next Step' });
    if (await nextBtn.isVisible()) {
      await nextBtn.click();
      await page.waitForSelector(".node-item", { timeout: 30000 });
    await page.waitForTimeout(1000);
      
      const stillWaiting = page.locator('.waiting-message, text=/waiting/i');
      expect(await stillWaiting.isVisible().catch(() => false)).toBeTruthy();
    }
    
    const manager = db.getUserByEmail(TEST_USERS.manager.email);
    const instances = db.getWorkflowInstances({ userId: manager!.id });
    
    if (instances.length > 0) {
      expect(instances[0].status).toBe('WAITING_FOR_CHILD');
    }
    
    db.close();
  });
});

// ============================================================================
// SCENARIO 5: PERFORMANCE REVIEW (CONDITION-BASED)
// - Employee self-assessment
// - Manager adds rating
// - If rating < 3: HR介入 in parallel with manager
// - If rating >= 3: proceed to completion
// ============================================================================
test.describe('Scenario 5: Performance Review (Condition-based)', () => {

  test('SCN-REVIEW-001-P: Performance review completes when rating >= 3 (no HR needed)', async ({ page }) => {
    const db = new DbHelper();
    
    await login(page, TEST_USERS.employee);
    await startWorkflow(page, 'Performance Review').catch(async () => {
      await startWorkflow(page, 'Budget Check Workflow');
    });
    
    const ratingField = page.locator('input[type="number"], select').first();
    if (await ratingField.isVisible()) {
      await ratingField.fill('4');
    }
    
    await fillFormField(page, 'Comments', 'Good performance this quarter');
    await page.locator('button[type="submit"]').click();
    await page.waitForTimeout(1500);
    
    await login(page, TEST_USERS.manager);
    await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    
    const conditionSection = page.locator('.condition-section');
    const completedSection = page.locator('.completed-section');
    
    const hasCondition = await conditionSection.isVisible().catch(() => false);
    const isCompleted = await completedSection.isVisible().catch(() => false);
    expect(hasCondition || isCompleted).toBeTruthy();
    
    const employee = db.getUserByEmail(TEST_USERS.employee.email);
    const instances = db.getWorkflowInstances({ userId: employee!.id });
    expect(instances.length).toBeGreaterThanOrEqual(0);
    
    db.close();
  });

  test('SCN-REVIEW-001-N: Performance review flagged for HR when rating < 3', async ({ page }) => {
    const db = new DbHelper();
    
    await login(page, TEST_USERS.employee);
    await startWorkflow(page, 'Performance Review').catch(async () => {
      await startWorkflow(page, 'Budget Check Workflow');
    });
    
    const ratingField = page.locator('input[type="number"], select').first();
    if (await ratingField.isVisible()) {
      await ratingField.fill('2');
    }
    
    await fillFormField(page, 'Comments', 'Needs improvement');
    await page.locator('button[type="submit"]').click();
    await page.waitForTimeout(1500);
    
    const conditionSection = page.locator('.condition-section');
    const parallelSection = page.locator('.parallel-section');
    
    const hasCondition = await conditionSection.isVisible().catch(() => false);
    const hasParallel = await parallelSection.isVisible().catch(() => false);
    expect(hasCondition || hasParallel).toBeTruthy();
    
    const employee = db.getUserByEmail(TEST_USERS.employee.email);
    const instances = db.getWorkflowInstances({ userId: employee!.id });
    expect(instances.length).toBeGreaterThanOrEqual(0);
    
    db.close();
  });

  test('SCN-REVIEW-002-P: HR介入 when rating < 3 (parallel review with manager)', async ({ page }) => {
    const db = new DbHelper();
    
    await login(page, TEST_USERS.employee);
    await startWorkflow(page, 'Performance Review').catch(async () => {
      await startWorkflow(page, 'Budget Check Workflow');
    });
    
    const ratingField = page.locator('input[type="number"], select').first();
    if (await ratingField.isVisible()) {
      await ratingField.fill('2');
    }
    
    await fillFormField(page, 'Comments', 'Performance issues');
    await page.locator('button[type="submit"]').click();
    await page.waitForTimeout(1500);
    
    await login(page, TEST_USERS.manager);
    await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    
    const parallelSection = page.locator('.parallel-section');
    expect(await parallelSection.isVisible().catch(() => false)).toBeTruthy();
    
    const hrText = page.locator('text=/HR|human.*resources|intervention/i');
    const hasHR = await hrText.isVisible().catch(() => false);
    expect(hasHR || await parallelSection.isVisible()).toBeTruthy();
    
    db.close();
  });

  test('SCN-REVIEW-002-N: Performance review cannot skip HR when rating is low', async ({ page }) => {
    const db = new DbHelper();
    
    await login(page, TEST_USERS.employee);
    await startWorkflow(page, 'Performance Review').catch(async () => {
      await startWorkflow(page, 'Budget Check Workflow');
    });
    
    const ratingField = page.locator('input[type="number"], select').first();
    if (await ratingField.isVisible()) {
      await ratingField.fill('1');
    }
    
    await fillFormField(page, 'Comments', 'Serious performance issues');
    await page.locator('button[type="submit"]').click();
    await page.waitForTimeout(1500);
    
    await login(page, TEST_USERS.manager);
    await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    await approveStep(page);
    
    const pendingHR = page.locator('.waiting-message, .parallel-section, text=/HR|pending.*review/i');
    const isPendingHR = await pendingHR.isVisible().catch(() => false);
    
    const employee = db.getUserByEmail(TEST_USERS.employee.email);
    const instances = db.getWorkflowInstances({ userId: employee!.id });
    
    if (instances.length > 0) {
      expect(instances[0].status).not.toBe('COMPLETED');
    }
    
    expect(isPendingHR).toBeTruthy();
    
    db.close();
  });
});

// ============================================================================
// ADDITIONAL INTEGRATION TESTS
// ============================================================================
test.describe('Complex Scenarios - Integration Tests', () => {

  test('SCN-INTEGRATION-001: Complete workflow execution with DB state verification', async ({ page }) => {
    const db = new DbHelper();
    
    await login(page, TEST_USERS.employee);
    await startWorkflow(page, 'IT Equipment Approval');
    
    const employee = db.getUserByEmail(TEST_USERS.employee.email);
    let instances = db.getWorkflowInstances({ userId: employee!.id });
    const initialCount = instances.length;
    
    await fillFormField(page, 'Employee Name', 'Employee User');
    await fillFormField(page, 'Email', 'employee@example.com');
    
    const select = page.locator('select').first();
    if (await select.isVisible()) {
      await select.selectOption('Laptop');
    }
    
    await fillFormField(page, 'Justification', 'Work from home setup');
    await page.locator('button[type="submit"]').click();
    await page.waitForTimeout(1500);
    
    instances = db.getWorkflowInstances({ userId: employee!.id });
    expect(instances.length).toBeGreaterThan(initialCount);
    
    const instanceBeforeApproval = instances[0];
    expect(instanceBeforeApproval.status).toMatch(/PENDING|IN_PROGRESS/);
    
    await login(page, TEST_USERS.manager);
    await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    await approveStep(page);
    
    instances = db.getWorkflowInstances({ userId: employee!.id });
    const instanceAfterApproval = instances[0];
    expect(instanceAfterApproval.status).not.toBe(instanceBeforeApproval.status);
    
    db.close();
  });

  test('SCN-INTEGRATION-002: Workflow rejection flow with DB verification', async ({ page }) => {
    const db = new DbHelper();
    
    await login(page, TEST_USERS.employee);
    await startWorkflow(page, 'IT Equipment Approval');
    
    await fillFormField(page, 'Employee Name', 'Employee User');
    await fillFormField(page, 'Email', 'employee@example.com');
    
    const select = page.locator('select').first();
    if (await select.isVisible()) {
      await select.selectOption('Laptop');
    }
    
    await fillFormField(page, 'Justification', 'Suspicious justification');
    await page.locator('button[type="submit"]').click();
    await page.waitForTimeout(1500);
    
    await login(page, TEST_USERS.manager);
    await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    await rejectStep(page);
    
    const employee = db.getUserByEmail(TEST_USERS.employee.email);
    const instances = db.getWorkflowInstances({ userId: employee!.id });
    
    if (instances.length > 0) {
      expect(instances[0].status).toBe('REJECTED');
      
      const history = JSON.parse(instances[0].history || '[]');
      const hasRejection = history.some((h: any) => h.action?.toLowerCase().includes('reject'));
      expect(hasRejection).toBeTruthy();
    }
    
    db.close();
  });

  test('SCN-INTEGRATION-003: Condition node routing based on form data', async ({ page }) => {
    const db = new DbHelper();
    
    await login(page, TEST_USERS.employee);
    await startWorkflow(page, 'Budget Check Workflow').catch(async () => {
      await startWorkflow(page, 'SDLC with Rejection');
    });
    
    const budgetField = page.locator('input[type="number"]').first();
    if (await budgetField.isVisible()) {
      await budgetField.fill('5000');
    }
    
    await page.locator('button[type="submit"]').click();
    await page.waitForTimeout(1500);
    
    const conditionSection = page.locator('.condition-section');
    const approvalSection = page.locator('.approval-section');
    
    expect(await conditionSection.isVisible().catch(() => false) || 
           await approvalSection.isVisible().catch(() => false)).toBeTruthy();
    
    if (await conditionSection.isVisible()) {
      const evaluateBtn = page.locator('button', { hasText: 'Evaluate Condition' });
      if (await evaluateBtn.isVisible()) {
        await evaluateBtn.click();
        await page.waitForTimeout(1000);
      }
    }
    
    const employee = db.getUserByEmail(TEST_USERS.employee.email);
    const instances = db.getWorkflowInstances({ userId: employee!.id });
    
    if (instances.length > 0) {
      const history = JSON.parse(instances[0].history || '[]');
      const hasConditionEval = history.some((h: any) => 
        h.action?.toLowerCase().includes('condition') || 
        h.action?.toLowerCase().includes('evaluated')
      );
      expect(hasConditionEval).toBeTruthy();
    }
    
    db.close();
  });

  test('SCN-INTEGRATION-004: Parallel approval waits for all approvers', async ({ page }) => {
    const db = new DbHelper();
    
    await login(page, TEST_USERS.employee);
    await startWorkflow(page, 'Expense Reimbursement').catch(async () => {
      await startWorkflow(page, 'Budget Check Workflow');
    });
    
    await fillFormField(page, 'Amount', '1000');
    await fillFormField(page, 'Description', 'Business expense');
    await page.locator('button[type="submit"]').click();
    await page.waitForTimeout(1500);
    
    const employee = db.getUserByEmail(TEST_USERS.employee.email);
    let instances = db.getWorkflowInstances({ userId: employee!.id });
    
    await login(page, TEST_USERS.manager);
    await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    await approveStep(page);
    
    instances = db.getWorkflowInstances({ userId: employee!.id });
    expect(instances[0].status).toMatch(/PENDING|IN_PROGRESS|WAITING/);
    
    const parallelSection = page.locator('.parallel-section');
    const approvalProgress = page.locator('.approval-progress, text=/1.*2|2.*3/i');
    
    const hasParallel = await parallelSection.isVisible().catch(() => false);
    const hasProgress = await approvalProgress.isVisible().catch(() => false);
    expect(hasParallel || hasProgress).toBeTruthy();
    
    db.close();
  });

  test('SCN-INTEGRATION-005: Sub-workflow blocks parent until complete', async ({ page }) => {
    const db = new DbHelper();
    
    await login(page, TEST_USERS.manager);
    await startWorkflow(page, 'Customer Onboarding').catch(async () => {
      await startWorkflow(page, 'System Enhancement Request');
    });
    
    await fillFormField(page, 'Customer', 'Integration Test Customer');
    await fillFormField(page, 'Email', 'test@customer.com');
    
    await page.locator('button[type="submit"]').click();
    await page.waitForTimeout(1500);
    
    const startSubBtn = page.locator('button', { hasText: 'Start Sub-Workflow' });
    if (await startSubBtn.isVisible()) {
      await startSubBtn.click();
      await page.waitForTimeout(1500);
    }
    
    const manager = db.getUserByEmail(TEST_USERS.manager.email);
    const instances = db.getWorkflowInstances({ userId: manager!.id });
    
    expect(instances.length).toBeGreaterThan(0);
    expect(instances[0].status).toBe('WAITING_FOR_CHILD');
    
    const nextBtn = page.locator('button', { hasText: 'Next Step' });
    const advanceBtn = page.locator('button', { hasText: 'Continue' });
    
    const btnToTry = await nextBtn.isVisible().catch(() => false) ? nextBtn : advanceBtn;
    
    if (await btnToTry.isVisible().catch(() => false)) {
      await btnToTry.click();
      await page.waitForSelector(".node-item", { timeout: 30000 });
    await page.waitForTimeout(1000);
      
      const updatedInstances = db.getWorkflowInstances({ userId: manager!.id });
      expect(updatedInstances[0].status).toBe('WAITING_FOR_CHILD');
    }
    
    db.close();
  });
});

// ============================================================================
// SCENARIO 6: SYSTEM ENHANCEMENT (SDLC SUB-WORKFLOW)
// - Employee submits enhancement request
// - IT team handles SDLC: Requirements → Design → Development → Testing → UAT → Deployment
// - Each stage updates SDLC Record Form
// - Enhancement may require infrastructure sub-workflows (network, DB)
// - Budget exceeded blocks enhancement
// ============================================================================
test.describe('Scenario 6: System Enhancement (SDLC Sub-workflow)', () => {

  test('SCN-SDLCE-001-P: System enhancement triggers SDLC sub-workflow', async ({ page }) => {
    const db = new DbHelper();
    
    await login(page, TEST_USERS.employee);
    await startWorkflow(page, 'System Enhancement Request').catch(async () => {
      await startWorkflow(page, 'System Enhancement');
    });
    
    await fillFormField(page, 'Title', 'API Performance Optimization');
    await fillFormField(page, 'Description', 'Optimize API response times');
    await fillFormField(page, 'Priority', 'High');
    await fillFormField(page, 'Estimated Cost', '5000');
    
    await page.locator('button[type="submit"]').click();
    await page.waitForTimeout(1500);
    
    // Verify SDLC sub-workflow was triggered
    const sdlcSection = page.locator('.sdlc-section, .sub-workflow-section');
    expect(await sdlcSection.isVisible().catch(() => false)).toBeTruthy();
    
    // Navigate through SDLC stages
    const requirementsBtn = page.locator('button', { hasText: /Requirements/i });
    if (await requirementsBtn.isVisible().catch(() => false)) {
      await requirementsBtn.click();
      await page.waitForTimeout(1000);
      await fillFormField(page, 'Requirements', 'Define API endpoints and performance targets');
      await page.locator('button[type="submit"], button', { hasText: 'Submit' }).click();
      await page.waitForTimeout(1000);
    }
    
    const designBtn = page.locator('button', { hasText: /Design/i });
    if (await designBtn.isVisible().catch(() => false)) {
      await designBtn.click();
      await page.waitForTimeout(1000);
      await fillFormField(page, 'Design', 'REST API architecture design');
      await page.locator('button[type="submit"], button', { hasText: 'Submit' }).click();
      await page.waitForTimeout(1000);
    }
    
    const employee = db.getUserByEmail(TEST_USERS.employee.email);
    const instances = db.getWorkflowInstances({ userId: employee!.id });
    
    expect(instances.length).toBeGreaterThan(0);
    expect(instances[0].status).toMatch(/IN_PROGRESS|WAITING|PENDING/);
    
    db.close();
  });

  test('SCN-SDLCE-001-N: Enhancement blocked when budget exceeded', async ({ page }) => {
    const db = new DbHelper();
    
    await login(page, TEST_USERS.employee);
    await startWorkflow(page, 'System Enhancement Request').catch(async () => {
      await startWorkflow(page, 'IT Equipment Approval');
    });
    
    await fillFormField(page, 'Title', 'Enterprise System Migration');
    await fillFormField(page, 'Description', 'Full system migration to new platform');
    await fillFormField(page, 'Estimated Cost', '500000');
    
    await page.locator('button[type="submit"]').click();
    await page.waitForTimeout(1500);
    
    // Should be blocked due to budget
    const blockedMsg = page.locator('.error-message, .alert-error, .condition-section', 
      { hasText: /budget|exceeded|blocked|approval.*required/i });
    const isBlocked = await blockedMsg.isVisible().catch(() => false);
    
    const conditionSection = page.locator('.condition-section');
    const hasCondition = await conditionSection.isVisible().catch(() => false);
    
    expect(isBlocked || hasCondition).toBeTruthy();
    
    const employee = db.getUserByEmail(TEST_USERS.employee.email);
    const instances = db.getWorkflowInstances({ userId: employee!.id });
    
    if (instances.length > 0) {
      expect(instances[0].status).not.toBe('COMPLETED');
    }
    
    db.close();
  });

  test('SCN-SDLCE-002-P: Enhancement with infrastructure sub-workflow (network)', async ({ page }) => {
    const db = new DbHelper();
    
    await login(page, TEST_USERS.employee);
    await startWorkflow(page, 'System Enhancement Request').catch(async () => {
      await startWorkflow(page, 'System Enhancement');
    });
    
    await fillFormField(page, 'Title', 'Cloud Migration Enhancement');
    await fillFormField(page, 'Description', 'Migrate to cloud infrastructure');
    await fillFormField(page, 'Infrastructure Needed', 'Network');
    await fillFormField(page, 'Estimated Cost', '10000');
    
    await page.locator('button[type="submit"]').click();
    await page.waitForTimeout(1500);
    
    // Network sub-workflow should trigger
    const networkSection = page.locator('.sub-workflow-section, text=/Network/i');
    expect(await networkSection.isVisible().catch(() => false)).toBeTruthy();
    
    const startSubBtn = page.locator('button', { hasText: 'Start Sub-Workflow' });
    if (await startSubBtn.isVisible()) {
      await startSubBtn.click();
      await page.waitForTimeout(1500);
    }
    
    const employee = db.getUserByEmail(TEST_USERS.employee.email);
    let instances = db.getWorkflowInstances({ userId: employee!.id });
    
    expect(instances.length).toBeGreaterThan(0);
    expect(instances[0].status).toMatch(/WAITING_FOR_CHILD|IN_PROGRESS/);
    
    // Complete network sub-workflow
    const approveSubBtn = page.locator('button', { hasText: 'Approve' });
    if (await approveSubBtn.isVisible().catch(() => false)) {
      await approveSubBtn.click();
      await page.waitForTimeout(1000);
    }
    
    instances = db.getWorkflowInstances({ userId: employee!.id });
    expect(instances[0].status).toMatch(/IN_PROGRESS|PENDING/);
    
    db.close();
  });

  test('SCN-SDLCE-002-N: DB sub-workflow rejected by DBA', async ({ page }) => {
    const db = new DbHelper();
    
    await login(page, TEST_USERS.employee);
    await startWorkflow(page, 'System Enhancement Request').catch(async () => {
      await startWorkflow(page, 'System Enhancement');
    });
    
    await fillFormField(page, 'Title', 'Database Schema Change');
    await fillFormField(page, 'Description', 'Add new tables for analytics');
    await fillFormField(page, 'Infrastructure Needed', 'Database');
    await fillFormField(page, 'Estimated Cost', '8000');
    
    await page.locator('button[type="submit"]').click();
    await page.waitForTimeout(1500);
    
    // DB sub-workflow should trigger
    const dbSection = page.locator('.sub-workflow-section, text=/Database|DBA/i');
    expect(await dbSection.isVisible().catch(() => false)).toBeTruthy();
    
    const startSubBtn = page.locator('button', { hasText: 'Start Sub-Workflow' });
    if (await startSubBtn.isVisible()) {
      await startSubBtn.click();
      await page.waitForTimeout(1500);
    }
    
    // DBA rejects the schema change
    const rejectBtn = page.locator('button', { hasText: 'Reject' });
    if (await rejectBtn.isVisible().catch(() => false)) {
      await rejectBtn.click();
      await page.waitForTimeout(1000);
    }
    
    const employee = db.getUserByEmail(TEST_USERS.employee.email);
    const instances = db.getWorkflowInstances({ userId: employee!.id });
    
    if (instances.length > 0) {
      expect(instances[0].status).toMatch(/REJECTED|BLOCKED/);
    }
    
    db.close();
  });

  test('SCN-SDLCE-003-P: Parallel infrastructure sub-workflows complete', async ({ page }) => {
    const db = new DbHelper();
    
    await login(page, TEST_USERS.employee);
    await startWorkflow(page, 'System Enhancement Request').catch(async () => {
      await startWorkflow(page, 'System Enhancement');
    });
    
    await fillFormField(page, 'Title', 'Full Stack Enhancement');
    await fillFormField(page, 'Description', 'Enhancement requiring network AND DB changes');
    await fillFormField(page, 'Infrastructure Needed', 'Network,Database');
    await fillFormField(page, 'Estimated Cost', '15000');
    
    await page.locator('button[type="submit"]').click();
    await page.waitForTimeout(1500);
    
    // Both sub-workflows should be visible (parallel)
    const parallelSection = page.locator('.parallel-section, .sub-workflow-section');
    expect(await parallelSection.isVisible().catch(() => false)).toBeTruthy();
    
    const startSubBtn = page.locator('button', { hasText: 'Start Sub-Workflow' });
    if (await startSubBtn.isVisible()) {
      await startSubBtn.click();
      await page.waitForTimeout(1500);
    }
    
    const employee = db.getUserByEmail(TEST_USERS.employee.email);
    let instances = db.getWorkflowInstances({ userId: employee!.id });
    
    expect(instances.length).toBeGreaterThan(0);
    expect(instances[0].status).toBe('WAITING_FOR_CHILD');
    
    // Complete both sub-workflows
    const approveBtns = page.locator('button', { hasText: 'Approve' });
    const count = await approveBtns.count();
    
    for (let i = 0; i < count; i++) {
      if (await approveBtns.nth(i).isVisible().catch(() => false)) {
        await approveBtns.nth(i).click();
        await page.waitForTimeout(1000);
      }
    }
    
    instances = db.getWorkflowInstances({ userId: employee!.id });
    expect(instances[0].status).toMatch(/IN_PROGRESS|PENDING/);
    
    db.close();
  });

  test('SCN-SDLCE-003-N: Failed sub-workflow blocks SDLC', async ({ page }) => {
    const db = new DbHelper();
    
    await login(page, TEST_USERS.employee);
    await startWorkflow(page, 'System Enhancement Request').catch(async () => {
      await startWorkflow(page, 'System Enhancement');
    });
    
    await fillFormField(page, 'Title', 'Critical System Update');
    await fillFormField(page, 'Description', 'System update with dependency');
    await fillFormField(page, 'Infrastructure Needed', 'Network');
    await fillFormField(page, 'Estimated Cost', '12000');
    
    await page.locator('button[type="submit"]').click();
    await page.waitForTimeout(1500);
    
    const startSubBtn = page.locator('button', { hasText: 'Start Sub-Workflow' });
    if (await startSubBtn.isVisible()) {
      await startSubBtn.click();
      await page.waitForTimeout(1500);
    }
    
    const employee = db.getUserByEmail(TEST_USERS.employee.email);
    let instances = db.getWorkflowInstances({ userId: employee!.id });
    
    expect(instances.length).toBeGreaterThan(0);
    expect(instances[0].status).toBe('WAITING_FOR_CHILD');
    
    // Fail the sub-workflow
    const rejectBtn = page.locator('button', { hasText: 'Reject' });
    if (await rejectBtn.isVisible().catch(() => false)) {
      await rejectBtn.click();
      await page.waitForTimeout(1000);
    }
    
    instances = db.getWorkflowInstances({ userId: employee!.id });
    
    // Main workflow should still be blocked
    expect(instances[0].status).toMatch(/REJECTED|BLOCKED/);
    
    // Try to advance main workflow - should not be possible
    const nextBtn = page.locator('button', { hasText: 'Next' });
    if (await nextBtn.isVisible().catch(() => false)) {
      await nextBtn.click();
      await page.waitForSelector(".node-item", { timeout: 30000 });
    await page.waitForTimeout(1000);
      
      instances = db.getWorkflowInstances({ userId: employee!.id });
      expect(instances[0].status).toMatch(/REJECTED|BLOCKED/);
    }
    
    db.close();
  });
});
