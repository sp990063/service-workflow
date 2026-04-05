import { test, expect, Page } from '@playwright/test';

const BASE_URL = 'http://localhost:4200';

/**
 * ServiceFlow - Form Element E2E Tests
 * 
 * Tests each form element type in the form-builder:
 * - Text (Single Line Text)
 * - Email
 * - Select/Dropdown
 * - Textarea (Multi Line Text)
 * - Checkbox
 * - Radio
 * - Date
 * - Number
 * - User Picker (Role-Based: Assignee Selector)
 * - Department Picker (Role-Based)
 * 
 * Each test follows UI Testing Skill pattern with screenshot afterEach.
 */

async function login(page: Page) {
  await page.goto(`${BASE_URL}/login`);
  await page.fill('input[type="email"]', 'admin@example.com');
  await page.fill('input[type="password"]', 'password123');
  await page.click('button[type="submit"]');
  await page.waitForURL(`${BASE_URL}/**`, { timeout: 10000 });
}

test.describe('Form Element Tests', () => {
  
  test.afterEach(async ({ page }, testInfo) => {
    const status = testInfo.status === 'passed' ? 'pass' : 'fail';
    const safeName = testInfo.title.replace(/[^a-zA-Z0-9]/g, '-').substring(0, 50);
    await page.screenshot({ 
      path: `tests/e2e/reports/${safeName}-${status}.png`,
      fullPage: true 
    });
  });

  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto(`${BASE_URL}/form-builder`);
    await page.waitForTimeout(2000);
  });

  // Helper function to get element on canvas by label
  async function getCanvasElement(page: Page, label: string) {
    return page.locator(`.form-element:has-text("${label}")`).first();
  }

  // ─── TC-FORM-ELEM-001: Text Element ────────────────────────────────────────
  
  test('TC-FORM-ELEM-001: Text element renders correctly', async ({ page }) => {
    // Drag text element from palette
    const textItem = page.locator('.element-item:has-text("Single Line Text")');
    const canvas = page.locator('.canvas');
    await textItem.dragTo(canvas);
    
    // Verify element appears on canvas
    await expect(page.locator('.form-element').first()).toBeVisible();
    await expect(page.locator('.element-type:text-is("text")')).toBeVisible();
    
    // Click to select
    await page.locator('.form-element').first().click();
    await expect(page.locator('.form-element.selected')).toBeVisible();
    
    // Verify properties panel shows (has Label input)
    await expect(page.locator('.property-form')).toBeVisible();
    await expect(page.locator('.property-form input').first()).toBeVisible();
    
    // Edit label in properties
    await page.locator('.property-form input').first().fill('Full Name');
    
    // Verify label updated on canvas
    await expect(page.locator('.element-label:text("Full Name")')).toBeVisible();
    
    // Test required checkbox
    await page.locator('.property-form input[type="checkbox"]').check();
    await expect(page.locator('.required-badge')).toBeVisible();
    
    // Test delete via hover
    await page.locator('.form-element').first().hover();
    await page.locator('.delete-btn').click();
    await expect(page.locator('.form-element')).toHaveCount(0);
  });

  // ─── TC-FORM-ELEM-002: Email Element ───────────────────────────────────────
  
  test('TC-FORM-ELEM-002: Email element renders correctly', async ({ page }) => {
    // Drag email element
    const emailItem = page.locator('.element-item:has-text("Email")');
    const canvas = page.locator('.canvas');
    await emailItem.dragTo(canvas);
    
    // Verify element appears
    await expect(page.locator('.form-element').first()).toBeVisible();
    await expect(page.locator('.element-type:text-is("email")')).toBeVisible();
    
    // Click to select
    await page.locator('.form-element').first().click();
    await expect(page.locator('.form-element.selected')).toBeVisible();
    
    // Edit label
    await page.locator('.property-form input').first().fill('Work Email');
    
    // Verify label updated
    await expect(page.locator('.element-label:text("Work Email")')).toBeVisible();
    
    // Test required toggle
    await page.locator('.property-form input[type="checkbox"]').check();
    await expect(page.locator('.required-badge')).toBeVisible();
    
    // Test delete
    await page.locator('.form-element').first().hover();
    await page.locator('.delete-btn').click();
    await expect(page.locator('.form-element')).toHaveCount(0);
  });

  // ─── TC-FORM-ELEM-003: Select/Dropdown Element ──────────────────────────────
  
  test('TC-FORM-ELEM-003: Dropdown element renders correctly', async ({ page }) => {
    // Drag dropdown element
    const dropdownItem = page.locator('.element-item:has-text("Dropdown")');
    const canvas = page.locator('.canvas');
    await dropdownItem.dragTo(canvas);
    
    // Verify element appears
    await expect(page.locator('.form-element').first()).toBeVisible();
    await expect(page.locator('.element-type:text-is("dropdown")')).toBeVisible();
    
    // Verify select preview exists
    await expect(page.locator('.form-element select').first()).toBeVisible();
    
    // Click to select
    await page.locator('.form-element').first().click();
    await expect(page.locator('.form-element.selected')).toBeVisible();
    
    // Verify properties panel shows textarea for options
    await expect(page.locator('.property-form textarea')).toBeVisible();
    
    // Edit label
    await page.locator('.property-form input').first().fill('Department');
    
    // Add options
    await page.locator('.property-form textarea').fill('Engineering\nSales\nMarketing\nHR');
    
    // Test required toggle
    await page.locator('.property-form input[type="checkbox"]').check();
    await expect(page.locator('.required-badge')).toBeVisible();
    
    // Test delete
    await page.locator('.form-element').first().hover();
    await page.locator('.delete-btn').click();
    await expect(page.locator('.form-element')).toHaveCount(0);
  });

  // ─── TC-FORM-ELEM-004: Textarea Element ─────────────────────────────────────
  
  test('TC-FORM-ELEM-004: Textarea element renders correctly', async ({ page }) => {
    // Drag textarea element
    const textareaItem = page.locator('.element-item:has-text("Multi Line Text")');
    const canvas = page.locator('.canvas');
    await textareaItem.dragTo(canvas);
    
    // Verify element appears
    await expect(page.locator('.form-element').first()).toBeVisible();
    await expect(page.locator('.element-type:text-is("textarea")')).toBeVisible();
    
    // Verify textarea preview exists
    await expect(page.locator('.form-element textarea').first()).toBeVisible();
    
    // Click to select
    await page.locator('.form-element').first().click();
    await expect(page.locator('.form-element.selected')).toBeVisible();
    
    // Edit label
    await page.locator('.property-form input').first().fill('Description');
    
    // Test required toggle
    await page.locator('.property-form input[type="checkbox"]').check();
    await expect(page.locator('.required-badge')).toBeVisible();
    
    // Test delete
    await page.locator('.form-element').first().hover();
    await page.locator('.delete-btn').click();
    await expect(page.locator('.form-element')).toHaveCount(0);
  });

  // ─── TC-FORM-ELEM-005: Checkbox Element ─────────────────────────────────────
  
  test('TC-FORM-ELEM-005: Checkbox element renders correctly', async ({ page }) => {
    // Drag checkbox element
    const checkboxItem = page.locator('.element-item:has-text("Checkboxes")');
    const canvas = page.locator('.canvas');
    await checkboxItem.dragTo(canvas);
    
    // Verify element appears
    await expect(page.locator('.form-element').first()).toBeVisible();
    await expect(page.locator('.element-type:text-is("checkbox")')).toBeVisible();
    
    // Verify checkbox preview exists
    await expect(page.locator('.checkbox-preview')).toBeVisible();
    
    // Click to select
    await page.locator('.form-element').first().click();
    await expect(page.locator('.form-element.selected')).toBeVisible();
    
    // Verify properties panel shows textarea for options
    await expect(page.locator('.property-form textarea')).toBeVisible();
    
    // Edit label
    await page.locator('.property-form input').first().fill('Interested Topics');
    
    // Add options
    await page.locator('.property-form textarea').fill('Angular\nReact\nVue\nNode.js');
    
    // Test required toggle
    await page.locator('.property-form input[type="checkbox"]').check();
    await expect(page.locator('.required-badge')).toBeVisible();
    
    // Test delete
    await page.locator('.form-element').first().hover();
    await page.locator('.delete-btn').click();
    await expect(page.locator('.form-element')).toHaveCount(0);
  });

  // ─── TC-FORM-ELEM-006: Radio Button Element ─────────────────────────────────
  
  test('TC-FORM-ELEM-006: Radio element renders correctly', async ({ page }) => {
    // Drag radio element
    const radioItem = page.locator('.element-item:has-text("Radio Buttons")');
    const canvas = page.locator('.canvas');
    await radioItem.dragTo(canvas);
    
    // Verify element appears
    await expect(page.locator('.form-element').first()).toBeVisible();
    await expect(page.locator('.element-type:text-is("radio")')).toBeVisible();
    
    // Verify radio preview exists
    await expect(page.locator('.radio-preview')).toBeVisible();
    
    // Click to select
    await page.locator('.form-element').first().click();
    await expect(page.locator('.form-element.selected')).toBeVisible();
    
    // Verify properties panel shows textarea for options
    await expect(page.locator('.property-form textarea')).toBeVisible();
    
    // Edit label
    await page.locator('.property-form input').first().fill('Priority Level');
    
    // Add options
    await page.locator('.property-form textarea').fill('Low\nMedium\nHigh\nCritical');
    
    // Test required toggle
    await page.locator('.property-form input[type="checkbox"]').check();
    await expect(page.locator('.required-badge')).toBeVisible();
    
    // Test delete
    await page.locator('.form-element').first().hover();
    await page.locator('.delete-btn').click();
    await expect(page.locator('.form-element')).toHaveCount(0);
  });

  // ─── TC-FORM-ELEM-007: Date Element ─────────────────────────────────────────
  
  test('TC-FORM-ELEM-007: Date element renders correctly', async ({ page }) => {
    // Drag date element (use icon to distinguish from Date Range)
    const dateItem = page.locator('.element-item:has(.el-icon:text-is("📅"))');
    const canvas = page.locator('.canvas');
    await dateItem.dragTo(canvas);
    
    // Verify element appears
    await expect(page.locator('.form-element').first()).toBeVisible();
    await expect(page.locator('.element-type:text-is("date")')).toBeVisible();
    
    // Verify date input preview exists
    await expect(page.locator('.form-element input[type="date"]')).toBeVisible();
    
    // Click to select (use exact text match for Date, not Date Range)
    await page.locator('.form-element:has(.element-type:text-is("date"))').click();
    await expect(page.locator('.form-element.selected')).toBeVisible();
    
    // Edit label
    await page.locator('.property-form input').first().fill('Start Date');
    
    // Test required toggle
    await page.locator('.property-form input[type="checkbox"]').check();
    await expect(page.locator('.required-badge')).toBeVisible();
    
    // Test delete
    await page.locator('.form-element').first().hover();
    await page.locator('.delete-btn').click();
    await expect(page.locator('.form-element')).toHaveCount(0);
  });

  // ─── TC-FORM-ELEM-008: Number Element ────────────────────────────────────────
  
  test('TC-FORM-ELEM-008: Number element renders correctly', async ({ page }) => {
    // Drag number element
    const numberItem = page.locator('.element-item:has-text("Number")');
    const canvas = page.locator('.canvas');
    await numberItem.dragTo(canvas);
    
    // Verify element appears
    await expect(page.locator('.form-element').first()).toBeVisible();
    await expect(page.locator('.element-type:text-is("number")')).toBeVisible();
    
    // Verify number input preview exists
    await expect(page.locator('.form-element input[type="number"]')).toBeVisible();
    
    // Click to select
    await page.locator('.form-element').first().click();
    await expect(page.locator('.form-element.selected')).toBeVisible();
    
    // Edit label
    await page.locator('.property-form input').first().fill('Quantity');
    
    // Test required toggle
    await page.locator('.property-form input[type="checkbox"]').check();
    await expect(page.locator('.required-badge')).toBeVisible();
    
    // Test delete
    await page.locator('.form-element').first().hover();
    await page.locator('.delete-btn').click();
    await expect(page.locator('.form-element')).toHaveCount(0);
  });

  // ─── TC-FORM-ELEM-009: User Picker Element (Role-Based: Assignee Selector) ──
  
  test('TC-FORM-ELEM-009: User Picker element renders correctly for assignee selection', async ({ page }) => {
    // Drag user picker element
    const userPickerItem = page.locator('.element-item:has-text("User Picker")');
    const canvas = page.locator('.canvas');
    await userPickerItem.dragTo(canvas);
    
    // Verify element appears
    await expect(page.locator('.form-element').first()).toBeVisible();
    await expect(page.locator('.element-type:text-is("userpicker")')).toBeVisible();
    
    // Verify element type icon exists (👤)
    await expect(page.locator('.el-icon:text-is("👤")').first()).toBeVisible();
    
    // Click to select
    await page.locator('.form-element').first().click();
    await expect(page.locator('.form-element.selected')).toBeVisible();
    
    // Verify properties panel shows
    await expect(page.locator('.property-form')).toBeVisible();
    
    // Edit label to describe the assignee purpose
    await page.locator('.property-form input').first().fill('Assign To');
    
    // Verify label updated
    await expect(page.locator('.element-label:text("Assign To")')).toBeVisible();
    
    // Test required toggle
    await page.locator('.property-form input[type="checkbox"]').check();
    await expect(page.locator('.required-badge')).toBeVisible();
    
    // Test delete
    await page.locator('.form-element').first().hover();
    await page.locator('.delete-btn').click();
    await expect(page.locator('.form-element')).toHaveCount(0);
  });

  // ─── TC-FORM-ELEM-010: Department Picker Element (Role-Based) ──────────────
  
  test('TC-FORM-ELEM-010: Department Picker element renders correctly', async ({ page }) => {
    // Drag department picker element
    const deptPickerItem = page.locator('.element-item:has-text("Department Picker")');
    const canvas = page.locator('.canvas');
    await deptPickerItem.dragTo(canvas);
    
    // Verify element appears
    await expect(page.locator('.form-element').first()).toBeVisible();
    await expect(page.locator('.element-type:text-is("deptpicker")')).toBeVisible();
    
    // Verify element type icon exists (🏢)
    await expect(page.locator('.el-icon:text-is("🏢")').first()).toBeVisible();
    
    // Click to select
    await page.locator('.form-element').first().click();
    await expect(page.locator('.form-element.selected')).toBeVisible();
    
    // Verify properties panel shows
    await expect(page.locator('.property-form')).toBeVisible();
    
    // Edit label
    await page.locator('.property-form input').first().fill('Department');
    
    // Verify label updated
    await expect(page.locator('.element-label:text("Department")')).toBeVisible();
    
    // Test required toggle
    await page.locator('.property-form input[type="checkbox"]').check();
    await expect(page.locator('.required-badge')).toBeVisible();
    
    // Test delete
    await page.locator('.form-element').first().hover();
    await page.locator('.delete-btn').click();
    await expect(page.locator('.form-element')).toHaveCount(0);
  });

  // ─── TC-FORM-ELEM-011: Multiple Elements on Canvas ───────────────────────────
  
  test('TC-FORM-ELEM-011: Multiple elements can coexist on canvas', async ({ page }) => {
    // Add multiple elements
    const textItem = page.locator('.element-item:has-text("Single Line Text")');
    const emailItem = page.locator('.element-item:has-text("Email")');
    const dropdownItem = page.locator('.element-item:has-text("Dropdown")');
    const canvas = page.locator('.canvas');
    
    await textItem.dragTo(canvas);
    await emailItem.dragTo(canvas);
    await dropdownItem.dragTo(canvas);
    
    // Verify all 3 elements are on canvas
    const elements = page.locator('.form-element');
    await expect(elements).toHaveCount(3);
    
    // Verify element types include text, email, dropdown
    await expect(page.locator('.element-type:text-is("text")')).toBeVisible();
    await expect(page.locator('.element-type:text-is("email")')).toBeVisible();
    await expect(page.locator('.element-type:text-is("dropdown")')).toBeVisible();
    
    // Select each element and verify selection works
    const textEl = page.locator('.form-element').first();
    await textEl.click();
    await expect(textEl).toHaveClass(/selected/);
    
    const emailEl = page.locator('.form-element').nth(1);
    await emailEl.click();
    await expect(emailEl).toHaveClass(/selected/);
    await expect(textEl).not.toHaveClass(/selected/);
  });

  // ─── TC-FORM-ELEM-012: Clear Form ────────────────────────────────────────────
  
  test('TC-FORM-ELEM-012: Clear form removes all elements', async ({ page }) => {
    // Add multiple elements
    const textItem = page.locator('.element-item:has-text("Single Line Text")');
    const emailItem = page.locator('.element-item:has-text("Email")');
    const canvas = page.locator('.canvas');
    
    await textItem.dragTo(canvas);
    await emailItem.dragTo(canvas);
    
    // Verify elements exist
    const elements = page.locator('.form-element');
    await expect(elements).toHaveCount(2);
    
    // Click clear button
    await page.click('button:has-text("Clear")');
    
    // Verify all elements are removed
    await expect(elements).toHaveCount(0);
    
    // Verify empty canvas message appears
    await expect(page.locator('.empty-canvas')).toBeVisible();
  });

  // ─── TC-FORM-ELEM-013: Form Name Editing ─────────────────────────────────────
  
  test('TC-FORM-ELEM-013: Form name can be edited', async ({ page }) => {
    // Find form name input
    const formNameInput = page.locator('.form-name-input');
    
    // Verify default value
    await expect(formNameInput).toHaveValue('Untitled Form');
    
    // Clear and enter new name
    await formNameInput.clear();
    await formNameInput.fill('My Custom Form');
    
    // Verify new name
    await expect(formNameInput).toHaveValue('My Custom Form');
  });

  // ─── TC-FORM-ELEM-014: Role-Based Elements with Standard Elements ─────────────
  
  test('TC-FORM-ELEM-014: Role-based elements can coexist with standard form elements', async ({ page }) => {
    const canvas = page.locator('.canvas');
    
    // Add a mix of standard and role-based elements
    const textItem = page.locator('.element-item:has-text("Single Line Text")');
    const emailItem = page.locator('.element-item:has-text("Email")');
    const userPickerItem = page.locator('.element-item:has-text("User Picker")');
    const dropdownItem = page.locator('.element-item:has-text("Dropdown")');
    const deptPickerItem = page.locator('.element-item:has-text("Department Picker")');
    
    await textItem.dragTo(canvas);
    await emailItem.dragTo(canvas);
    await userPickerItem.dragTo(canvas);
    await dropdownItem.dragTo(canvas);
    await deptPickerItem.dragTo(canvas);
    
    // Verify all 5 elements are on canvas
    const elements = page.locator('.form-element');
    await expect(elements).toHaveCount(5);
    
    // Verify each element type
    await expect(page.locator('.element-type:text-is("text")')).toBeVisible();
    await expect(page.locator('.element-type:text-is("email")')).toBeVisible();
    await expect(page.locator('.element-type:text-is("userpicker")')).toBeVisible();
    await expect(page.locator('.element-type:text-is("dropdown")')).toBeVisible();
    await expect(page.locator('.element-type:text-is("deptpicker")')).toBeVisible();
    
    // Select and deselect role-based elements
    const userPickerEl = page.locator('.form-element:has(.element-type:text-is("userpicker"))');
    await userPickerEl.click();
    await expect(userPickerEl).toHaveClass(/selected/);
    
    const deptPickerEl = page.locator('.form-element:has(.element-type:text-is("deptpicker"))');
    await deptPickerEl.click();
    await expect(deptPickerEl).toHaveClass(/selected/);
    await expect(userPickerEl).not.toHaveClass(/selected/);
  });

  // ─── TC-FORM-ELEM-015: Role-Based Element Labels for Workflow Context ────────
  
  test('TC-FORM-ELEM-015: Role-based element labels can be configured for workflow context', async ({ page }) => {
    const canvas = page.locator('.canvas');
    
    // Add User Picker for assignee selection
    const userPickerItem = page.locator('.element-item:has-text("User Picker")');
    await userPickerItem.dragTo(canvas);
    
    // Configure as "Assigned Approver"
    const userPickerEl = page.locator('.form-element').first();
    await userPickerEl.click();
    await page.locator('.property-form input').first().fill('Assigned Approver');
    
    // Add Department Picker
    const deptPickerItem = page.locator('.element-item:has-text("Department Picker")');
    await deptPickerItem.dragTo(canvas);
    
    // Configure as "Requester Department"
    const deptPickerEl = page.locator('.form-element').last();
    await deptPickerEl.click();
    await page.locator('.property-form input').first().fill('Requester Department');
    
    // Verify both elements show the correct labels
    await expect(page.locator('.element-label:text("Assigned Approver")')).toBeVisible();
    await expect(page.locator('.element-label:text("Requester Department")')).toBeVisible();
    
    // Verify element types indicate role-based selection
    await expect(page.locator('.element-type:text-is("userpicker")')).toBeVisible();
    await expect(page.locator('.element-type:text-is("deptpicker")')).toBeVisible();
  });
});
