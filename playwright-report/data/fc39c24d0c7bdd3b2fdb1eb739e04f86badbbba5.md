# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: missing-features.spec.ts >> Missing Features Tests - Other Features >> Escalation Rules >> MF-ESC-001: Approval should support time-based escalation
- Location: tests/e2e/missing-features.spec.ts:740:9

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('.property-form').filter({ hasText: /escalat|timeout|due.*date/i })
Expected: visible
Timeout: 3000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 3000ms
  - waiting for locator('.property-form').filter({ hasText: /escalat|timeout|due.*date/i })

```

# Page snapshot

```yaml
- generic [ref=e3]:
  - complementary [ref=e4]:
    - generic [ref=e5]: ServiceFlow
    - navigation [ref=e6]:
      - link "Dashboard" [ref=e7] [cursor=pointer]:
        - /url: /dashboard
      - link "Form Builder" [ref=e8] [cursor=pointer]:
        - /url: /form-builder
      - link "Forms" [ref=e9] [cursor=pointer]:
        - /url: /forms
      - link "Workflows" [ref=e10] [cursor=pointer]:
        - /url: /workflows
      - link "Delegations" [ref=e11] [cursor=pointer]:
        - /url: /delegations
      - link "Analytics" [ref=e12] [cursor=pointer]:
        - /url: /analytics
    - button "Logout" [ref=e13] [cursor=pointer]
  - main [ref=e14]:
    - generic [ref=e16]:
      - generic [ref=e17]:
        - textbox "Untitled Workflow" [ref=e19]: Escalation Test Workflow
        - generic [ref=e20]:
          - button "Clear" [ref=e21] [cursor=pointer]
          - button "+ Start" [ref=e22] [cursor=pointer]
          - button "Save Workflow" [ref=e23] [cursor=pointer]
      - generic [ref=e24]:
        - complementary [ref=e25]:
          - heading "Nodes" [level=3] [ref=e26]
          - generic [ref=e27]:
            - generic [ref=e28]:
              - generic [ref=e29]: ▶
              - generic [ref=e30]: Start
            - generic [ref=e31]:
              - generic [ref=e32]: ■
              - generic [ref=e33]: End
            - generic [ref=e34]:
              - generic [ref=e35]: ⬡
              - generic [ref=e36]: Task
            - generic [ref=e37]:
              - generic [ref=e38]: ◇
              - generic [ref=e39]: Condition
            - generic [ref=e40]:
              - generic [ref=e41]: ✓
              - generic [ref=e42]: Approval
            - generic [ref=e43]:
              - generic [ref=e44]: ∥
              - generic [ref=e45]: Parallel
            - generic [ref=e46]:
              - generic [ref=e47]: ⊥
              - generic [ref=e48]: Join
            - generic [ref=e49]:
              - generic [ref=e50]: ⊂
              - generic [ref=e51]: Sub-Workflow
            - generic [ref=e52]:
              - generic [ref=e53]: ⚙
              - generic [ref=e54]: Script
            - generic [ref=e55]:
              - generic [ref=e56]: ✎
              - generic [ref=e57]: Set Value
            - generic [ref=e58]:
              - generic [ref=e59]: ⇄
              - generic [ref=e60]: Transform
        - main [ref=e61]:
          - img
          - generic [ref=e62]:
            - generic [ref=e63]:
              - generic [ref=e64]: Start
              - generic [ref=e65]: Start
            - generic [ref=e68]:
              - generic [ref=e69]: Approval
              - generic [ref=e70]: Approval
        - complementary [ref=e73]:
          - heading "Properties" [level=3] [ref=e74]
          - generic [ref=e75]:
            - generic [ref=e76]:
              - generic [ref=e77]: Node Type
              - textbox [disabled] [ref=e78]: approval
            - generic [ref=e79]:
              - generic [ref=e80]: Label
              - textbox "Enter label" [ref=e81]: Approval
            - generic [ref=e82]:
              - generic [ref=e83]: Description
              - textbox [ref=e84]
            - button "Delete Node" [ref=e85] [cursor=pointer]
```

# Test source

```ts
  667 |       test.skip('Mixed sequential + parallel approval pattern not yet implemented');
  668 |     });
  669 | 
  670 |   });
  671 | 
  672 | });
  673 | 
  674 | test.describe('Missing Features Tests - Other Features', () => {
  675 | 
  676 |   test.beforeEach(async ({ page }) => {
  677 |     await page.goto(BASE_URL, { waitUntil: 'networkidle' });
  678 |     await page.evaluate(() => localStorage.clear());
  679 |     await page.goto(BASE_URL, { waitUntil: 'networkidle' });
  680 |   });
  681 | 
  682 |   test.afterEach(async ({ page }, testInfo) => {
  683 |     const status = testInfo.status === 'passed' ? 'pass' : 'fail';
  684 |     await page.screenshot({ 
  685 |       path: `tests/e2e/reports/${testInfo.title.replace(/\s+/g, '-')}-${status}.png`,
  686 |       fullPage: true 
  687 |     });
  688 |   });
  689 | 
  690 |   // ============================================
  691 |   // AD/LDAP INTEGRATION
  692 |   // ============================================
  693 | 
  694 |   test.describe('AD/LDAP Integration', () => {
  695 | 
  696 |     test('MF-AD-001: Admin panel should have LDAP configuration section', async ({ page }) => {
  697 |       await login(page);
  698 |       
  699 |       await page.goto(`${BASE_URL}/admin`, { waitUntil: 'networkidle' });
  700 |       await page.waitForTimeout(1000);
  701 |       
  702 |       // Check for LDAP/Active Directory settings
  703 |       const ldapSection = page.locator('text=/ldap|active.*directory|AD/i');
  704 |       const exists = await ldapSection.count() > 0;
  705 |       
  706 |       if (!exists) {
  707 |         console.log('❌ MISSING: AD/LDAP configuration section not found in admin panel');
  708 |         console.log('📋 SPEC requires: AD/LDAP user synchronization');
  709 |       }
  710 |       
  711 |       await expect(ldapSection).toBeVisible({ timeout: 3000 });
  712 |     });
  713 | 
  714 |     test('MF-AD-002: Users should be syncable from AD/LDAP', async ({ page }) => {
  715 |       await login(page);
  716 |       
  717 |       await page.goto(`${BASE_URL}/admin/users`, { waitUntil: 'networkidle' });
  718 |       await page.waitForTimeout(1000);
  719 |       
  720 |       // Check for sync button or LDAP indicators
  721 |       const syncButton = page.locator('button', { hasText: /sync.*ldap|ldap.*sync|import.*ad/i });
  722 |       const exists = await syncButton.count() > 0;
  723 |       
  724 |       if (!exists) {
  725 |         console.log('❌ MISSING: LDAP/AD sync functionality not found');
  726 |         console.log('📋 SPEC requires: Bi-directional sync with AD');
  727 |       }
  728 |       
  729 |       await expect(syncButton).toBeVisible({ timeout: 3000 });
  730 |     });
  731 | 
  732 |   });
  733 | 
  734 |   // ============================================
  735 |   // ESCALATION RULES
  736 |   // ============================================
  737 | 
  738 |   test.describe('Escalation Rules', () => {
  739 | 
  740 |     test('MF-ESC-001: Approval should support time-based escalation', async ({ page }) => {
  741 |       await login(page);
  742 |       
  743 |       await page.goto(`${BASE_URL}/workflow-designer`, { waitUntil: 'networkidle' });
  744 |       
  745 |       // Create a simple workflow with approval
  746 |       await page.locator('.workflow-name-input').fill('Escalation Test Workflow');
  747 |       await page.locator('button', { hasText: '+ Start' }).click();
  748 |       await page.waitForTimeout(200);
  749 |       
  750 |       const approvalNode = page.locator('.node-item', { hasText: 'Approval' });
  751 |       await approvalNode.dragTo(page.locator('.canvas-container'), { targetPosition: { x: 200, y: 80 } });
  752 |       await page.waitForTimeout(200);
  753 |       
  754 |       // Click on approval node to open properties
  755 |       await page.locator('.workflow-node').nth(1).click();
  756 |       await page.waitForTimeout(300);
  757 |       
  758 |       // Check for escalation settings in properties panel
  759 |       const escalationField = page.locator('.property-form', { hasText: /escalat|timeout|due.*date/i });
  760 |       const exists = await escalationField.count() > 0;
  761 |       
  762 |       if (!exists) {
  763 |         console.log('❌ MISSING: Escalation settings not found in approval properties');
  764 |         console.log('📋 SPEC requires: Escalation rules (time-based)');
  765 |       }
  766 |       
> 767 |       await expect(escalationField).toBeVisible({ timeout: 3000 });
      |                                     ^ Error: expect(locator).toBeVisible() failed
  768 |     });
  769 | 
  770 |   });
  771 | 
  772 |   // ============================================
  773 |   // DELEGATION
  774 |   // ============================================
  775 | 
  776 |   test.describe('Approval Delegation', () => {
  777 | 
  778 |     test('MF-DEL-001: Approver should be able to delegate to another user', async ({ page }) => {
  779 |       await login(page, 'manager');
  780 |       
  781 |       // Navigate to approval panel
  782 |       await page.goto(`${BASE_URL}/approvals`, { waitUntil: 'networkidle' });
  783 |       await page.waitForTimeout(1000);
  784 |       
  785 |       // Check for delegate option on approval request
  786 |       const delegateButton = page.locator('button', { hasText: /delegate|reassign/i });
  787 |       const exists = await delegateButton.count() > 0;
  788 |       
  789 |       if (!exists) {
  790 |         console.log('❌ MISSING: Delegate/Reassign option not found in approvals');
  791 |         console.log('📋 SPEC requires: Approval delegation');
  792 |       }
  793 |       
  794 |       // Try to find delegation UI
  795 |       const delegationUI = page.locator('.delegation-panel, .reassign-panel, text=/delegate.*to|reassign.*to/i');
  796 |       await expect(delegationUI).toBeVisible({ timeout: 3000 });
  797 |     });
  798 | 
  799 |   });
  800 | 
  801 |   // ============================================
  802 |   // EMAIL NOTIFICATIONS (partial implementation noted)
  803 |   // ============================================
  804 | 
  805 |   test.describe('Email Notifications', () => {
  806 | 
  807 |     test('MF-EMAIL-001: Email settings should be configurable in admin panel', async ({ page }) => {
  808 |       await login(page);
  809 |       
  810 |       await page.goto(`${BASE_URL}/admin/settings`, { waitUntil: 'networkidle' });
  811 |       await page.waitForTimeout(1000);
  812 |       
  813 |       // Check for SMTP/Email configuration
  814 |       const emailSettings = page.locator('text=/smtp|email.*setting|mail.*server/i');
  815 |       const exists = await emailSettings.count() > 0;
  816 |       
  817 |       if (!exists) {
  818 |         console.log('❌ MISSING: Email/SMTP settings not found in admin panel');
  819 |         console.log('📋 SPEC requires: Email notifications via SMTP');
  820 |       }
  821 |       
  822 |       await expect(emailSettings).toBeVisible({ timeout: 3000 });
  823 |     });
  824 | 
  825 |   });
  826 | 
  827 | });
  828 | 
  829 | test.describe('Missing Features Tests - Summary', () => {
  830 | 
  831 |   test('MF-SUMMARY-001: Generate missing features report', async ({ page }) => {
  832 |     // This test documents all missing features from SPEC-MVP.md
  833 |     
  834 |     const missingFeatures = {
  835 |       formElements: {
  836 |         missing: [
  837 |           'Phone',
  838 |           'Date Range',
  839 |           'Time',
  840 |           'Multi-Select',
  841 |           'Yes/No (Boolean Toggle)',
  842 |           'File Upload',
  843 |           'Image Upload',
  844 |           'Signature',
  845 |           'Rich Text Editor',
  846 |           'Table/Grid',
  847 |           'Calculated Field',
  848 |           'Address',
  849 |           'URL'
  850 |         ],
  851 |         implemented: [
  852 |           'Single Line Text',
  853 |           'Multi Line Text',
  854 |           'Email',
  855 |           'Number',
  856 |           'Date',
  857 |           'Dropdown',
  858 |           'Radio Buttons',
  859 |           'Checkboxes',
  860 |           'User Picker',
  861 |           'Department Picker'
  862 |         ]
  863 |       },
  864 |       workflowNodes: {
  865 |         missing: [
  866 |           'Condition',
  867 |           'Parallel Split',
```