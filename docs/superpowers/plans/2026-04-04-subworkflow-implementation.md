# Sub-Workflow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement sub-workflow (nested workflow) support where one workflow can trigger another workflow and wait for its completion before continuing.

**Architecture:** Add a new "Sub-Workflow" node type that triggers a child workflow instance. When the parent workflow reaches this node, it creates a child instance, changes parent status to "waiting-for-child", and resumes when child completes.

**Tech Stack:** Angular 21, TypeScript, Playwright E2E, LocalStorage for persistence

---

## File Structure

### Files to Create
- `src/app/features/workflow-player/sub-workflow-node.component.ts` - Sub-workflow node UI component
- `src/app/models/workflow-instance.model.ts` - Updated interface with parent/child relationships
- `tests/e2e/subworkflow.spec.ts` - Sub-workflow E2E tests

### Files to Modify
- `src/app/features/workflow-designer/workflow-designer.component.ts` - Add sub-workflow node type
- `src/app/features/workflow-player/workflow-player.component.ts` - Add sub-workflow triggering logic
- `src/app/features/workflow-designer/node-palette.component.html` - Add palette entry
- `tests/e2e/workflow-realistic.spec.ts` - Add scenario tests

---

## Task 1: Update WorkflowInstance Model

**Files:**
- Modify: `src/app/models/workflow-instance.model.ts`

- [ ] **Step 1: Update interface**

```typescript
export interface WorkflowInstance {
  id: string;
  workflowId: string;
  workflowName: string;
  currentNodeId: string | null;
  status: 'pending' | 'in-progress' | 'waiting-for-child' | 'completed';
  formData: Record<string, any>;
  history: HistoryEntry[];
  childInstanceId?: string;  // Child workflow instance if waiting
  parentInstanceId?: string; // Parent instance if this is a child
}
```

- [ ] **Step 2: Run build to verify**

Run: `cd /home/cwlai/.openclaw/workspace/service-workflow && npm run build 2>&1 | tail -20`
Expected: No errors related to workflow-instance.model

- [ ] **Step 3: Commit**

```bash
git add src/app/models/workflow-instance.model.ts
git commit -m "feat: add parent-child relationship fields to WorkflowInstance"
```

---

## Task 2: Add Sub-Workflow Node Type to Designer

**Files:**
- Modify: `src/app/features/workflow-designer/workflow-designer.component.ts:1-20` (add node type)

- [ ] **Step 1: Add sub-workflow to NODE_TYPES**

```typescript
{ type: 'sub-workflow', label: 'Sub-Workflow', icon: '⊂', color: '#ec4899' },
```

- [ ] **Step 2: Add sub-workflow node creation in addNode()**

```typescript
case 'sub-workflow':
  newNode = {
    id: crypto.randomUUID(),
    type: 'sub-workflow',
    position: { x: 100, y: 200 },
    data: {
      label: 'Sub-Workflow',
      description: 'Triggers a child workflow',
      childWorkflowId: '',  // User selects from list of existing workflows
      waitForCompletion: true
    }
  };
  break;
```

- [ ] **Step 3: Add properties panel for sub-workflow node**

```typescript
@if (selectedNode()?.type === 'sub-workflow') {
  <div class="property-form">
    <h4>Sub-Workflow Properties</h4>
    <label>
      <span>Label</span>
      <input type="text" [value]="selectedNode()?.data['label']" 
             (change)="updateNodeProperty('label', $any($event.target).value)">
    </label>
    <label>
      <span>Description</span>
      <textarea [value]="selectedNode()?.data['description']"
                (change)="updateNodeProperty('description', $any($event.target).value)"></textarea>
    </label>
    <label>
      <span>Child Workflow</span>
      <select [value]="selectedNode()?.data['childWorkflowId']"
              (change)="updateNodeProperty('childWorkflowId', $any($event.target).value)">
        <option value="">Select workflow...</option>
        @for (wf of workflows(); track wf.id) {
          <option [value]="wf.id">{{ wf.name }}</option>
        }
      </select>
    </label>
    <label class="checkbox">
      <input type="checkbox" [checked]="selectedNode()?.data['waitForCompletion']"
             (change)="updateNodeProperty('waitForCompletion', $any($event.target).checked)">
      <span>Wait for completion</span>
    </label>
  </div>
}
```

- [ ] **Step 4: Build and verify**

Run: `cd /home/cwlai/.openclaw/workspace/service-workflow && npm run build 2>&1 | tail -10`
Expected: No TypeScript errors

- [ ] **Step 5: Commit**

```bash
git add src/app/features/workflow-designer/
git commit -m "feat: add sub-workflow node type to designer"
```

---

## Task 3: Implement Sub-Workflow Triggering Logic

**Files:**
- Modify: `src/app/features/workflow-player/workflow-player.component.ts`

- [ ] **Step 1: Add sub-workflow node handling in template**

Add after the approval section in the template:

```angular2html
<!-- Sub-Workflow Node -->
@if (currentNode()?.type === 'sub-workflow') {
  <div class="sub-workflow-section">
    <h4>Sub-Workflow</h4>
    <p>{{ currentNode()?.data['description'] || 'This step triggers a child workflow' }}</p>
    
    @if (!instance()?.childInstanceId) {
      <button class="btn btn-primary" (click)="startSubWorkflow()">
        Start Sub-Workflow
      </button>
    } @else {
      <div class="waiting-message">
        <p>Waiting for sub-workflow to complete...</p>
        <button class="btn btn-secondary" (click)="checkSubWorkflowStatus()">
          Check Status
        </button>
      </div>
    }
  </div>
}
```

- [ ] **Step 2: Add sub-workflow methods**

```typescript
startSubWorkflow() {
  const inst = this.instance();
  const currentNode = this.currentNode();
  if (!inst || !currentNode || currentNode.type !== 'sub-workflow') return;
  
  const childWorkflowId = currentNode.data['childWorkflowId'];
  if (!childWorkflowId) {
    alert('Please select a child workflow in the designer');
    return;
  }
  
  // Get the child workflow definition
  const workflows = this.storage.get<any[]>('workflows') || [];
  const childWorkflow = workflows.find(w => w.id === childWorkflowId);
  if (!childWorkflow) return;
  
  // Create child instance
  const childInstances = this.storage.get<WorkflowInstance[]>('workflowInstances') || [];
  const startNode = childWorkflow.nodes.find((n: any) => n.type === 'start');
  
  const childInstance: WorkflowInstance = {
    id: crypto.randomUUID(),
    workflowId: childWorkflowId,
    workflowName: childWorkflow.name,
    currentNodeId: startNode?.id || null,
    status: 'in-progress',
    formData: { ...inst.formData },  // Copy form data
    history: [],
    parentInstanceId: inst.id  // Link to parent
  };
  
  childInstances.push(childInstance);
  this.storage.set('workflowInstances', childInstances);
  
  // Update parent instance - now waiting for child
  inst.childInstanceId = childInstance.id;
  inst.status = 'waiting-for-child';
  inst.history.push({
    nodeId: currentNode.id,
    action: `Started sub-workflow: ${childWorkflow.name}`,
    timestamp: new Date()
  });
  
  this.updateInstance(inst);
}

checkSubWorkflowStatus() {
  const inst = this.instance();
  if (!inst?.childInstanceId) return;
  
  const childInstances = this.storage.get<WorkflowInstance[]>('workflowInstances') || [];
  const childInstance = childInstances.find(i => i.id === inst.childInstanceId);
  
  if (childInstance?.status === 'completed') {
    // Child done - resume parent workflow
    this.resumeFromSubWorkflow();
  }
}

resumeFromSubWorkflow() {
  const inst = this.instance();
  const currentNode = this.currentNode();
  const wf = this.workflow();
  if (!inst || !currentNode || !wf) return;
  
  // Find current node index and advance to next
  const currentIdx = wf.nodes.findIndex(n => n.id === inst.currentNodeId);
  if (currentIdx >= 0 && currentIdx < wf.nodes.length - 1) {
    const nextNode = wf.nodes[currentIdx + 1];
    
    // Add sub-workflow node to history
    inst.history.push({
      nodeId: currentNode.id,
      action: `Completed: ${currentNode.data['label'] || currentNode.type}`,
      timestamp: new Date()
    });
    
    inst.currentNodeId = nextNode.id;
    inst.childInstanceId = undefined;
    inst.status = 'in-progress';
    
    if (nextNode.type === 'end') {
      inst.status = 'completed';
    }
    
    this.updateInstance(inst);
  }
}
```

- [ ] **Step 3: Update advanceWorkflow() to check if waiting for child**

```typescript
advanceWorkflow() {
  const inst = this.instance();
  const wf = this.workflow();
  if (!inst || !wf) return;
  
  // If waiting for child, don't advance
  if (inst.status === 'waiting-for-child') {
    return;
  }
  
  // ... rest of existing logic
}
```

- [ ] **Step 4: Add CSS for sub-workflow section**

```css
.sub-workflow-section {
  padding: 20px;
  background: #fdf4ff;
  border-radius: 8px;
  border: 1px solid #ec4899;
}

.waiting-message {
  padding: 15px;
  background: #fef3c7;
  border-radius: 4px;
  margin-top: 10px;
}
```

- [ ] **Step 5: Build and verify**

Run: `cd /home/cwlai/.openclaw/workspace/service-workflow && npm run build 2>&1 | tail -10`
Expected: No TypeScript errors

- [ ] **Step 6: Commit**

```bash
git add src/app/features/workflow-player/
git commit -m "feat: implement sub-workflow triggering and waiting logic"
```

---

## Task 4: Write Sub-Workflow E2E Tests

**Files:**
- Create: `tests/e2e/subworkflow.spec.ts`

- [ ] **Step 1: Write TC-SUB-001 test**

```typescript
test('TC-SUB-001: Parent workflow triggers child and waits for completion', async ({ page }) => {
  await login(page);
  
  // Create Child Workflow first
  await page.goto(`${BASE_URL}/workflow-designer`);
  await page.locator('.workflow-name-input').fill('Child Workflow');
  
  await page.locator('button', { hasText: '+ Start' }).click();
  await page.waitForTimeout(200);
  
  // Add task node
  const taskNode = page.locator('.node-item', { hasText: 'Task' });
  await taskNode.dragTo(page.locator('.canvas-container'), { targetPosition: { x: 200, y: 100 }, force: true });
  await page.waitForTimeout(200);
  
  await page.locator('.workflow-node').nth(1).click();
  await page.waitForTimeout(100);
  await page.locator('.property-form input[type="text"]').nth(1).fill('Child Task');
  
  // Add End node
  await page.keyboard.press('Escape');
  await page.waitForTimeout(100);
  const endNode = page.locator('.node-item', { hasText: 'End' });
  await endNode.dragTo(page.locator('.canvas-container'), { targetPosition: { x: 400, y: 100 }, force: true });
  
  page.on('dialog', dialog => dialog.accept());
  await page.locator('button', { hasText: 'Save Workflow' }).click();
  await page.waitForTimeout(1500);
  
  // Get child workflow ID from URL or localStorage
  const childWorkflowId = await page.evaluate(() => {
    const wfs = JSON.parse(localStorage.getItem('workflows') || '[]');
    const child = wfs.find((w: any) => w.name === 'Child Workflow');
    return child?.id;
  });
  
  // Create Parent Workflow
  await page.goto(`${BASE_URL}/workflow-designer`);
  await page.locator('.workflow-name-input').fill('Parent Workflow');
  
  await page.locator('button', { hasText: '+ Start' }).click();
  await page.waitForTimeout(200);
  
  // Add Sub-Workflow node
  const subWfNode = page.locator('.node-item', { hasText: 'Sub-Workflow' });
  await subWfNode.dragTo(page.locator('.canvas-container'), { targetPosition: { x: 200, y: 100 }, force: true });
  await page.waitForTimeout(200);
  
  // Configure sub-workflow node to call child
  await page.locator('.workflow-node').nth(1).click();
  await page.waitForTimeout(100);
  
  // Select child workflow
  await page.locator('.property-form select').selectOption(childWorkflowId);
  await page.waitForTimeout(100);
  
  // Add End node
  await page.keyboard.press('Escape');
  await page.waitForTimeout(100);
  const endNode2 = page.locator('.node-item', { hasText: 'End' });
  await endNode2.dragTo(page.locator('.canvas-container'), { targetPosition: { x: 400, y: 100 }, force: true });
  
  await page.locator('button', { hasText: 'Save Workflow' }).click();
  await page.waitForTimeout(1500);
  
  // Execute Parent Workflow
  await page.goto(`${BASE_URL}/workflows`);
  await page.locator('a', { hasText: 'Start Workflow' }).first().click();
  await page.waitForTimeout(1000);
  
  // Start parent
  await page.locator('button', { hasText: 'Start Workflow' }).click();
  await page.waitForTimeout(500);
  
  // Verify Sub-Workflow section visible
  await expect(page.locator('.sub-workflow-section')).toBeVisible();
  
  // Start sub-workflow
  await page.locator('button', { hasText: 'Start Sub-Workflow' }).click();
  await page.waitForTimeout(500);
  
  // Verify waiting message
  await expect(page.locator('.waiting-message')).toContainText('Waiting');
  
  // Go to child workflow and complete it
  await page.goto(`${BASE_URL}/workflows`);
  await page.waitForTimeout(500);
  
  // Find and complete child workflow
  const childLink = page.locator('h3', { hasText: 'Child Workflow' });
  if (await childLink.isVisible()) {
    await page.locator('a', { hasText: 'Start Workflow' }).first().click();
    await page.waitForTimeout(1000);
    await page.locator('button', { hasText: 'Start Workflow' }).click();
    await page.waitForTimeout(500);
    await page.locator('button', { hasText: 'Next Step' }).click();
    await page.waitForTimeout(500);
  }
  
  // Check parent status
  await page.goto(`${BASE_URL}/workflows`);
  await page.locator('a', { hasText: 'Start Workflow' }).first().click();
  await page.waitForTimeout(1000);
  
  // Click check status to resume
  if (await page.locator('button', { hasText: 'Check Status' }).isVisible()) {
    await page.locator('button', { hasText: 'Check Status' }).click();
    await page.waitForTimeout(500);
  }
  
  // Parent should complete
  await expect(page.locator('.completed-section')).toBeVisible({ timeout: 10000 });
});
```

- [ ] **Step 2: Run the test**

Run: `cd /home/cwlai/.openclaw/workspace/service-workflow && npx playwright test tests/e2e/subworkflow.spec.ts --reporter=line`

Expected: Test runs, may fail due to incomplete implementation (RED phase)

- [ ] **Step 3: Implement missing features to make test pass (GREEN phase)**

Continue implementing until test passes

- [ ] **Step 4: Commit**

```bash
git add tests/e2e/subworkflow.spec.ts
git commit -m "feat: add sub-workflow E2E tests (TC-SUB-001)"
```

---

## Task 5: Add Multi-User Scenario Tests

**Files:**
- Create: `tests/e2e/multi-user-workflows.spec.ts`

- [ ] **Step 1: Write TC-SCENARIO-001: IT Equipment Request**

```typescript
test('TC-SCENARIO-001: IT Equipment Request with Manager Approval and IT Processing', async ({ page }) => {
  // This test simulates the full scenario
  // 1. Employee submits request
  // 2. Manager approves
  // 3. IT Sub-Workflow runs
  // 4. Employee confirms receipt
  // ...
});
```

- [ ] **Step 2: Run and iterate**

- [ ] **Step 3: Commit**

---

## Self-Review Checklist

After completing implementation:

- [ ] Sub-workflow node appears in designer palette
- [ ] Can configure child workflow in properties panel
- [ ] Parent workflow shows waiting state when child starts
- [ ] Parent resumes when child completes
- [ ] E2E tests pass for TC-SUB-001
- [ ] Multi-user scenario tests written for all 5 scenarios

---

## Files Summary

| File | Action | Purpose |
|------|--------|---------|
| `src/app/models/workflow-instance.model.ts` | Modify | Add parent/child ID fields |
| `src/app/features/workflow-designer/workflow-designer.component.ts` | Modify | Add sub-workflow node type |
| `src/app/features/workflow-player/workflow-player.component.ts` | Modify | Add triggering and waiting logic |
| `tests/e2e/subworkflow.spec.ts` | Create | Sub-workflow E2E tests |
| `tests/e2e/multi-user-workflows.spec.ts` | Create | 5 scenario tests |
| `docs/scenarios/2026-04-04-multi-user-workflow-scenarios.md` | Create | Scenario documentation |
