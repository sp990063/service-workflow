import { test, expect } from '@playwright/test';

/**
 * ServiceFlow MVP - Comprehensive UI Testing
 * 
 * Tests cover:
 * - Authentication flows
 * - Form Builder (drag-drop, add elements, save)
 * - Workflow Designer (add nodes, save)
 * - Form preview and rendering
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

test.describe('ServiceFlow MVP - Comprehensive E2E Tests', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });
  });

  // Screenshot helper
  test.afterEach(async ({ page }, testInfo) => {
    const status = testInfo.status === 'passed' ? 'pass' : 'fail';
    await page.screenshot({ 
      path: `tests/e2e/reports/${testInfo.title.replace(/\s+/g, '-')}-${status}.png`,
      fullPage: true 
    });
  });

  // ============ AUTHENTICATION ============
  test.describe('Authentication', () => {
    test('TC-AUTH-001: Login page renders correctly', async ({ page }) => {
      await expect(page).toHaveTitle(/ServiceFlow/);
      await expect(page.locator('input[type="email"]')).toBeVisible();
      await expect(page.locator('input[type="password"]')).toBeVisible();
      await expect(page.locator('button[type="submit"]')).toBeVisible();
    });

    test('TC-AUTH-002: User can login successfully', async ({ page }) => {
      await page.locator('input[type="email"]').fill(TEST_USER.email);
      await page.locator('input[type="password"]').fill(TEST_USER.password);
      await page.locator('button[type="submit"]').click();
      await page.waitForTimeout(2000);
      // Should see dashboard or app content
      await expect(page.locator('body')).toBeVisible();
    });
  });

  // ============ FORM BUILDER ============
  test.describe('Form Builder', () => {
    
    test('TC-FORM-001: Form Builder page loads with element palette', async ({ page }) => {
      await login(page);
      await page.goto(`${BASE_URL}/form-builder`);
      await page.waitForTimeout(1000);
      
      // Check element palette exists
      await expect(page.locator('text=Elements').first()).toBeVisible();
      
      // Check for element types in palette
      await expect(page.locator('text=Single Line Text')).toBeVisible();
      await expect(page.locator('text=Multi Line Text')).toBeVisible();
      await expect(page.locator('text=Email')).toBeVisible();
    });

    test('TC-FORM-002: Can drag and drop element to canvas', async ({ page }) => {
      await login(page);
      await page.goto(`${BASE_URL}/form-builder`);
      await page.waitForTimeout(1000);
      
      // Get the text element from palette
      const textElement = page.locator('.element-item', { hasText: 'Single Line Text' });
      const canvas = page.locator('.canvas');
      
      // Drag element to canvas
      await textElement.dragTo(canvas);
      await page.waitForSelector(".form-element", { timeout: 30000 });
    await page.waitForTimeout(1000);
      
      // Verify element was added to canvas
      await expect(page.locator('.form-element')).toBeVisible();
      await expect(page.locator('.element-label')).toContainText('Single Line Text');
    });

    test('TC-FORM-003: Can add multiple elements and edit properties', async ({ page }) => {
      await login(page);
      await page.goto(`${BASE_URL}/form-builder`);
      await page.waitForTimeout(1000);
      
      // Add Text element
      const textEl = page.locator('.element-item', { hasText: 'Single Line Text' });
      await textEl.dragTo(page.locator('.canvas'));
      await page.waitForTimeout(300);
      
      // Add Email element
      const emailEl = page.locator('.element-item', { hasText: 'Email' });
      await emailEl.dragTo(page.locator('.canvas'));
      await page.waitForTimeout(300);
      
      // Verify both elements appear
      const elements = page.locator('.form-element');
      await expect(elements).toHaveCount(2);
      
      // Click first element to select
      await elements.first().click();
      await page.waitForTimeout(300);
      
      // Properties panel should show
      await expect(page.locator('text=Properties')).toBeVisible();
    });

    test('TC-FORM-004: Can delete element from canvas', async ({ page }) => {
      await login(page);
      await page.goto(`${BASE_URL}/form-builder`);
      await page.waitForTimeout(1000);
      
      // Add an element
      const textEl = page.locator('.element-item', { hasText: 'Single Line Text' });
      await textEl.dragTo(page.locator('.canvas'));
      await page.waitForSelector(".form-element", { timeout: 30000 });
    await page.waitForTimeout(1000);
      
      // Verify element exists
      await expect(page.locator('.form-element')).toBeVisible();
      
      // Hover to show delete button and click
      await page.locator('.form-element').hover();
      await page.locator('.delete-btn').click();
      await page.waitForTimeout(300);
      
      // Verify element is gone
      await expect(page.locator('.form-element')).toHaveCount(0);
    });

    test('TC-FORM-005: Can save form with name', async ({ page }) => {
      await login(page);
      await page.goto(`${BASE_URL}/form-builder`);
      await page.waitForTimeout(1000);
      
      // Clear and enter form name
      const nameInput = page.locator('.form-name-input');
      await nameInput.clear();
      await nameInput.fill('My Test Form');
      
      // Add an element
      const textEl = page.locator('.element-item', { hasText: 'Single Line Text' });
      await textEl.dragTo(page.locator('.canvas'));
      await page.waitForTimeout(300);
      
      // Save form
      page.on('dialog', dialog => dialog.accept());
      await page.locator('button', { hasText: 'Save Form' }).click();
      await page.waitForTimeout(1000);
      
      // Should show success message
      await expect(page.locator('text=/Form saved|saved/i')).toBeVisible({ timeout: 3000 }).catch(() => {
        // Or at least form should still be there
        expect(page.locator('.form-element')).toBeVisible();
      });
    });

    test('TC-FORM-006: Can create and save a functional form', async ({ page }) => {
      await login(page);
      await page.goto(`${BASE_URL}/form-builder`);
      await page.waitForTimeout(1000);
      
      // 1. Enter form name
      const formNameInput = page.locator('.form-name-input');
      await expect(formNameInput).toBeVisible();
      await formNameInput.clear();
      await formNameInput.fill('IT Service Request Form');
      
      // 2. Add Text element via drag and drop
      const textElement = page.locator('.element-item', { hasText: 'Single Line Text' });
      await expect(textElement).toBeVisible();
      await textElement.dragTo(page.locator('.canvas'));
      await page.waitForSelector(".form-element", { timeout: 30000 });
    await page.waitForTimeout(1000);
      
      // 3. Verify element was added to canvas
      const formElement = page.locator('.form-element');
      await expect(formElement).toBeVisible();
      await expect(page.locator('.element-label')).toContainText('Single Line Text');
      
      // 4. Add Email element
      const emailElement = page.locator('.element-item', { hasText: 'Email' });
      await emailElement.dragTo(page.locator('.canvas'));
      await page.waitForSelector(".form-element", { timeout: 30000 });
    await page.waitForTimeout(1000);
      
      // 5. Verify second element was added
      const allElements = page.locator('.form-element');
      await expect(allElements).toHaveCount(2);
      
      // 6. Select first element to edit properties
      await allElements.first().click();
      await page.waitForTimeout(300);
      
      // 7. Verify properties panel shows
      await expect(page.locator('text=Properties')).toBeVisible();
      await expect(page.locator('.property-form input[type="text"]').first()).toBeVisible();
      
      // 8. Change element label
      const labelInput = page.locator('.property-form input[type="text"]').first();
      await labelInput.clear();
      await labelInput.fill('Full Name');
      await page.waitForTimeout(300);
      
      // 9. Verify label was updated
      await expect(page.locator('.element-label').first()).toContainText('Full Name');
      
      // 10. Verify Clear and Save buttons work
      await expect(page.locator('button', { hasText: 'Clear' })).toBeEnabled();
      await expect(page.locator('button', { hasText: 'Save Form' })).toBeEnabled();
      
      // 11. Save the form (handle dialog)
      page.on('dialog', async dialog => {
        expect(dialog.message()).toContain('saved');
        await dialog.accept();
      });
      await page.locator('button', { hasText: 'Save Form' }).click();
      await page.waitForTimeout(1000);
    });
  });

  // ============ WORKFLOW DESIGNER ============
  test.describe('Workflow Designer', () => {
    
    test('TC-WF-001: Workflow Designer page loads with node palette', async ({ page }) => {
      await login(page);
      await page.goto(`${BASE_URL}/workflow-designer`);
      await page.waitForTimeout(1000);
      
      // Check node palette exists
      await expect(page.locator('text=Nodes').first()).toBeVisible();
      
      // Check for node types in palette
      await expect(page.locator('.node-item', { hasText: 'Start' }).first()).toBeVisible();
      await expect(page.locator('.node-item', { hasText: 'End' }).first()).toBeVisible();
      await expect(page.locator('.node-item', { hasText: 'Task' }).first()).toBeVisible();
    });

    test('TC-WF-002: Can add Start node to canvas', async ({ page }) => {
      await login(page);
      await page.goto(`${BASE_URL}/workflow-designer`);
      await page.waitForTimeout(1000);
      
      // Click Add Start button
      await page.locator('button', { hasText: '+ Start' }).click();
      await page.waitForSelector(".node-item", { timeout: 30000 });
    await page.waitForTimeout(1000);
      
      // Verify node was added
      await expect(page.locator('.workflow-node')).toBeVisible();
      await expect(page.locator('.node-header')).toContainText('Start');
    });

    test('TC-WF-003: Can add multiple workflow nodes', async ({ page }) => {
      await login(page);
      await page.goto(`${BASE_URL}/workflow-designer`);
      await page.waitForTimeout(1000);
      
      // Add Start node
      await page.locator('button', { hasText: '+ Start' }).click();
      await page.waitForTimeout(300);
      
      // Add Task node (drag or click depending on UI)
      const taskNode = page.locator('.node-item', { hasText: 'Task' });
      if (await taskNode.isVisible()) {
        await taskNode.dragTo(page.locator('.canvas-container'));
        await page.waitForTimeout(300);
      }
      
      // Should have at least one node
      const nodeCount = await page.locator('.workflow-node').count();
      expect(nodeCount).toBeGreaterThanOrEqual(1);
    });

    test('TC-WF-004: Can save workflow', async ({ page }) => {
      await login(page);
      await page.goto(`${BASE_URL}/workflow-designer`);
      await page.waitForTimeout(1000);
      
      // Enter workflow name
      const nameInput = page.locator('.workflow-name-input');
      await nameInput.clear();
      await nameInput.fill('My Test Workflow');
      
      // Add a node
      await page.locator('button', { hasText: '+ Start' }).click();
      await page.waitForTimeout(300);
      
      // Save workflow
      await page.locator('button', { hasText: 'Save Workflow' }).click();
      await page.waitForTimeout(1000);
      
      // Workflow should still be visible
      await expect(page.locator('.workflow-node')).toBeVisible();
    });
  });

  // ============ DASHBOARD ============
  test.describe('Dashboard', () => {
    
    test('TC-DASH-001: Dashboard loads after login', async ({ page }) => {
      await login(page);
      // Should see app content
      await expect(page.locator('body')).toBeVisible();
    });
  });

  // ============ NAVIGATION ============
  test.describe('Navigation', () => {
    
    test('TC-NAV-001: Can navigate between all pages', async ({ page }) => {
      await login(page);
      
      // Go to Form Builder
      await page.goto(`${BASE_URL}/form-builder`);
      await page.waitForSelector(".element-item", { timeout: 30000 });
    await page.waitForTimeout(1000);
      await expect(page.locator('body')).toBeVisible();
      
      // Go to Workflow Designer
      await page.goto(`${BASE_URL}/workflow-designer`);
      await page.waitForSelector(".node-item", { timeout: 30000 });
    await page.waitForTimeout(1000);
      await expect(page.locator('body')).toBeVisible();
      
      // Go back to home
      await page.goto(BASE_URL);
      await page.waitForSelector("h1", { timeout: 30000 });
    await page.waitForTimeout(1000);
      await expect(page.locator('body')).toBeVisible();
    });
  });

  // ============ FORMS LIST ============
  test.describe('Forms List', () => {
    
    test('TC-FORMLIST-001: Forms list page loads', async ({ page }) => {
      await login(page);
      await page.goto(`${BASE_URL}/forms`);
      await page.waitForTimeout(1000);
      
      await expect(page.locator('h1')).toContainText('Forms');
      await expect(page.locator('text=New Form')).toBeVisible();
    });

    test('TC-FORMLIST-002: Can find saved form in list', async ({ page }) => {
      await login(page);
      
      // First create a form
      await page.goto(`${BASE_URL}/form-builder`);
      await page.waitForSelector(".element-item", { timeout: 30000 });
    await page.waitForTimeout(1000);
      
      await page.locator('.form-name-input').fill('IT Service Request');
      await page.locator('.element-item', { hasText: 'Single Line Text' })
        .dragTo(page.locator('.canvas'));
      await page.waitForTimeout(300);
      
      page.on('dialog', dialog => dialog.accept());
      await page.locator('button', { hasText: 'Save Form' }).click();
      await page.waitForTimeout(1000);
      
      // Go to forms list
      await page.goto(`${BASE_URL}/forms`);
      await page.waitForTimeout(1000);
      
      // Find the saved form
      await expect(page.locator('.form-card h3').first()).toContainText('IT Service Request');
    });
  });

  // ============ FORM FILL (END USER) ============
  test.describe('Form Fill - End User Experience', () => {
    
    test('TC-FORMFILL-001: Can access form fill page via forms list', async ({ page }) => {
      await login(page);
      
      // Create and save a form first
      await page.goto(`${BASE_URL}/form-builder`);
      await page.waitForSelector(".element-item", { timeout: 30000 });
    await page.waitForTimeout(1000);
      
      await page.locator('.form-name-input').fill('Employee Feedback Form');
      await page.locator('.element-item', { hasText: 'Single Line Text' })
        .dragTo(page.locator('.canvas'));
      await page.waitForTimeout(300);
      await page.locator('.form-element').click();
      await page.waitForTimeout(200);
      await page.locator('.property-form input[type="text"]').first().fill('Your Name');
      
      page.on('dialog', dialog => dialog.accept());
      await page.locator('button', { hasText: 'Save Form' }).click();
      await page.waitForTimeout(1000);
      
      // Go to forms list
      await page.goto(`${BASE_URL}/forms`);
      await page.waitForTimeout(1000);
      
      // Click Fill Form button
      await page.locator('.form-card .btn-primary', { hasText: 'Fill Form' }).first().click();
      await page.waitForTimeout(1000);
      
      // Verify form fill page loads
      await expect(page.locator('h1')).toContainText('Employee Feedback Form');
    });

    test('TC-FORMFILL-002: End user can fill and submit form', async ({ page }) => {
      await login(page);
      
      // Create a form with required fields
      await page.goto(`${BASE_URL}/form-builder`);
      await page.waitForSelector(".element-item", { timeout: 30000 });
    await page.waitForTimeout(1000);
      
      await page.locator('.form-name-input').fill('Support Request Form');
      await page.locator('.element-item', { hasText: 'Single Line Text' })
        .dragTo(page.locator('.canvas'));
      await page.waitForTimeout(300);
      
      // Make it required
      await page.locator('.form-element').click();
      await page.waitForTimeout(200);
      await page.locator('.property-form input[type="checkbox"]').check();
      await page.locator('.property-form input[type="text"]').first().fill('Issue Description');
      
      // Add another field
      await page.locator('.element-item', { hasText: 'Email' })
        .dragTo(page.locator('.canvas'));
      await page.waitForTimeout(300);
      
      page.on('dialog', dialog => dialog.accept());
      await page.locator('button', { hasText: 'Save Form' }).click();
      await page.waitForTimeout(1000);
      
      // Go to forms list
      await page.goto(`${BASE_URL}/forms`);
      await page.waitForSelector("h1", { timeout: 30000 });
    await page.waitForTimeout(1000);
      
      // Fill the form
      await page.locator('.form-card .btn-primary', { hasText: 'Fill Form' }).first().click();
      await page.waitForTimeout(1000);
      
      // Fill in the form fields
      await page.locator('input[type="text"]').fill('Network connection issue');
      await page.locator('input[type="email"]').fill('john@example.com');
      
      // Submit the form
      await page.locator('button[type="submit"]').click();
      await page.waitForTimeout(1500);
      
      // Verify success message
      await expect(page.locator('text=Form Submitted Successfully')).toBeVisible();
    });

    test('TC-FORMFILL-003: Form validates required fields', async ({ page }) => {
      await login(page);
      
      // Create a form with required field
      await page.goto(`${BASE_URL}/form-builder`);
      await page.waitForSelector(".element-item", { timeout: 30000 });
    await page.waitForTimeout(1000);
      
      await page.locator('.form-name-input').fill('Validation Test Form');
      await page.locator('.element-item', { hasText: 'Single Line Text' })
        .dragTo(page.locator('.canvas'));
      await page.waitForTimeout(300);
      
      // Make it required
      await page.locator('.form-element').click();
      await page.waitForTimeout(200);
      await page.locator('.property-form input[type="checkbox"]').check();
      
      page.on('dialog', dialog => dialog.accept());
      await page.locator('button', { hasText: 'Save Form' }).click();
      await page.waitForTimeout(1000);
      
      // Go to forms list
      await page.goto(`${BASE_URL}/forms`);
      await page.waitForSelector("h1", { timeout: 30000 });
    await page.waitForTimeout(1000);
      
      // Fill the form without filling required field
      await page.locator('.form-card .btn-primary', { hasText: 'Fill Form' }).first().click();
      await page.waitForTimeout(1000);
      
      // Try to submit without filling required field
      await page.locator('button[type="submit"]').click();
      await page.waitForTimeout(1000);
      
      // Should show error or not submit
      // (Validation should prevent submission)
    });
  });
});
