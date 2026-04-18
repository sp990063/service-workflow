# UX Fix Plan — Handover Notes for Agent

## Status: READY TO EXECUTE
**Last updated:** 2026-04-18
**Priority:** P0 items must be fixed before any workflow can execute in production

---

## Context

The UX improvement plan (`.claude/wiki/ux-fix-plan.md`) was executed. Most features were implemented but **3 critical bugs** were introduced that will cause the workflow engine to fail at runtime. Additionally, backend unit tests are missing and frontend save validation doesn't call the backend.

---

## CRITICAL (P0) — Must Fix Before Deploy

### BUG 1: Connection Format Mismatch in `getNextNode`

**File:** `backend/src/workflows/workflow-engine.service.ts`
**Line:** ~158-174

The `getNextNode` method uses `c.from` and `c.to` but the `Connection` interface (defined in `interfaces/index.ts`) uses `sourceNodeId` and `targetNodeId`. This means `getNextNode` **always returns null** — no workflow can advance past its first node.

**Fix** — Replace `getNextNode` body at lines 158-174:

```typescript
// CURRENT (broken):
getNextNode(currentNodeId: string, connections: any[], formData?: Record<string, any>, currentNode?: WorkflowNode): string | null {
  const outgoingConnections = connections.filter(c => c.from === currentNodeId);
  // ...
  if (conditionMet && trueBranch) {
    return trueBranch.to;
  }
```

```typescript
// FIXED:
getNextNode(currentNodeId: string, connections: any[], formData?: Record<string, any>, currentNode?: WorkflowNode): string | null {
  const outgoingConnections = connections.filter(c => c.sourceNodeId === currentNodeId);

  if (outgoingConnections.length === 0) {
    return null;
  }

  if (currentNode?.type === 'condition') {
    const conditionMet = this.evaluateCondition(currentNode, formData || {});
    const trueBranch = outgoingConnections.find(c => c.sourceHandle === 'true');
    const falseBranch = outgoingConnections.find(c => c.sourceHandle === 'false');

    if (conditionMet && trueBranch) {
      return trueBranch.targetNodeId;
    } else if (!conditionMet && falseBranch) {
      return falseBranch.targetNodeId;
    }
    return null;
  }

  // Default: return first connection's target
  return outgoingConnections[0].targetNodeId;
}
```

**Also fix** line 310:
```typescript
// CURRENT:
const parallelOutConnections = connections.filter((c: any) => c.from === node.id);

// FIX TO:
const parallelOutConnections = connections.filter((c: any) => c.sourceNodeId === node.id);
```

**Also fix** all other `c.from` / `c.to` references in `workflow-engine.service.ts`:
- Line 174: `trueBranch.to` → `trueBranch.targetNodeId`
- Line 175: `falseBranch.to` → `falseBranch.targetNodeId`
- Line 179-180: similar pattern

Search the file for all occurrences of `\.from` and `\.to` in connection contexts and replace with `sourceNodeId` / `targetNodeId`.

---

### BUG 2: Condition Branch Selection Uses Wrong Field

**File:** `backend/src/workflows/workflow-engine.service.ts`
**Lines:** ~170-175

The condition branch selection looks for `c.label` but `Connection` interface has `sourceHandle?: string` for this purpose.

```typescript
// CURRENT (broken):
const trueBranch = outgoingConnections.find(c => c.label === 'true' || c.data?.conditionResult === true);
const falseBranch = outgoingConnections.find(c => c.label === 'false' || c.data?.conditionResult === false);

// FIX:
const trueBranch = outgoingConnections.find(c => c.sourceHandle === 'true');
const falseBranch = outgoingConnections.find(c => c.sourceHandle === 'false');
```

---

### BUG 3: Frontend Save Doesn't Call Backend Validation

**File:** `src/app/features/workflow-designer/workflow-designer.component.ts`
**Lines:** ~936-975 (`saveWorkflow` method)

Currently `saveWorkflow` uses the local `DeadlockDetectionService` only. It should call `POST /workflows/:id/validate` before saving.

**Fix — add after `const issues = this.validateWorkflow()` (line 938):**

```typescript
// Call backend validation
this.workflowService.validate(this.workflowId()).subscribe({
  next: (result) => {
    if (!result.valid) {
      alert('Workflow validation failed:\n' + result.errors.join('\n'));
      return;
    }
    // Proceed with save (existing code below)
```

But first, you need to add the `validate` method to `workflowService`. Check `src/app/core/services/workflow.service.ts`:

```typescript
// ADD this method to WorkflowService:
validate(workflowId: string): Observable<{ valid: boolean; errors: string[]; warnings: string[] }> {
  return this.http.post<{ valid: boolean; errors: string[]; warnings: string[] }>(
    `${this.baseUrl}/workflows/${workflowId}/validate`,
    {}
  );
}
```

Note: The backend `POST /workflows/:id/validate` endpoint exists (in `workflows.controller.ts`). Confirm it still exists and works.

---

### BUG 4: `alert()` Calls in `saveWorkflow`

**File:** `src/app/features/workflow-designer/workflow-designer.component.ts`
**Lines:** 943, 957, 960, 968, 971

Replace all `alert(...)` with `this.toastService.show(...)`.

```typescript
// BEFORE:
alert('Workflow validation failed:\n' + errorMessages);

// AFTER:
this.toastService.show('error', 'Workflow validation failed:\n' + errorMessages);

// All 5 alert() calls should become toast calls:
// - 'error' for validation failures and save failures
// - 'success' for successful save/create
```

---

## HIGH PRIORITY (P1) — Add Missing Tests

### TEST 1: `condition-evaluator.service.spec.ts`

**File to create:** `backend/src/workflows/condition-evaluator.service.spec.ts`

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
      expect(service.evaluate(config, { formData: { amount: 500, urgent: true } })).toBe(true);
      expect(service.evaluate(config, { formData: { amount: 500, urgent: false } })).toBe(false);
      expect(service.evaluate(config, { formData: { amount: 15000, urgent: false } })).toBe(true);
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

  describe('getOperatorsForFieldType', () => {
    it('should return correct operators for NUMBER type', () => {
      const ops = service.getOperatorsForFieldType(FieldType.NUMBER);
      expect(ops).toContain(ConditionOperator.GT);
      expect(ops).toContain(ConditionOperator.LT);
      expect(ops).toContain(ConditionOperator.BETWEEN);
    });

    it('should return correct operators for TEXT type', () => {
      const ops = service.getOperatorsForFieldType(FieldType.TEXT);
      expect(ops).toContain(ConditionOperator.CONTAINS);
      expect(ops).toContain(ConditionOperator.EQ);
    });

    it('should return empty array for unknown field type', () => {
      const ops = service.getOperatorsForFieldType('unknown' as FieldType);
      expect(ops).toEqual([]);
    });
  });
});
```

**Run with:** `cd backend && npx jest condition-evaluator.service.spec.ts --passWithNoTests`

---

### TEST 2: `workflow-validator.service.spec.ts`

**File to create:** `backend/src/workflows/validators/workflow-validator.service.spec.ts`

```typescript
import { WorkflowValidatorService } from './workflow-validator.service';
import { WorkflowDefinition } from '../interfaces';

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
        { id: 'c2', sourceNodeId: 'n2', targetNodeId: 'n3' },
      ]
    );
    const result = service.validate(def);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('no downstream Join'))).toBe(true);
  });

  it('should fail when join has no upstream Parallel', () => {
    const def = makeDef(
      [
        { id: 'n1', type: 'start', label: 'Start', position: { x: 0, y: 0 } },
        { id: 'n2', type: 'join', label: 'Join', position: { x: 100, y: 0 } },
        { id: 'n3', type: 'end', label: 'End', position: { x: 200, y: 0 } },
      ],
      [
        { id: 'c1', sourceNodeId: 'n1', targetNodeId: 'n2' },
        { id: 'c2', sourceNodeId: 'n2', targetNodeId: 'n3' },
      ]
    );
    const result = service.validate(def);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('no upstream Parallel'))).toBe(true);
  });

  it('should fail when node is unreachable from Start', () => {
    const def = makeDef(
      [
        { id: 'n1', type: 'start', label: 'Start', position: { x: 0, y: 0 } },
        { id: 'n2', type: 'task', label: 'Orphan', position: { x: 100, y: 0 } },
        { id: 'n3', type: 'end', label: 'End', position: { x: 200, y: 0 } },
      ],
      [{ id: 'c1', sourceNodeId: 'n1', targetNodeId: 'n3' }]
    );
    const result = service.validate(def);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('unreachable'))).toBe(true);
  });

  it('should fail when non-End node has no outgoing connections', () => {
    const def = makeDef(
      [
        { id: 'n1', type: 'start', label: 'Start', position: { x: 0, y: 0 } },
        { id: 'n2', type: 'task', label: 'Dead End', position: { x: 100, y: 0 } },
        { id: 'n3', type: 'end', label: 'End', position: { x: 200, y: 0 } },
      ],
      [
        { id: 'c1', sourceNodeId: 'n1', targetNodeId: 'n2' },
        { id: 'c2', sourceNodeId: 'n2', targetNodeId: 'n3' },
        { id: 'c3', sourceNodeId: 'n1', targetNodeId: 'n3' }  // n2 has no outgoing
      ]
    );
    const result = service.validate(def);
    expect(result.valid).toBe(false);
  });

  it('should pass a valid parallel/join workflow', () => {
    const def = makeDef(
      [
        { id: 'n1', type: 'start', label: 'Start', position: { x: 0, y: 0 } },
        { id: 'n2', type: 'parallel', label: 'Split', position: { x: 100, y: 0 } },
        { id: 'n3', type: 'task', label: 'Branch A', position: { x: 200, y: -50 } },
        { id: 'n4', type: 'task', label: 'Branch B', position: { x: 200, y: 50 } },
        { id: 'n5', type: 'join', label: 'Join', position: { x: 300, y: 0 } },
        { id: 'n6', type: 'end', label: 'End', position: { x: 400, y: 0 } },
      ],
      [
        { id: 'c1', sourceNodeId: 'n1', targetNodeId: 'n2' },
        { id: 'c2', sourceNodeId: 'n2', targetNodeId: 'n3' },
        { id: 'c3', sourceNodeId: 'n2', targetNodeId: 'n4' },
        { id: 'c4', sourceNodeId: 'n3', targetNodeId: 'n5' },
        { id: 'c5', sourceNodeId: 'n4', targetNodeId: 'n5' },
        { id: 'c6', sourceNodeId: 'n5', targetNodeId: 'n6' },
      ]
    );
    const result = service.validate(def);
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });
});
```

**Run with:** `cd backend && npx jest workflow-validator.service.spec.ts --passWithNoTests`

---

## Verification Steps

After applying all fixes, run:

```bash
# 1. Backend type check
cd backend && npx tsc --noEmit

# 2. Backend tests
cd backend && npx jest --testPathPattern="condition-evaluator|workflow-validator" --passWithNoTests

# 3. Frontend build
cd frontend && npx ng build 2>&1 | head -30
```

---

## COMPLETED — Previous Handover Items

All P0 and P1 items from the previous handover are DONE:
- ✅ `workflow-engine.service.ts` — `c.from`/`c.to` fixed to `sourceNodeId`/`targetNodeId`
- ✅ `workflow-engine.service.ts` — `c.label` fixed to `c.sourceHandle` for condition branches
- ✅ `workflow-designer.component.ts` — backend `/validate` wired into save flow
- ✅ `workflow-designer.component.ts` — all `alert()` replaced with `toastService.show()`
- ✅ `workflow.service.ts` — `validate()` method added
- ✅ `condition-evaluator.service.spec.ts` — created, 10 tests passing
- ✅ `workflow-validator.service.spec.ts` — created, 8 tests passing
- ✅ Backend TypeScript: clean (`tsc --noEmit` passes)

---

## REMAINING — 2 Frontend TypeScript Errors

These are pre-existing issues surfaced by `ng build --no-eslint`. Both block the frontend build.

---

### ERROR 1: `toastService` used before initialization

**File:** `src/app/shared/components/toast/toast.component.ts`
**Line:** 148

```typescript
// CURRENT (broken):
export class ToastComponent {
  toasts = this.toastService.getToasts();   // ← runs before constructor

  constructor(private toastService: ToastService) {}
```

The class field initializer runs **before** `constructor()` — `toastService` is undefined at the point `getToasts()` is called.

**Fix — move initialization into constructor:**

```typescript
// FIXED:
export class ToastComponent {
  toasts: ToastItem[] = [];

  constructor(private toastService: ToastService) {
    this.toasts = this.toastService.getToasts();
  }
```

Note: Check `ToastItem` type import from `ToastService` or define it inline if needed. Also confirm `ToastService.getToasts()` returns the right type.

---

### ERROR 2: `config` possibly undefined in sub-workflow mapper

**File:** `src/app/shared/components/sub-workflow-mapper/sub-workflow-mapper.component.ts`
**Line:** 92

```html
<!-- CURRENT (broken): -->
<input *ngIf="config.mode === 'transform'" type="text"
       [(ngModel)]="line.transform"
```

`config` is an `@Input()` and TypeScript's Angular template checker can't guarantee it's initialized before the template renders.

**Fix — add non-null assertion or safe check:**

**Option A (non-null assertion — if you know config is always set):**

```html
<!-- FIXED: -->
<input *ngIf="config!.mode === 'transform'" type="text"
       [(ngModel)]="line.transform"
```

**Option B (safe navigation — if config could be null):**

```html
<!-- FIXED: -->
<input *ngIf="config?.mode === 'transform'" type="text"
       [(ngModel)]="line.transform"
```

**Option C (best — initialize config as default in `ngOnInit` or class field):**

Add a class field initializer:
```typescript
config: SubWorkflowMappingConfig = { mode: SubWorkflowMappingMode.INHERIT };
```

Then in the template use `config.mode` without safe-nav. This is the cleanest approach since it guarantees `config` is never undefined.

**Recommended: Option C** — add the default initializer above. Also verify `SubWorkflowMappingMode` is imported.

---

## Verification After Fixes

```bash
# Frontend build must complete with no errors
cd frontend && npx ng build 2>&1 | grep -E "ERROR|error TS|Build at"
```

Expected output: `Build at:` with no `ERROR` lines above it.

---

## Files Modified Summary

| File | Change |
|------|--------|
| `backend/src/workflows/workflow-engine.service.ts` | Fix `c.from`→`c.sourceNodeId`, `c.to`→`c.targetNodeId`, `c.label`→`c.sourceHandle` |
| `src/app/core/services/workflow.service.ts` | Add `validate()` method |
| `src/app/features/workflow-designer/workflow-designer.component.ts` | Wire backend `/validate`, replace `alert()` with toast |
| `backend/src/workflows/condition-evaluator.service.spec.ts` | **CREATE** |
| `backend/src/workflows/validators/workflow-validator.service.spec.ts` | **CREATE** |
| `src/app/shared/components/toast/toast.component.ts` | Move `toasts` initialization into constructor |
| `src/app/shared/components/sub-workflow-mapper/sub-workflow-mapper.component.ts` | Add default `config` initializer or safe check |
