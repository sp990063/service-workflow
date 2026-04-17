# ServiceFlow UX Fix Plan

## Status: Proposed
**Last updated:** 2026-04-18
**Goal:** Enable non-technical users to build and test workflows without writing code or encountering deadlocks

---

## Executive Summary

The current UX fails non-technical users in 4 critical areas. This plan fixes them in priority order:

| Priority | Issue | Impact | Fix |
|----------|-------|--------|-----|
| P0 | Condition node uses raw JS expressions | Blocks non-technical users entirely | Visual condition builder |
| P0 | No workflow validation / deadlock detection | Production deadlocks, silent failures | Validator service + inline warnings |
| P1 | No workflow simulation | High deployment friction, no testing | Simulation engine + endpoint |
| P1 | Parallel/Join has invisible semantics | Complex workflows incomprehensible | Branch visualization + coloring |
| P2 | Sub-workflow data mapping is JSON-only | Business users can't configure data pass-through | Visual mapper component |

---

## Part 1: Visual Condition Builder (P0)

### 1.1 Create ConditionConfig Interface

**File to create:** `backend/src/workflows/interfaces/condition-config.interface.ts`

```typescript
export enum ConditionOperator {
  EQ = 'eq',
  NE = 'ne',
  GT = 'gt',
  GTE = 'gte',
  LT = 'lt',
  LTE = 'lte',
  BETWEEN = 'between',
  CONTAINS = 'contains',
  IS_EMPTY = 'isEmpty',
  IS_NOT_EMPTY = 'isNotEmpty',
}

export enum FieldType {
  TEXT = 'text',
  NUMBER = 'number',
  DATE = 'date',
  YES_NO = 'yesNo',
  DROPDOWN = 'dropdown',
  MULTISELECT = 'multiselect',
}

export interface ConditionRule {
  id: string;
  field: string;       // e.g. "formData.amount"
  fieldType: FieldType;
  fieldLabel: string;  // e.g. "Amount"
  operator: ConditionOperator;
  value: any;
  valueEnd?: any;      // for BETWEEN
}

export interface ConditionGroup {
  id: string;
  combinator: 'AND' | 'OR';
  rules: ConditionRule[];
  groups?: ConditionGroup[];  // nested for complex logic
}

export interface ConditionConfig {
  rootGroup: ConditionGroup;
}
```

**Test:** Verify the interface compiles and exports correctly
```bash
cd backend && npx tsc --noEmit src/workflows/interfaces/condition-config.interface.ts
```

---

### 1.2 Create ConditionEvaluatorService

**File to create:** `backend/src/workflows/condition-evaluator.service.ts`

```typescript
import { Injectable } from '@nestjs/common';
import { ConditionConfig, ConditionGroup, ConditionRule, ConditionOperator } from './interfaces/condition-config.interface';

@Injectable()
export class ConditionEvaluatorService {

  evaluate(config: ConditionConfig, instanceData: Record<string, any>): boolean {
    return this.evaluateGroup(config.rootGroup, instanceData);
  }

  private evaluateGroup(group: ConditionGroup, data: Record<string, any>): boolean {
    const ruleResults = group.rules.map(r => this.evaluateRule(r, data));
    const groupResults = (group.groups || []).map(g => this.evaluateGroup(g, data));
    const allResults = [...ruleResults, ...groupResults];

    return group.combinator === 'AND'
      ? allResults.every(Boolean)
      : allResults.some(Boolean);
  }

  private evaluateRule(rule: ConditionRule, data: Record<string, any>): boolean {
    const fieldValue = this.resolveFieldValue(rule.field, data);

    switch (rule.operator) {
      case ConditionOperator.EQ:      return fieldValue === rule.value;
      case ConditionOperator.NE:      return fieldValue !== rule.value;
      case ConditionOperator.GT:      return Number(fieldValue) > Number(rule.value);
      case ConditionOperator.GTE:     return Number(fieldValue) >= Number(rule.value);
      case ConditionOperator.LT:      return Number(fieldValue) < Number(rule.value);
      case ConditionOperator.LTE:     return Number(fieldValue) <= Number(rule.value);
      case ConditionOperator.BETWEEN:  return Number(fieldValue) >= Number(rule.value) && Number(fieldValue) <= Number(rule.valueEnd);
      case ConditionOperator.CONTAINS: return typeof fieldValue === 'string' && fieldValue.includes(String(rule.value));
      case ConditionOperator.IS_EMPTY:  return fieldValue === null || fieldValue === undefined || fieldValue === '';
      case ConditionOperator.IS_NOT_EMPTY: return fieldValue !== null && fieldValue !== undefined && fieldValue !== '';
      default: return false;
    }
  }

  private resolveFieldValue(field: string, data: Record<string, any>): any {
    return field.split('.').reduce((obj, key) => obj?.[key], data);
  }

  getOperatorsForFieldType(fieldType: FieldType): ConditionOperator[] {
    const map: Record<FieldType, ConditionOperator[]> = {
      [FieldType.TEXT]: [ConditionOperator.EQ, ConditionOperator.NE, ConditionOperator.CONTAINS, ConditionOperator.IS_EMPTY, ConditionOperator.IS_NOT_EMPTY],
      [FieldType.NUMBER]: [ConditionOperator.EQ, ConditionOperator.NE, ConditionOperator.GT, ConditionOperator.GTE, ConditionOperator.LT, ConditionOperator.LTE, ConditionOperator.BETWEEN, ConditionOperator.IS_EMPTY],
      [FieldType.DATE]: [ConditionOperator.EQ, ConditionOperator.NE, ConditionOperator.GT, ConditionOperator.LT, ConditionOperator.IS_EMPTY],
      [FieldType.YES_NO]: [ConditionOperator.EQ, ConditionOperator.NE],
      [FieldType.DROPDOWN]: [ConditionOperator.EQ, ConditionOperator.NE, ConditionOperator.IS_EMPTY],
      [FieldType.MULTISELECT]: [ConditionOperator.CONTAINS, ConditionOperator.IS_EMPTY],
    };
    return map[fieldType] || [];
  }
}
```

**Unit Tests to create:** `backend/src/workflows/condition-evaluator.service.spec.ts`
```typescript
import { ConditionEvaluatorService } from './condition-evaluator.service';
import { ConditionConfig, ConditionOperator, FieldType } from './interfaces/condition-config.interface';

describe('ConditionEvaluatorService', () => {
  let service: ConditionEvaluatorService;

  beforeEach(() => { service = new ConditionEvaluatorService(); });

  describe('evaluate', () => {
    it('should return true when number GT condition is met', () => {
      const config: ConditionConfig = {
        rootGroup: {
          id: 'g1', combinator: 'AND', rules: [{
            id: 'r1', field: 'formData.amount', fieldType: FieldType.NUMBER,
            fieldLabel: 'Amount', operator: ConditionOperator.GT, value: 1000
          }]
        }
      };
      expect(service.evaluate(config, { formData: { amount: 1500 } })).toBe(true);
      expect(service.evaluate(config, { formData: { amount: 500 } })).toBe(false);
    });

    it('should return true when dropdown EQ condition is met', () => {
      const config: ConditionConfig = {
        rootGroup: {
          id: 'g1', combinator: 'AND', rules: [{
            id: 'r1', field: 'formData.department', fieldType: FieldType.DROPDOWN,
            fieldLabel: 'Department', operator: ConditionOperator.EQ, value: 'IT'
          }]
        }
      };
      expect(service.evaluate(config, { formData: { department: 'IT' } })).toBe(true);
      expect(service.evaluate(config, { formData: { department: 'HR' } })).toBe(false);
    });

    it('should evaluate AND combinator correctly', () => {
      const config: ConditionConfig = {
        rootGroup: {
          id: 'g1', combinator: 'AND', rules: [
            { id: 'r1', field: 'formData.amount', fieldType: FieldType.NUMBER, fieldLabel: 'Amount', operator: ConditionOperator.GT, value: 1000 },
            { id: 'r2', field: 'formData.department', fieldType: FieldType.DROPDOWN, fieldLabel: 'Department', operator: ConditionOperator.EQ, value: 'IT' }
          ]
        }
      };
      expect(service.evaluate(config, { formData: { amount: 1500, department: 'IT' } })).toBe(true);
      expect(service.evaluate(config, { formData: { amount: 1500, department: 'HR' } })).toBe(false);
      expect(service.evaluate(config, { formData: { amount: 500, department: 'IT' } })).toBe(false);
    });

    it('should evaluate OR combinator correctly', () => {
      const config: ConditionConfig = {
        rootGroup: {
          id: 'g1', combinator: 'OR', rules: [
            { id: 'r1', field: 'formData.amount', fieldType: FieldType.NUMBER, fieldLabel: 'Amount', operator: ConditionOperator.GT, value: 10000 },
            { id: 'r2', field: 'formData.urgent', fieldType: FieldType.YES_NO, fieldLabel: 'Urgent', operator: ConditionOperator.EQ, value: true }
          ]
        }
      };
      expect(service.evaluate(config, { formData: { amount: 500, urgent: true } })).toBe(true);  // urgent only
      expect(service.evaluate(config, { formData: { amount: 500, urgent: false } })).toBe(false); // neither
      expect(service.evaluate(config, { formData: { amount: 15000, urgent: false } })).toBe(true); // amount only
    });

    it('should handle BETWEEN operator', () => {
      const config: ConditionConfig = {
        rootGroup: {
          id: 'g1', combinator: 'AND', rules: [{
            id: 'r1', field: 'formData.amount', fieldType: FieldType.NUMBER,
            fieldLabel: 'Amount', operator: ConditionOperator.BETWEEN, value: 1000, valueEnd: 5000
          }]
        }
      };
      expect(service.evaluate(config, { formData: { amount: 3000 } })).toBe(true);
      expect(service.evaluate(config, { formData: { amount: 500 } })).toBe(false);
      expect(service.evaluate(config, { formData: { amount: 6000 } })).toBe(false);
    });

    it('should handle IS_EMPTY operator', () => {
      const config: ConditionConfig = {
        rootGroup: {
          id: 'g1', combinator: 'AND', rules: [{
            id: 'r1', field: 'formData.notes', fieldType: FieldType.TEXT,
            fieldLabel: 'Notes', operator: ConditionOperator.IS_EMPTY
          }]
        }
      };
      expect(service.evaluate(config, { formData: { notes: '' } })).toBe(true);
      expect(service.evaluate(config, { formData: { notes: null } })).toBe(true);
      expect(service.evaluate(config, { formData: { notes: 'some text' } })).toBe(false);
    });

    it('should resolve nested field paths', () => {
      const config: ConditionConfig = {
        rootGroup: {
          id: 'g1', combinator: 'AND', rules: [{
            id: 'r1', field: 'workflowData.priority', fieldType: FieldType.NUMBER,
            fieldLabel: 'Priority', operator: ConditionOperator.GT, value: 5
          }]
        }
      };
      expect(service.evaluate(config, { workflowData: { priority: 10 } })).toBe(true);
      expect(service.evaluate(config, { workflowData: { priority: 3 } })).toBe(false);
    });
  });
});
```

**Run tests:**
```bash
cd backend && npx jest condition-evaluator.service.spec.ts --passWithNoTests
```

---

### 1.3 Create ConditionBuilderComponent (Frontend)

**File to create:** `frontend/src/app/shared/components/condition-builder/condition-builder.component.ts`

This component replaces the raw JS expression inputs in the workflow designer's condition node properties panel.

**Architecture:**
- Standalone Angular component with `@Input() config` and `@Output() configChange`
- Receives `availableFields` input (populated from the workflow's bound form definition)
- Emits `save` event with the structured `ConditionConfig` object

**Key UI elements:**
1. Combinator toggle (AND/OR) at top
2. Rule cards with: field picker → operator picker → value input (type-appropriate)
3. Add Rule / Add Group buttons
4. Human-readable preview at bottom
5. Save/Cancel footer

**Test scenarios:**
- Adding a rule shows field picker pre-populated with form fields
- Changing field type filters operator dropdown appropriately
- BETWEEN operator shows two value inputs
- IS_EMPTY operator hides value input
- Preview shows "Amount is greater than 1000 AND Department equals IT"
- Empty config produces "(no conditions)"

---

### 1.4 Wire ConditionBuilderComponent into WorkflowDesignerComponent

**File to modify:** `frontend/src/app/features/workflow-designer/workflow-designer.component.ts`

**Changes:**
1. Import `ConditionBuilderComponent`
2. Replace the raw text/select inputs for condition node config (lines ~229-276) with `<app-condition-builder>` component
3. Pass `availableFields` derived from the workflow's form definition
4. Handle `save` event to persist `ConditionConfig` to `selectedNode().data`

**Integration test:**
```typescript
// When user selects a condition node, the properties panel shows the condition builder
// When user adds a rule and saves, the node's data.conditionConfig is updated
// When workflow is saved and reloaded, the condition builder pre-populates with existing config
```

---

### 1.5 Update WorkflowEngineService to Use ConditionEvaluatorService

**File to modify:** `backend/src/workflows/workflow-engine.service.ts`

**Change:** In `processConditionNode()`, replace raw JS evaluation:
```typescript
// BEFORE (remove):
const result = new Function('formData', `return ${node.config.expression}`)(instance.data);

// AFTER:
const evaluator = new ConditionEvaluatorService();
const result = evaluator.evaluate(node.config.conditionConfig, instance.data);
```

**Unit test to add:**
```typescript
it('should evaluate conditionConfig in condition node', async () => {
  const node = createConditionNode({ conditionConfig: { rootGroup: { id: 'g1', combinator: 'AND', rules: [...] } } });
  const instance = createInstance({ formData: { amount: 1500 } });
  const result = await workflowEngine.processConditionNode(node, instance);
  expect(result.status).toBe('completed');
});
```

---

## Part 2: Workflow Validator + Deadlock Detection (P0)

### 2.1 Create WorkflowValidatorService (Backend)

**File to create:** `backend/src/workflows/validators/workflow-validator.service.ts`

```typescript
import { Injectable } from '@nestjs/common';
import { WorkflowDefinition } from '../interfaces/workflow-definition.interface';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

@Injectable()
export class WorkflowValidatorService {

  validate(definition: WorkflowDefinition): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Rule 1: Exactly one Start node
    const startNodes = definition.nodes.filter(n => n.type === 'start');
    if (startNodes.length === 0) errors.push('Workflow must have exactly one Start node');
    if (startNodes.length > 1) errors.push('Workflow must have multiple Start nodes (found ' + startNodes.length + ')');

    // Rule 2: At least one End node
    const endNodes = definition.nodes.filter(n => n.type === 'end');
    if (endNodes.length === 0) errors.push('Workflow must have at least one End node');

    // Rule 3: Every non-End node has outgoing connections
    for (const node of definition.nodes) {
      if (node.type === 'end') continue;
      const outgoing = definition.connections.filter(c => c.sourceNodeId === node.id);
      if (outgoing.length === 0) {
        errors.push(`Node "${node.label}" has no outgoing connections`);
      }
    }

    // Rule 4: Parallel/Join structural validation
    const parallelNodes = definition.nodes.filter(n => n.type === 'parallel');
    const joinNodes = definition.nodes.filter(n => n.type === 'join');

    for (const parallel of parallelNodes) {
      const downstreamJoins = this.findDownstream(parallel.id, 'join', definition);
      if (downstreamJoins.length === 0) {
        errors.push(`Parallel node "${parallel.label}" has no downstream Join — will deadlock`);
      }
    }

    for (const join of joinNodes) {
      const upstreamParallels = this.findUpstream(join.id, 'parallel', definition);
      if (upstreamParallels.length === 0) {
        errors.push(`Join node "${join.label}" has no upstream Parallel`);
      }
    }

    // Rule 5: No orphan nodes
    const reachable = this.computeReachable(definition);
    for (const node of definition.nodes) {
      if (!reachable.has(node.id) && node.type !== 'start') {
        errors.push(`Node "${node.label}" is unreachable from Start`);
      }
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  private findDownstream(nodeId: string, targetType: string, def: WorkflowDefinition): any[] {
    const visited = new Set<string>();
    const result: any[] = [];
    const queue = [nodeId];
    while (queue.length) {
      const current = queue.shift()!;
      if (visited.has(current)) continue;
      visited.add(current);
      for (const conn of def.connections.filter(c => c.sourceNodeId === current)) {
        const target = def.nodes.find(n => n.id === conn.targetNodeId);
        if (target?.type === targetType) result.push(target);
        else if (target) queue.push(target.id);
      }
    }
    return result;
  }

  private findUpstream(nodeId: string, targetType: string, def: WorkflowDefinition): any[] {
    const visited = new Set<string>();
    const result: any[] = [];
    const queue = [nodeId];
    while (queue.length) {
      const current = queue.shift()!;
      if (visited.has(current)) continue;
      visited.add(current);
      for (const conn of def.connections.filter(c => c.targetNodeId === current)) {
        const source = def.nodes.find(n => n.id === conn.sourceNodeId);
        if (source?.type === targetType) result.push(source);
        else if (source) queue.push(source.id);
      }
    }
    return result;
  }

  private computeReachable(def: WorkflowDefinition): Set<string> {
    const reachable = new Set<string>();
    const queue = def.nodes.filter(n => n.type === 'start').map(n => n.id);
    while (queue.length) {
      const current = queue.shift()!;
      if (reachable.has(current)) continue;
      reachable.add(current);
      def.connections.filter(c => c.sourceNodeId === current).forEach(c => {
        if (!reachable.has(c.targetNodeId)) queue.push(c.targetNodeId);
      });
    }
    return reachable;
  }
}
```

**Unit Tests to create:** `backend/src/workflows/validators/workflow-validator.service.spec.ts`

```typescript
import { WorkflowValidatorService } from './workflow-validator.service';
import { WorkflowDefinition } from '../interfaces/workflow-definition.interface';

describe('WorkflowValidatorService', () => {
  let service: WorkflowValidatorService;

  beforeEach(() => { service = new WorkflowValidatorService(); });

  function makeDef(nodes: any[], connections: any[]): WorkflowDefinition {
    return { id: 'test', name: 'Test', nodes, connections, version: 1, createdAt: new Date(), updatedAt: new Date() };
  }

  it('should return valid for a simple linear workflow', () => {
    const def = makeDef(
      [
        { id: 'n1', type: 'start', label: 'Start', position: { x: 0, y: 0 } },
        { id: 'n2', type: 'end', label: 'End', position: { x: 100, y: 0 } },
      ],
      [{ id: 'c1', sourceNodeId: 'n1', targetNodeId: 'n2' }]
    );
    const result = service.validate(def);
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('should fail when no Start node', () => {
    const def = makeDef([{ id: 'n1', type: 'end', label: 'End', position: { x: 0, y: 0 } }], []);
    const result = service.validate(def);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Workflow must have exactly one Start node');
  });

  it('should fail when no End node', () => {
    const def = makeDef([{ id: 'n1', type: 'start', label: 'Start', position: { x: 0, y: 0 } }], []);
    const result = service.validate(def);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Workflow must have at least one End node');
  });

  it('should fail when parallel has no downstream Join', () => {
    const def = makeDef(
      [
        { id: 'n1', type: 'start', label: 'Start', position: { x: 0, y: 0 } },
        { id: 'n2', type: 'parallel', label: 'Split', position: { x: 100, y: 0 } },
        { id: 'n3', type: 'end', label: 'End', position: { x: 200, y: 0 } },
      ],
      [
        { id: 'c1', sourceNodeId: 'n1', targetNodeId: 'n2' },
        { id: 'c2', sourceNodeId: 'n2', targetNodeId: 'n3' },  // no Join between parallel and end
      ]
    );
    const result = service.validate(def);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('no downstream Join'))).toBe(true);
  });

  it('should fail when node has no outgoing connections', () => {
    const def = makeDef(
      [
        { id: 'n1', type: 'start', label: 'Start', position: { x: 0, y: 0 } },
        { id: 'n2', type: 'task', label: 'Task', position: { x: 100, y: 0 } },
        { id: 'n3', type: 'end', label: 'End', position: { x: 200, y: 0 } },
      ],
      [{ id: 'c1', sourceNodeId: 'n1', targetNodeId: 'n3' }]  // n2 is orphaned
    );
    const result = service.validate(def);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('unreachable'))).toBe(true);
  });
});
```

---

### 2.2 Add Validation Endpoint to WorkflowsController

**File to modify:** `backend/src/workflows/controllers/workflows.controller.ts`

**Add endpoint:**
```typescript
@Post(':id/validate')
async validateWorkflow(@Param('id') id: string): Promise<ValidationResult> {
  const workflow = await this.workflowsService.findById(id);
  if (!workflow) throw new Error('Workflow not found');
  const validator = new WorkflowValidatorService();
  return validator.validate(workflow.definition);
}
```

**Integration test:** `POST /api/workflows/:id/validate` returns `{ valid: boolean, errors: string[], warnings: string[] }`

---

### 2.3 Wire Validation into WorkflowDesignerComponent (Frontend)

**File to modify:** `frontend/src/app/features/workflow-designer/workflow-designer.component.ts`

**Add to save workflow handler:**
```typescript
async saveWorkflow() {
  // 1. Validate before save
  const validation = await this.workflowService.validateWorkflow(this.currentWorkflowId);
  if (!validation.valid) {
    this.toastService.show('error', 'Workflow validation failed:\n' + validation.errors.join('\n'));
    return;
  }
  // 2. Proceed with save
  await this.workflowService.saveWorkflow(...);
  this.toastService.show('success', 'Workflow saved successfully');
}
```

**Inline validation warnings:** When a node has validation issues (e.g., parallel with no join), show a red warning icon on the node in the canvas. On hover, show the error message.

**Test scenarios:**
1. Create a workflow with parallel node and no join → save fails with clear error message
2. Create a valid parallel/join workflow → saves successfully
3. Orphan a node (no incoming/outgoing connections) → save fails

---

## Part 3: Workflow Simulation (P1)

### 3.1 Create SimulationEngineService

**File to create:** `backend/src/workflows/simulation-engine.service.ts`

**Core behavior:**
- Takes a workflow definition + initial data
- Executes nodes sequentially, recording each step
- Returns a trace of all steps with decision outcomes
- Does NOT persist anything or send notifications

**Key simulation steps:**
1. Start node → find first node
2. Form/Task/Approval nodes → auto-advance with current data (simulate user input)
3. Condition nodes → evaluate using `ConditionEvaluatorService`, record which branch was taken
4. Parallel nodes → record branch spawn (simulate sequentially for MVP)
5. Join nodes → record branch join
6. End node → simulation complete

**Test scenarios:**
1. Simple linear workflow → completed in N steps
2. Condition taking true branch → step shows `decision: { result: true }`
3. Condition taking false branch → step shows `decision: { result: false }`
4. Workflow with unreachable node → validation error returned
5. Deadlock-prone workflow → detected and reported in errors

---

### 3.2 Add Simulate Endpoint

**File to modify:** `backend/src/workflows/controllers/workflows.controller.ts`

```typescript
@Post(':id/simulate')
async simulateWorkflow(
  @Param('id') id: string,
  @Body() body: { initialData: Record<string, any> }
): Promise<SimulationResult> {
  const workflow = await this.workflowsService.findPublishedVersion(id);
  if (!workflow) throw new Error('Workflow not found');
  const engine = new SimulationEngineService(new ConditionEvaluatorService());
  return engine.simulate(workflow.definition, body.initialData);
}
```

---

### 3.3 Create SimulationPanelComponent (Frontend)

**File to create:** `frontend/src/app/features/workflow-designer/components/simulation-panel/simulation-panel.component.ts`

**UI:**
- Slide-out panel (right side, 480px wide)
- Form with sample data fields (pre-populated from form definition)
- "Run Simulation" button
- Execution trace timeline showing each step
- Final state preview
- Errors/warnings section

**Test scenarios:**
1. Run simulation on valid workflow → shows step-by-step trace
2. Run simulation on workflow with condition → shows which branch was taken
3. Run simulation with insufficient data → shows helpful error
4. Re-run simulation → clears previous trace

---

## Part 4: Parallel/Join Branch Visualization (P1)

### 4.1 Add Branch Coloring to Node Rendering

**File to modify:** `frontend/src/app/features/workflow-designer/workflow-designer.component.ts`

**Changes in node rendering loop:**
```typescript
// Assign colors to parallel branch nodes
const branchColors = this.deadlockDetectionService.assignBranchColors(this.buildGraph());

// In the node template, apply background color:
node.style.backgroundColor = branchColors.get(node.id) || '#ffffff';
```

**Branch color palette:** `['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD']`

---

### 4.2 Show Parallel Branches Visually

**Enhancement to parallel node rendering:**
- Draw multiple output handles (one per branch)
- Add label showing number of branches (e.g., "∥ 3 branches")
- Draw dashed "swim lane" backgrounds grouping branch nodes

**Join node enhancement:**
- Show multiple input handles
- Label showing "⊥ waiting for N branches"

---

### 4.3 Inline Validation Warnings on Canvas

**Add warning indicator to nodes:**
- Red dot on nodes with validation errors
- Yellow dot on nodes with warnings
- Tooltip on hover showing the issue

**Test scenario:**
1. Create parallel without join → parallel node shows red warning dot
2. Hover over dot → shows "No downstream Join node. This will cause a deadlock."

---

## Part 5: Sub-Workflow Data Mapper (P2)

### 5.1 Create SubWorkflowMapperComponent

**File to create:** `frontend/src/app/shared/components/sub-workflow-mapper/sub-workflow-mapper.component.ts`

**UI:**
- Mode selector: Inherit All / Extract Selected / Transform
- Field mapping table with source → target columns
- Compatibility indicators (type match/mismatch)
- Quick templates: "Pass All", "Pass Result Only"

**Test scenarios:**
1. Switch to Extract mode → mapping table appears
2. Add mapping row → source and target dropdowns populated
3. Auto-map button → matches fields by name
4. Incompatible types → show warning indicator

---

## Execution Order

```
Phase 1 (Foundation):
1. Create ConditionConfig interface          [backend, ~30min]
2. Create ConditionEvaluatorService           [backend, ~1hr]
3. Write ConditionEvaluatorService tests      [backend, ~1hr]
4. Wire evaluator into WorkflowEngineService  [backend, ~30min]
5. Create ConditionBuilderComponent           [frontend, ~2hr]
6. Wire into workflow designer                [frontend, ~1hr]

Phase 2 (Validation):
7. Create WorkflowValidatorService            [backend, ~1hr]
8. Write validator tests                       [backend, ~1hr]
9. Add /validate endpoint                      [backend, ~30min]
10. Wire validation into frontend save flow   [frontend, ~1hr]
11. Add inline node warnings                   [frontend, ~1hr]

Phase 3 (Simulation):
12. Create SimulationEngineService            [backend, ~2hr]
13. Add /simulate endpoint                     [backend, ~30min]
14. Create SimulationPanelComponent            [frontend, ~2hr]

Phase 4 (Visual Polish):
15. Branch coloring in canvas                  [frontend, ~1hr]
16. Parallel/Join handle visualization          [frontend, ~1hr]
17. Create SubWorkflowMapperComponent           [frontend, ~2hr]
```

---

## Success Criteria

Each part is complete when:

| Part | Definition of Done |
|------|-------------------|
| Condition Builder | Non-technical user can build a condition without typing code; condition persists across save/reload |
| Validator | Invalid workflow (deadlock, orphan) is blocked from saving with clear error message |
| Simulation | User can run simulation and see step-by-step trace including which condition branches were taken |
| Branch Viz | Parallel branches are visually distinguishable on canvas by color |
| Sub-workflow Mapper | User can configure data pass-through without editing JSON |

---

## Risk Factors

| Risk | Mitigation |
|------|-----------|
| Angular component integration is complex | Test condition builder in isolation first |
| Simulation sequential vs parallel semantics | Document as MVP limitation; full parallel simulation is Phase 2 |
| Existing workflows have raw JS expressions | Add migration path: detect old format, offer one-click upgrade |
| Backend test DB dependencies | Use mocks for PrismaService in unit tests |
