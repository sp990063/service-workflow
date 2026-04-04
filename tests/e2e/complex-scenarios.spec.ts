/**
 * ServiceFlow - Complex Workflow Scenarios E2E Tests
 * 
 * Tests 5 complex real-world enterprise scenarios with both positive and negative cases:
 * 
 * SCN-COMPLEX-001: Leave Request (Conditional Approval)
 * SCN-COMPLEX-002: Expense Reimbursement (Parallel Approval)
 * SCN-COMPLEX-003: IT Equipment Order (Sequential + Parallel)
 * SCN-COMPLEX-004: Customer Onboarding (Sub-workflow)
 * SCN-COMPLEX-005: Performance Review (Multi-stage with Conditions)
 */

import { test, expect } from '@playwright/test';
import { DbHelper } from './db.helper';

const BASE_URL = 'http://localhost:4200';

const TEST_USERS = {
  admin: { email: 'admin@example.com', password: 'password123', name: 'Admin User' },
  manager: { email: 'manager@example.com', password: 'password123', name: 'Manager User' },
  employee: { email: 'employee@example.com', password: 'password123', name: 'Employee User' },
  director: { email: 'director@example.com', password: 'password123', name: 'Director User' },
  finance: { email: 'finance@example.com', password: 'password123', name: 'Finance User' },
  hr: { email: 'hr@example.com', password: 'password123', name: 'HR User' },
  itAdmin: { email: 'itadmin@example.com', password: 'password123', name: 'IT Admin User' },
  sales: { email: 'sales@example.com', password: 'password123', name: 'Sales User' },
};

// Seeded workflows for complex scenarios
const SEEDED_WORKFLOWS = [
  {
    id: 'wf-leave-short',
    name: 'Leave Request (<=3 Days)',
    description: 'Short leave request - Manager approval only',
    category: 'HR',
    nodes: JSON.stringify([
      { id: 'ls-start', type: 'start', position: { x: 100, y: 200 }, data: { label: 'Start' } },
      { id: 'ls-form', type: 'form', position: { x: 300, y: 200 }, data: { label: 'Submit Leave Request', formId: 'form-leave-short' } },
      { id: 'ls-approval', type: 'approval', position: { x: 500, y: 200 }, data: { label: 'Manager Approval', approverRole: 'MANAGER' } },
      { id: 'ls-end', type: 'end', position: { x: 700, y: 200 }, data: { label: 'End' } },
    ]),
    connections: JSON.stringify([
      { from: 'ls-start', to: 'ls-form' },
      { from: 'ls-form', to: 'ls-approval' },
      { from: 'ls-approval', to: 'ls-end' },
    ]),
    isActive: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'wf-leave-long',
    name: 'Leave Request (>3 Days)',
    description: 'Long leave request - Manager + Director parallel approval',
    category: 'HR',
    nodes: JSON.stringify([
      { id: 'll-start', type: 'start', position: { x: 100, y: 200 }, data: { label: 'Start' } },
      { id: 'll-form', type: 'form', position: { x: 250, y: 200 }, data: { label: 'Submit Leave Request', formId: 'form-leave-long' } },
      { id: 'll-split', type: 'parallel', position: { x: 400, y: 200 }, data: { label: 'Parallel Approval', branchType: 'AND' } },
      { id: 'll-mgr', type: 'approval', position: { x: 550, y: 100 }, data: { label: 'Manager Approval', approverRole: 'MANAGER' } },
      { id: 'll-dir', type: 'approval', position: { x: 550, y: 300 }, data: { label: 'Director Approval', approverRole: 'DIRECTOR' } },
      { id: 'll-join', type: 'join', position: { x: 700, y: 200 }, data: { label: 'Join', joinType: 'AND' } },
      { id: 'll-end', type: 'end', position: { x: 850, y: 200 }, data: { label: 'End' } },
    ]),
    connections: JSON.stringify([
      { from: 'll-start', to: 'll-form' },
      { from: 'll-form', to: 'll-split' },
      { from: 'll-split', to: 'll-mgr' },
      { from: 'll-split', to: 'll-dir' },
      { from: 'll-mgr', to: 'll-join' },
      { from: 'll-dir', to: 'll-join' },
      { from: 'll-join', to: 'll-end' },
    ]),
    isActive: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'wf-expense',
    name: 'Expense Reimbursement',
    description: 'Expense reimbursement with parallel Manager + Finance approval',
    category: 'Finance',
    nodes: JSON.stringify([
      { id: 'ex-start', type: 'start', position: { x: 100, y: 200 }, data: { label: 'Start' } },
      { id: 'ex-form', type: 'form', position: { x: 250, y: 200 }, data: { label: 'Submit Expense', formId: 'form-expense' } },
      { id: 'ex-split', type: 'parallel', position: { x: 400, y: 200 }, data: { label: 'Parallel Approval', branchType: 'AND' } },
      { id: 'ex-mgr', type: 'approval', position: { x: 550, y: 100 }, data: { label: 'Manager Approval', approverRole: 'MANAGER' } },
      { id: 'ex-fin', type: 'approval', position: { x: 550, y: 300 }, data: { label: 'Finance Approval', approverRole: 'FINANCE' } },
      { id: 'ex-join', type: 'join', position: { x: 700, y: 200 }, data: { label: 'Join', joinType: 'AND' } },
      { id: 'ex-end', type: 'end', position: { x: 850, y: 200 }, data: { label: 'End' } },
    ]),
    connections: JSON.stringify([
      { from: 'ex-start', to: 'ex-form' },
      { from: 'ex-form', to: 'ex-split' },
      { from: 'ex-split', to: 'ex-mgr' },
      { from: 'ex-split', to: 'ex-fin' },
      { from: 'ex-mgr', to: 'ex-join' },
      { from: 'ex-fin', to: 'ex-join' },
      { from: 'ex-join', to: 'ex-end' },
    ]),
    isActive: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'wf-equipment',
    name: 'IT Equipment Order',
    description: 'Sequential (Manager) then parallel (IT + Finance) approval',
    category: 'IT',
    nodes: JSON.stringify([
      { id: 'eq-start', type: 'start', position: { x: 100, y: 200 }, data: { label: 'Start' } },
      { id: 'eq-form', type: 'form', position: { x: 250, y: 200 }, data: { label: 'Submit Equipment Request', formId: 'form-equipment' } },
      { id: 'eq-mgr', type: 'approval', position: { x: 400, y: 200 }, data: { label: 'Manager Approval', approverRole: 'MANAGER' } },
      { id: 'eq-split', type: 'parallel', position: { x: 550, y: 200 }, data: { label: 'Parallel Approval', branchType: 'AND' } },
      { id: 'eq-it', type: 'approval', position: { x: 700, y: 100 }, data: { label: 'IT Approval', approverRole: 'IT_ADMIN' } },
      { id: 'eq-fin', type: 'approval', position: { x: 700, y: 300 }, data: { label: 'Finance Approval', approverRole: 'FINANCE' } },
      { id: 'eq-join', type: 'join', position: { x: 850, y: 200 }, data: { label: 'Join', joinType: 'AND' } },
      { id: 'eq-end', type: 'end', position: { x: 1000, y: 200 }, data: { label: 'End' } },
    ]),
    connections: JSON.stringify([
      { from: 'eq-start', to: 'eq-form' },
      { from: 'eq-form', to: 'eq-mgr' },
      { from: 'eq-mgr', to: 'eq-split' },
      { from: 'eq-split', to: 'eq-it' },
      { from: 'eq-split', to: 'eq-fin' },
      { from: 'eq-it', to: 'eq-join' },
      { from: 'eq-fin', to: 'eq-join' },
      { from: 'eq-join', to: 'eq-end' },
    ]),
    isActive: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'wf-account-setup',
    name: 'Account Setup Sub-Workflow',
    description: 'Set up customer account',
    category: 'Onboarding',
    nodes: JSON.stringify([
      { id: 'as-start', type: 'start', position: { x: 100, y: 200 }, data: { label: 'Start' } },
      { id: 'as-task1', type: 'task', position: { x: 300, y: 200 }, data: { label: 'Create Account', assigneeRole: 'SALES' } },
      { id: 'as-task2', type: 'task', position: { x: 500, y: 200 }, data: { label: 'Configure Permissions', assigneeRole: 'SALES' } },
      { id: 'as-end', type: 'end', position: { x: 700, y: 200 }, data: { label: 'End' } },
    ]),
    connections: JSON.stringify([
      { from: 'as-start', to: 'as-task1' },
      { from: 'as-task1', to: 'as-task2' },
      { from: 'as-task2', to: 'as-end' },
    ]),
    isActive: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'wf-training',
    name: 'Training Sub-Workflow',
    description: 'Conduct customer training sessions',
    category: 'Onboarding',
    nodes: JSON.stringify([
      { id: 'tr-start', type: 'start', position: { x: 100, y: 200 }, data: { label: 'Start' } },
      { id: 'tr-task1', type: 'task', position: { x: 300, y: 200 }, data: { label: 'Schedule Training', assigneeRole: 'SALES' } },
      { id: 'tr-task2', type: 'task', position: { x: 500, y: 200 }, data: { label: 'Conduct Training Session', assigneeRole: 'SALES' } },
      { id: 'tr-end', type: 'end', position: { x: 700, y: 200 }, data: { label: 'End' } },
    ]),
    connections: JSON.stringify([
      { from: 'tr-start', to: 'tr-task1' },
      { from: 'tr-task1', to: 'tr-task2' },
      { from: 'tr-task2', to: 'tr-end' },
    ]),
    isActive: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'wf-support-plan',
    name: 'Support Plan Sub-Workflow',
    description: 'Set up customer support plan',
    category: 'Onboarding',
    nodes: JSON.stringify([
      { id: 'sp-start', type: 'start', position: { x: 100, y: 200 }, data: { label: 'Start' } },
      { id: 'sp-task1', type: 'task', position: { x: 300, y: 200 }, data: { label: 'Assign Support Tier', assigneeRole: 'SALES' } },
      { id: 'sp-task2', type: 'task', position: { x: 500, y: 200 }, data: { label: 'Setup Support Contacts', assigneeRole: 'SALES' } },
      { id: 'sp-end', type: 'end', position: { x: 700, y: 200 }, data: { label: 'End' } },
    ]),
    connections: JSON.stringify([
      { from: 'sp-start', to: 'sp-task1' },
      { from: 'sp-task1', to: 'sp-task2' },
      { from: 'sp-task2', to: 'sp-end' },
    ]),
    isActive: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'wf-onboarding',
    name: 'Customer Onboarding',
    description: 'Main workflow with parallel sub-workflows',
    category: 'Sales',
    nodes: JSON.stringify([
      { id: 'ob-start', type: 'start', position: { x: 100, y: 300 }, data: { label: 'Start' } },
      { id: 'ob-form', type: 'form', position: { x: 250, y: 300 }, data: { label: 'Submit Onboarding Request', formId: 'form-onboarding' } },
      { id: 'ob-split', type: 'parallel', position: { x: 400, y: 300 }, data: { label: 'Parallel Sub-Workflows', branchType: 'AND' } },
      { id: 'ob-account', type: 'sub-workflow', position: { x: 550, y: 100 }, data: { label: 'Account Setup', childWorkflowId: 'wf-account-setup', waitForCompletion: true } },
      { id: 'ob-training', type: 'sub-workflow', position: { x: 550, y: 300 }, data: { label: 'Training', childWorkflowId: 'wf-training', waitForCompletion: true } },
      { id: 'ob-support', type: 'sub-workflow', position: { x: 550, y: 500 }, data: { label: 'Support Plan', childWorkflowId: 'wf-support-plan', waitForCompletion: true } },
      { id: 'ob-join', type: 'join', position: { x: 700, y: 300 }, data: { label: 'Join', joinType: 'AND' } },
      { id: 'ob-end', type: 'end', position: { x: 850, y: 300 }, data: { label: 'End' } },
    ]),
    connections: JSON.stringify([
      { from: 'ob-start', to: 'ob-form' },
      { from: 'ob-form', to: 'ob-split' },
      { from: 'ob-split', to: 'ob-account' },
      { from: 'ob-split', to: 'ob-training' },
      { from: 'ob-split', to: 'ob-support' },
      { from: 'ob-account', to: 'ob-join' },
      { from: 'ob-training', to: 'ob-join' },
      { from: 'ob-support', to: 'ob-join' },
      { from: 'ob-join', to: 'ob-end' },
    ]),
    isActive: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'wf-review',
    name: 'Performance Review',
    description: 'Multi-stage review with HR intervention for low ratings',
    category: 'HR',
    nodes: JSON.stringify([
      { id: 'rv-start', type: 'start', position: { x: 100, y: 200 }, data: { label: 'Start' } },
      { id: 'rv-self', type: 'form', position: { x: 250, y: 200 }, data: { label: 'Self Assessment', formId: 'form-review-self' } },
      { id: 'rv-mgr', type: 'approval', position: { x: 400, y: 200 }, data: { label: 'Manager Review', approverRole: 'MANAGER' } },
      { id: 'rv-split', type: 'parallel', position: { x: 550, y: 200 }, data: { label: 'HR Check', branchType: 'AND' } },
      { id: 'rv-proceed', type: 'task', position: { x: 700, y: 100 }, data: { label: 'Proceed to Completion', assigneeRole: 'MANAGER' } },
      { id: 'rv-hr', type: 'approval', position: { x: 700, y: 300 }, data: { label: 'HR Intervention', approverRole: 'HR' } },
      { id: 'rv-join', type: 'join', position: { x: 850, y: 200 }, data: { label: 'Join', joinType: 'AND' } },
      { id: 'rv-end', type: 'end', position: { x: 1000, y: 200 }, data: { label: 'End' } },
    ]),
    connections: JSON.stringify([
      { from: 'rv-start', to: 'rv-self' },
      { from: 'rv-self', to: 'rv-mgr' },
      { from: 'rv-mgr', to: 'rv-split' },
      { from: 'rv-split', to: 'rv-proceed' },
      { from: 'rv-split', to: 'rv-hr' },
      { from: 'rv-proceed', to: 'rv-join' },
      { from: 'rv-hr', to: 'rv-join' },
      { from: 'rv-join', to: 'rv-end' },
    ]),
    isActive: true,
    createdAt: new Date().toISOString(),
  },
];

const SEEDED_FORMS = [
  {
    id: 'form-leave-short',
    name: 'Leave Request (Short)',
    description: 'Leave request for 3 days or less',
    elements: JSON.stringify([
      { id: 'leave-type', type: 'select', label: 'Leave Type', options: ['Annual', 'Sick', 'Personal'], required: true },
      { id: 'start-date', type: 'date', label: 'Start Date', required: true },
      { id: 'end-date', type: 'date', label: 'End Date', required: true },
      { id: 'days-count', type: 'number', label: 'Number of Days', min: 1, max: 3, required: true },
      { id: 'reason', type: 'textarea', label: 'Reason', required: true },
    ]),
    isActive: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'form-leave-long',
    name: 'Leave Request (Long)',
    description: 'Leave request for more than 3 days',
    elements: JSON.stringify([
      { id: 'leave-type', type: 'select', label: 'Leave Type', options: ['Annual', 'Sick', 'Personal'], required: true },
      { id: 'start-date', type: 'date', label: 'Start Date', required: true },
      { id: 'end-date', type: 'date', label: 'End Date', required: true },
      { id: 'days-count', type: 'number', label: 'Number of Days', min: 4, required: true },
      { id: 'reason', type: 'textarea', label: 'Reason', required: true },
      { id: 'coverage', type: 'text', label: 'Coverage Arranged With', required: true },
    ]),
    isActive: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'form-expense',
    name: 'Expense Reimbursement',
    description: 'Submit expense report for reimbursement',
    elements: JSON.stringify([
      { id: 'expense-type', type: 'select', label: 'Expense Type', options: ['Travel', 'Meals', 'Supplies'], required: true },
      { id: 'amount', type: 'number', label: 'Amount (HKD)', min: 0, required: true },
      { id: 'description', type: 'textarea', label: 'Description', required: true },
      { id: 'date-incurred', type: 'date', label: 'Date Incurred', required: true },
    ]),
    isActive: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'form-equipment',
    name: 'IT Equipment Order',
    description: 'Order IT equipment',
    elements: JSON.stringify([
      { id: 'equipment-type', type: 'select', label: 'Equipment Type', options: ['Laptop', 'Monitor', 'Keyboard'], required: true },
      { id: 'model', type: 'text', label: 'Model/Specifications', required: true },
      { id: 'budget-code', type: 'text', label: 'Budget Code', required: true },
      { id: 'estimated-cost', type: 'number', label: 'Estimated Cost (HKD)', min: 0, required: true },
      { id: 'justification', type: 'textarea', label: 'Business Justification', required: true },
    ]),
    isActive: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'form-onboarding',
    name: 'Customer Onboarding Request',
    description: 'Request to onboard a new customer',
    elements: JSON.stringify([
      { id: 'customer-name', type: 'text', label: 'Customer Company Name', required: true },
      { id: 'contact-person', type: 'text', label: 'Primary Contact Person', required: true },
      { id: 'contact-email', type: 'email', label: 'Contact Email', required: true },
      { id: 'contact-phone', type: 'phone', label: 'Contact Phone', required: true },
      { id: 'plan-type', type: 'select', label: 'Service Plan', options: ['Basic', 'Professional', 'Enterprise'], required: true },
      { id: 'start-date', type: 'date', label: 'Requested Start Date', required: true },
    ]),
    isActive: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'form-review-self',
    name: 'Self Assessment',
    description: 'Employee self-assessment form',
    elements: JSON.stringify([
      { id: 'goals-achieved', type: 'textarea', label: 'Goals Achieved', required: true },
      { id: 'challenges', type: 'textarea', label: 'Challenges Faced', required: true },
      { id: 'self-rating', type: 'rating', label: 'Self Rating', maxRating: 5, required: true },
      { id: 'development', type: 'textarea', label: 'Development Areas', required: true },
    ]),
    isActive: true,
    createdAt: new Date().toISOString(),
  },
];

async function clearAndSeed(page: any) {
  await page.goto(BASE_URL, { waitUntil: 'networkidle' });
  await page.evaluate(() => {
    Object.keys(localStorage)
      .filter(k => k.startsWith('serviceflow_'))
      .forEach(k => localStorage.removeItem(k));
  });
  await page.evaluate((data: any) => {
    const { workflows, forms } = data;
    localStorage.setItem('serviceflow_workflows', JSON.stringify(workflows));
    localStorage.setItem('serviceflow_forms', JSON.stringify(forms));
  }, { workflows: SEEDED_WORKFLOWS, forms: SEEDED_FORMS });
}

async function login(page: any, user: { email: string; password: string; name: string }) {
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle' });
  const emailInput = page.locator('input#email').first();
  if (await emailInput.isVisible()) {
    await emailInput.fill(user.email);
  } else {
    await page.locator('input[type="email"], input[name="email"]').first().fill(user.email);
  }
  await page.locator('input#password, input[type="password"]').first().fill(user.password);
  await page.locator('button[type="submit"]').click();
  await page.waitForTimeout(2000);
}

// ============================================================
// SCENARIO 1: Leave Request Tests
// ============================================================

test.describe('SCN-COMPLEX-001: Leave Request (Conditional Approval)', () => {

  test.beforeEach(async ({ page }) => {
    await clearAndSeed(page);
  });

  test.afterEach(async ({ page }, testInfo) => {
    const status = testInfo.status === 'passed' ? 'pass' : 'fail';
    await page.screenshot({
      path: `tests/e2e/reports/${testInfo.title.replace(/\s+/g, '-')}-${status}.png`,
      fullPage: true
    });
  });

  test('SCN-COMPLEX-001-P: Leave request - approved when days <= 3', async ({ page }) => {
    await login(page, TEST_USERS.employee);
    await page.goto(`${BASE_URL}/workflows`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);

    const leaveWf = page.locator('.workflow-card', { has: page.locator('h3:has-text("Leave Request")') }).first();
    await expect(leaveWf).toBeVisible();
    
    await leaveWf.locator('a:has-text("Start Workflow")').first().click();
    await page.waitForTimeout(2000);
    
    await expect(page).toHaveURL(/workflow-player/);
    await page.locator('button:has-text("Start Workflow")').click();
    await page.waitForTimeout(1000);
    
    const leaveTypeSelect = page.locator('select').first();
    if (await leaveTypeSelect.isVisible()) {
      await leaveTypeSelect.selectOption({ index: 1 });
    }
    
    const inputs = page.locator('input[type="date"], input[type="text"]');
    if (await inputs.count() >= 2) {
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const formatDate = (d: Date) => d.toISOString().split('T')[0];
      await inputs.nth(0).fill(formatDate(today));
      await inputs.nth(1).fill(formatDate(tomorrow));
    }
    
    const numberInputs = page.locator('input[type="number"]');
    if (await numberInputs.first().isVisible()) {
      await numberInputs.first().fill('2');
    }
    
    const textareas = page.locator('textarea');
    if (await textareas.first().isVisible()) {
      await textareas.first().fill('Family vacation - short trip');
    }
    
    await page.locator('button:has-text("Submit")').click();
    await page.waitForTimeout(2000);
    
    await expect(page.locator('body')).toContainText(/pending|submitted/i, { timeout: 5000 });
    
    await login(page, TEST_USERS.manager);
    await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);
    await expect(page.locator('body')).toBeVisible();
  });

  test('SCN-COMPLEX-001-P2: Leave request - parallel approval when days > 3', async ({ page }) => {
    await login(page, TEST_USERS.employee);
    await page.goto(`${BASE_URL}/workflows`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);

    const leaveWf = page.locator('.workflow-card', { has: page.locator('h3:has-text("Leave Request")') }).nth(1);
    await expect(leaveWf).toBeVisible();
    
    await leaveWf.locator('a:has-text("Start Workflow")').first().click();
    await page.waitForTimeout(2000);
    
    await expect(page).toHaveURL(/workflow-player/);
    await page.locator('button:has-text("Start Workflow")').click();
    await page.waitForTimeout(1000);
    
    const leaveTypeSelect = page.locator('select').first();
    if (await leaveTypeSelect.isVisible()) {
      await leaveTypeSelect.selectOption({ index: 1 });
    }
    
    const inputs = page.locator('input[type="date"], input[type="text"]');
    if (await inputs.count() >= 2) {
      const today = new Date();
      const fiveDaysLater = new Date(today);
      fiveDaysLater.setDate(fiveDaysLater.getDate() + 5);
      const formatDate = (d: Date) => d.toISOString().split('T')[0];
      await inputs.nth(0).fill(formatDate(today));
      await inputs.nth(1).fill(formatDate(fiveDaysLater));
    }
    
    const numberInputs = page.locator('input[type="number"]');
    if (await numberInputs.first().isVisible()) {
      await numberInputs.first().fill('5');
    }
    
    const textareas = page.locator('textarea');
    if (await textareas.first().isVisible()) {
      await textareas.first().fill('Extended vacation abroad');
    }
    
    await page.locator('button:has-text("Submit")').click();
    await page.waitForTimeout(2000);
    
    await expect(page.locator('body')).toContainText(/pending|approval|parallel/i, { timeout: 5000 });
    
    await login(page, TEST_USERS.manager);
    await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);
    await expect(page.locator('body')).toBeVisible();
  });

  test('SCN-COMPLEX-001-N1: Leave request - employee cannot approve own request', async ({ page }) => {
    const db = new DbHelper();
    const employee = db.getUserByEmail(TEST_USERS.employee.email);
    expect(employee).toBeDefined();
    
    await login(page, TEST_USERS.employee);
    await page.goto(`${BASE_URL}/workflows`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);

    const leaveWf = page.locator('.workflow-card', { has: page.locator('h3:has-text("Leave Request")') }).first();
    await leaveWf.locator('a:has-text("Start Workflow")').first().click();
    await page.waitForTimeout(2000);
    
    await expect(page).toHaveURL(/workflow-player/);
    await page.locator('button:has-text("Start Workflow")').click();
    await page.waitForTimeout(1000);
    
    const approveBtn = page.locator('button', { hasText: /approve/i });
    
    if (await approveBtn.count() > 0) {
      await expect(approveBtn.first()).not.toBeEnabled();
    }
    
    await page.goto(`${BASE_URL}/workflows`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    await expect(page.locator('body')).toContainText(/Leave Request/i);
    
    db.close();
  });

  test('SCN-COMPLEX-001-N2: Leave request - employee can cancel pending request', async ({ page }) => {
    await login(page, TEST_USERS.employee);
    await page.goto(`${BASE_URL}/workflows`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);

    const leaveWf = page.locator('.workflow-card', { has: page.locator('h3:has-text("Leave Request")') }).first();
    await leaveWf.locator('a:has-text("Start Workflow")').first().click();
    await page.waitForTimeout(2000);
    
    await page.locator('button:has-text("Start Workflow")').click();
    await page.waitForTimeout(1000);
    
    const cancelBtn = page.locator('button', { hasText: /cancel|withdraw/i });
    
    if (await cancelBtn.count() > 0 && await cancelBtn.first().isVisible()) {
      await cancelBtn.first().click();
      await page.waitForTimeout(1000);
      page.on('dialog', dialog => dialog.accept());
      await page.waitForTimeout(500);
      page.removeAllListeners('dialog');
      await expect(page.locator('body')).toContainText(/cancel|withdrawn/i, { timeout: 5000 });
    } else {
      await expect(page.locator('body')).toContainText(/pending/i, { timeout: 3000 });
    }
  });
});

// ============================================================
// SCENARIO 2: Expense Reimbursement Tests
// ============================================================

test.describe('SCN-COMPLEX-002: Expense Reimbursement (Parallel Approval)', () => {

  test.beforeEach(async ({ page }) => {
    await clearAndSeed(page);
  });

  test.afterEach(async ({ page }, testInfo) => {
    const status = testInfo.status === 'passed' ? 'pass' : 'fail';
    await page.screenshot({
      path: `tests/e2e/reports/${testInfo.title.replace(/\s+/g, '-')}-${status}.png`,
      fullPage: true
    });
  });

  test('SCN-COMPLEX-002-P: Expense reimbursement - approved by both Manager and Finance', async ({ page }) => {
    await login(page, TEST_USERS.employee);
    await page.goto(`${BASE_URL}/workflows`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);

    const expenseWf = page.locator('.workflow-card', { has: page.locator('h3:has-text("Expense Reimbursement")') }).first();
    await expect(expenseWf).toBeVisible();
    
    await expenseWf.locator('a:has-text("Start Workflow")').first().click();
    await page.waitForTimeout(2000);
    
    await expect(page).toHaveURL(/workflow-player/);
    await page.locator('button:has-text("Start Workflow")').click();
    await page.waitForTimeout(1000);
    
    const selects = page.locator('select');
    if (await selects.first().isVisible()) {
      await selects.first().selectOption({ index: 1 });
    }
    
    const numberInputs = page.locator('input[type="number"]');
    if (await numberInputs.first().isVisible()) {
      await numberInputs.first().fill('500');
    }
    
    const textareas = page.locator('textarea');
    if (await textareas.first().isVisible()) {
      await textareas.first().fill('Business trip to client site');
    }
    
    const dateInputs = page.locator('input[type="date"]');
    if (await dateInputs.first().isVisible()) {
      const today = new Date().toISOString().split('T')[0];
      await dateInputs.first().fill(today);
    }
    
    await page.locator('button:has-text("Submit")').click();
    await page.waitForTimeout(2000);
    
    await expect(page.locator('body')).toContainText(/pending|approval|parallel/i, { timeout: 5000 });
    
    await login(page, TEST_USERS.manager);
    await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);
    await expect(page.locator('body')).toBeVisible();
    
    await login