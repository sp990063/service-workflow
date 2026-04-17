# ServiceFlow No-Code Usability Improvement Plan

## Status: Proposed
**Last updated:** 2026-04-18

---

## 1. Problem Statement

ServiceFlow's architecture supports no-code form and workflow creation, but several areas undermine that promise for non-technical users. This plan addresses the gaps between current implementation and a true no-code experience for business users.

---

## 2. Improvement Roadmap

### 2.1 Visual Condition Builder
**Priority:** High
**Current State:** Conditions use raw JavaScript expressions (`formData.amount > 1000`)
**Target State:** Point-and-click condition builder with dropdowns, operators, and values

#### 2.1.1 Data Model Changes

**New Schema — `ConditionConfig`:**
```typescript
// backend/src/workflows/interfaces/condition-config.interface.ts

export enum ConditionOperator {
  // Text operators
  EQ = 'eq',           // equals
  NE = 'ne',           // not equals
  CONTAINS = 'contains',
  STARTS_WITH = 'startsWith',
  ENDS_WITH = 'endsWith',
  IS_EMPTY = 'isEmpty',
  IS_NOT_EMPTY = 'isNotEmpty',

  // Number operators
  GT = 'gt',           // greater than
  GTE = 'gte',         // greater than or equal
  LT = 'lt',           // less than
  LTE = 'lte',         // less than or equal
  BETWEEN = 'between',

  // Date operators
  BEFORE = 'before',
  AFTER = 'after',
  WITHIN_LAST = 'withinLast',

  // Multi-select operators
  CONTAINS_ANY = 'containsAny',
  CONTAINS_ALL = 'containsAll',
}

export enum FieldType {
  TEXT = 'text',
  NUMBER = 'number',
  DATE = 'date',
  YES_NO = 'yesNo',
  DROPDOWN = 'dropdown',
  MULTISELECT = 'multiselect',
  CHECKBOX = 'checkbox',
}

export interface ConditionRule {
  id: string;                    // unique rule id, e.g. "rule_1"
  field: string;                 // e.g. "formData.amount" or "formData.department"
  fieldType: FieldType;          // used to filter available operators
  fieldLabel: string;            // human-readable label, e.g. "Amount"
  operator: ConditionOperator;
  value: any;                     // single value for simple operators
  valueEnd?: any;                // for BETWEEN operator (end range)
}

export interface ConditionGroup {
  id: string;                    // unique group id, e.g. "group_1"
  combinator: 'AND' | 'OR';
  rules: ConditionRule[];
  // Nested groups for complex logic: (A AND B) OR (C AND D)
  groups?: ConditionGroup[];
}

export interface ConditionConfig {
  // Top-level is always a group (simplifies the model)
  rootGroup: ConditionGroup;
}
```

**Example `ConditionConfig` JSON stored in `WorkflowNode.config`:**
```json
{
  "conditionConfig": {
    "rootGroup": {
      "id": "group_1",
      "combinator": "AND",
      "rules": [
        {
          "id": "rule_1",
          "field": "formData.amount",
          "fieldType": "number",
          "fieldLabel": "Amount",
          "operator": "gt",
          "value": 1000
        },
        {
          "id": "rule_2",
          "field": "formData.department",
          "fieldType": "dropdown",
          "fieldLabel": "Department",
          "operator": "eq",
          "value": "IT"
        }
      ]
    }
  }
}
```

**Complex nested example — `(Amount > 1000 AND Department = IT) OR (Priority = Urgent)`:**
```json
{
  "conditionConfig": {
    "rootGroup": {
      "id": "group_1",
      "combinator": "OR",
      "groups": [
        {
          "id": "group_2",
          "combinator": "AND",
          "rules": [
            { "id": "rule_1", "field": "formData.amount", "fieldType": "number", "fieldLabel": "Amount", "operator": "gt", "value": 1000 },
            { "id": "rule_2", "field": "formData.department", "fieldType": "dropdown", "fieldLabel": "Department", "operator": "eq", "value": "IT" }
          ]
        },
        {
          "id": "group_3",
          "combinator": "AND",
          "rules": [
            { "id": "rule_3", "field": "formData.priority", "fieldType": "dropdown", "fieldLabel": "Priority", "operator": "eq", "value": "Urgent" }
          ]
        }
      ],
      "rules": []
    }
  }
}
```

---

#### 2.1.2 Backend — ConditionEvaluatorService

```typescript
// backend/src/workflows/condition-evaluator.service.ts

import { Injectable } from '@nestjs/common';
import {
  ConditionConfig,
  ConditionGroup,
  ConditionRule,
  ConditionOperator,
  FieldType,
} from './interfaces/condition-config.interface';

@Injectable()
export class ConditionEvaluatorService {

  /**
   * Main entry point — evaluate a ConditionConfig against instance data
   */
  evaluate(config: ConditionConfig, instanceData: Record<string, any>): boolean {
    return this.evaluateGroup(config.rootGroup, instanceData);
  }

  /**
   * Recursively evaluate a group using its combinator (AND/OR)
   */
  private evaluateGroup(group: ConditionGroup, data: Record<string, any>): boolean {
    const ruleResults = group.rules.map(rule => this.evaluateRule(rule, data));
    const groupResults = (group.groups || []).map(g => this.evaluateGroup(g, data));
    const allResults = [...ruleResults, ...groupResults];

    if (group.combinator === 'AND') {
      return allResults.every(Boolean);
    } else {
      return allResults.some(Boolean);
    }
  }

  /**
   * Evaluate a single ConditionRule against instance data
   */
  private evaluateRule(rule: ConditionRule, data: Record<string, any>): boolean {
    const fieldValue = this.resolveFieldValue(rule.field, data);

    switch (rule.operator) {
      // --- Text operators ---
      case ConditionOperator.EQ:
        return fieldValue === rule.value;
      case ConditionOperator.NE:
        return fieldValue !== rule.value;
      case ConditionOperator.CONTAINS:
        return typeof fieldValue === 'string' && fieldValue.includes(String(rule.value));
      case ConditionOperator.STARTS_WITH:
        return typeof fieldValue === 'string' && fieldValue.startsWith(String(rule.value));
      case ConditionOperator.ENDS_WITH:
        return typeof fieldValue === 'string' && fieldValue.endsWith(String(rule.value));
      case ConditionOperator.IS_EMPTY:
        return fieldValue === null || fieldValue === undefined || fieldValue === '';
      case ConditionOperator.IS_NOT_EMPTY:
        return fieldValue !== null && fieldValue !== undefined && fieldValue !== '';

      // --- Number operators ---
      case ConditionOperator.GT:
        return Number(fieldValue) > Number(rule.value);
      case ConditionOperator.GTE:
        return Number(fieldValue) >= Number(rule.value);
      case ConditionOperator.LT:
        return Number(fieldValue) < Number(rule.value);
      case ConditionOperator.LTE:
        return Number(fieldValue) <= Number(rule.value);
      case ConditionOperator.BETWEEN:
        const num = Number(fieldValue);
        return num >= Number(rule.value) && num <= Number(rule.valueEnd);

      // --- Date operators ---
      case ConditionOperator.BEFORE:
        return new Date(fieldValue) < new Date(rule.value);
      case ConditionOperator.AFTER:
        return new Date(fieldValue) > new Date(rule.value);
      case ConditionOperator.WITHIN_LAST:
        const days = Number(rule.value);
        const date = new Date(fieldValue);
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - days);
        return date >= cutoff;

      // --- Multi-select operators ---
      case ConditionOperator.CONTAINS_ANY:
        const anyVals = Array.isArray(rule.value) ? rule.value : [rule.value];
        return anyVals.some(v => (fieldValue as any[]).includes(v));
      case ConditionOperator.CONTAINS_ALL:
        const allVals = Array.isArray(rule.value) ? rule.value : [rule.value];
        return allVals.every(v => (fieldValue as any[]).includes(v));

      default:
        console.warn(`[ConditionEvaluator] Unknown operator: ${rule.operator}`);
        return false;
    }
  }

  /**
   * Resolve "formData.amount" → data.formData.amount
   * Also supports "workflowData.amount"
   */
  private resolveFieldValue(field: string, data: Record<string, any>): any {
    const parts = field.split('.');
    let current: any = data;
    for (const part of parts) {
      if (current === null || current === undefined) return undefined;
      current = current[part];
    }
    return current;
  }

  /**
   * Get available operators for a given field type
   * Used by frontend to filter operator dropdown
   */
  getOperatorsForFieldType(fieldType: FieldType): ConditionOperator[] {
    const operatorMap: Record<FieldType, ConditionOperator[]> = {
      [FieldType.TEXT]: [
        ConditionOperator.EQ, ConditionOperator.NE, ConditionOperator.CONTAINS,
        ConditionOperator.STARTS_WITH, ConditionOperator.ENDS_WITH,
        ConditionOperator.IS_EMPTY, ConditionOperator.IS_NOT_EMPTY,
      ],
      [FieldType.NUMBER]: [
        ConditionOperator.EQ, ConditionOperator.NE,
        ConditionOperator.GT, ConditionOperator.GTE, ConditionOperator.LT, ConditionOperator.LTE,
        ConditionOperator.BETWEEN, ConditionOperator.IS_EMPTY, ConditionOperator.IS_NOT_EMPTY,
      ],
      [FieldType.DATE]: [
        ConditionOperator.EQ, ConditionOperator.NE,
        ConditionOperator.BEFORE, ConditionOperator.AFTER, ConditionOperator.WITHIN_LAST,
        ConditionOperator.IS_EMPTY, ConditionOperator.IS_NOT_EMPTY,
      ],
      [FieldType.YES_NO]: [ConditionOperator.EQ, ConditionOperator.NE],
      [FieldType.DROPDOWN]: [ConditionOperator.EQ, ConditionOperator.NE, ConditionOperator.IS_EMPTY],
      [FieldType.MULTISELECT]: [
        ConditionOperator.CONTAINS_ANY, ConditionOperator.CONTAINS_ALL, ConditionOperator.IS_EMPTY,
      ],
      [FieldType.CHECKBOX]: [ConditionOperator.EQ, ConditionOperator.NE],
    };
    return operatorMap[fieldType] || [];
  }
}
```

---

#### 2.1.3 Backend — WorkflowEngineService Update (Condition Node)

```typescript
// backend/src/workflows/workflow-engine.service.ts (partial — show condition handling)

import { ConditionEvaluatorService } from './condition-evaluator.service';

async function processConditionNode(
  node: WorkflowNode,
  instance: WorkflowInstance,
): Promise<ExecutionResult> {
  const config = node.config as NodeConfig & { conditionConfig?: ConditionConfig };
  const evaluator: ConditionEvaluatorService = new ConditionEvaluatorService();

  const result = evaluator.evaluate(config.conditionConfig, instance.data);

  const trueConnection = node.connections.find(c => c.sourceHandle === 'true');
  const falseConnection = node.connections.find(c => c.sourceHandle === 'false');

  if (result && trueConnection) {
    return { success: true, nextNodeId: trueConnection.targetNodeId };
  } else if (!result && falseConnection) {
    return { success: true, nextNodeId: falseConnection.targetNodeId };
  }

  return { success: false, error: `Condition node ${node.id} has no valid outgoing connection` };
}
```

---

#### 2.1.4 Frontend — ConditionBuilderComponent

**`condition-builder.component.ts`** (Angular):
```typescript
// frontend/src/app/features/workflow-designer/components/condition-builder/condition-builder.component.ts

import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ConditionConfig, ConditionGroup, ConditionRule, FieldType, ConditionOperator } from '../../../../../../../../backend/src/workflows/interfaces/condition-config.interface';
import { CdkDragDrop } from '@angular/cdk/drag-drop';

interface FieldOption {
  field: string;        // "formData.amount"
  label: string;        // "Amount"
  type: FieldType;
}

interface OperatorOption {
  operator: ConditionOperator;
  label: string;        // "is greater than"
}

@Component({
  selector: 'app-condition-builder',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="condition-builder">
      <div class="builder-header">
        <h4>Condition Builder</h4>
        <button class="btn-add-rule" (click)="addRule()">+ Add Rule</button>
      </div>

      <!-- Root Group -->
      <div class="condition-group">
        <div class="combinator-toggle">
          <label>Match</label>
          <select [(ngModel)]="config.rootGroup.combinator">
            <option value="AND">ALL conditions (AND)</option>
            <option value="OR">ANY condition (OR)</option>
          </select>
        </div>

        <!-- Rules -->
        <div class="rules-list">
          <div class="rule-card" *ngFor="let rule of config.rootGroup.rules; let i = index">
            <div class="rule-row">
              <!-- Field Selector -->
              <select [(ngModel)]="rule.field" (ngModelChange)="onFieldChange(rule)">
                <option *ngFor="let f of availableFields" [value]="f.field">
                  {{ f.label }}
                </option>
              </select>

              <!-- Operator Selector (filtered by field type) -->
              <select [(ngModel)]="rule.operator">
                <option *ngFor="let op of getOperators(rule.fieldType)" [value]="op.operator">
                  {{ op.label }}
                </option>
              </select>

              <!-- Value Input (shown when operator doesn't need a value) -->
              <ng-container *ngIf="!isNoValueOperator(rule.operator)">
                <ng-container [ngSwitch]="getFieldType(rule.field)?.type">
                  <input *ngSwitchCase="'number'" type="number" [(ngModel)]="rule.value" />
                  <input *ngSwitchCase="'text'" type="text" [(ngModel)]="rule.value" />
                  <input *ngSwitchCase="'date'" type="date" [(ngModel)]="rule.value" />
                  <select *ngSwitchCase="'dropdown'" [(ngModel)]="rule.value">
                    <option *ngFor="let opt of getDropdownOptions(rule.field)" [value]="opt.value">
                      {{ opt.label }}
                    </option>
                  </select>
                  <ng-container *ngSwitchCase="'multiselect'">
                    <div class="multiselect-checkboxes">
                      <label *ngFor="let opt of getDropdownOptions(rule.field)">
                        <input type="checkbox" [checked]="rule.value?.includes(opt.value)"
                               (change)="toggleMultiselect(rule, opt.value)" />
                        {{ opt.label }}
                      </label>
                    </div>
                  </ng-container>
                </ng-container>
              </ng-container>

              <!-- Remove Rule -->
              <button class="btn-remove" (click)="removeRule(i)">×</button>
            </div>
          </div>
        </div>

        <!-- Nested Groups -->
        <div class="nested-groups" *ngIf="config.rootGroup.groups?.length">
          <div class="nested-group" *ngFor="let subGroup of config.rootGroup.groups; let i = index">
            <div class="subgroup-header">
              <select [(ngModel)]="subGroup.combinator">
                <option value="AND">AND</option>
                <option value="OR">OR</option>
              </select>
              <button class="btn-remove-group" (click)="removeGroup(i)">Remove Group</button>
            </div>
            <!-- Recursive rendering of sub-group rules (simplified) -->
            <div class="subgroup-rules">
              <div class="rule-card" *ngFor="let rule of subGroup.rules; let j = index">
                <!-- Same rule row template as above -->
              </div>
            </div>
          </div>
        </div>

        <button class="btn-add-group" (click)="addNestedGroup()">+ Add Group</button>
      </div>

      <!-- Human-readable preview -->
      <div class="condition-preview">
        <strong>Preview:</strong> {{ getHumanReadable(config) }}
      </div>

      <div class="builder-footer">
        <button class="btn-cancel" (click)="onCancel()">Cancel</button>
        <button class="btn-save" (click)="onSave()">Save Condition</button>
      </div>
    </div>
  `,
  styles: [`
    .condition-builder { background: #fff; border: 1px solid #ddd; border-radius: 8px; padding: 16px; }
    .builder-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
    .condition-group { background: #f9f9f9; border-radius: 6px; padding: 12px; }
    .combinator-toggle { display: flex; align-items: center; gap: 8px; margin-bottom: 12px; }
    .rule-card { background: #fff; border: 1px solid #e0e0e0; border-radius: 6px; padding: 8px; margin-bottom: 8px; }
    .rule-row { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
    .rule-row select, .rule-row input { padding: 6px 8px; border: 1px solid #ccc; border-radius: 4px; }
    .btn-remove { background: #ff4444; color: #fff; border: none; border-radius: 50%; width: 24px; height: 24px; cursor: pointer; }
    .condition-preview { margin-top: 12px; padding: 8px; background: #e8f4ff; border-radius: 4px; font-size: 13px; }
    .builder-footer { display: flex; justify-content: flex-end; gap: 8px; margin-top: 16px; }
    .btn-save { background: #0066cc; color: #fff; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; }
    .btn-cancel { background: #f0f0f0; border: 1px solid #ccc; padding: 8px 16px; border-radius: 4px; cursor: pointer; }
  `]
})
export class ConditionBuilderComponent {
  @Input() config: ConditionConfig;
  @Output() configChange = new EventEmitter<ConditionConfig>();
  @Output() save = new EventEmitter<ConditionConfig>();
  @Output() cancel = new EventEmitter<void>();

  availableFields: FieldOption[] = [];

  ngOnInit() {
    // Load fields from the workflow's associated form definition
    this.loadFormFields();
    // Initialize with default if empty
    if (!this.config?.rootGroup) {
      this.config = { rootGroup: { id: 'group_1', combinator: 'AND', rules: [], groups: [] } };
    }
  }

  loadFormFields() {
    // TODO: Inject WorkflowDesignerStateService to get form fields
    this.availableFields = [
      { field: 'formData.amount', label: 'Amount', type: FieldType.NUMBER },
      { field: 'formData.department', label: 'Department', type: FieldType.DROPDOWN },
      { field: 'formData.priority', label: 'Priority', type: FieldType.DROPDOWN },
      { field: 'formData.requester', label: 'Requester Name', type: FieldType.TEXT },
      { field: 'formData.startDate', label: 'Start Date', type: FieldType.DATE },
      { field: 'formData.urgent', label: 'Is Urgent', type: FieldType.YES_NO },
    ];
  }

  addRule() {
    const rule: ConditionRule = {
      id: `rule_${Date.now()}`,
      field: this.availableFields[0]?.field || '',
      fieldType: this.availableFields[0]?.type || FieldType.TEXT,
      fieldLabel: this.availableFields[0]?.label || '',
      operator: ConditionOperator.EQ,
      value: null,
    };
    this.config.rootGroup.rules.push(rule);
  }

  removeRule(index: number) {
    this.config.rootGroup.rules.splice(index, 1);
  }

  addNestedGroup() {
    if (!this.config.rootGroup.groups) this.config.rootGroup.groups = [];
    this.config.rootGroup.groups.push({
      id: `group_${Date.now()}`,
      combinator: 'AND',
      rules: [],
      groups: [],
    });
  }

  removeGroup(index: number) {
    this.config.rootGroup.groups!.splice(index, 1);
  }

  onFieldChange(rule: ConditionRule) {
    const fieldDef = this.availableFields.find(f => f.field === rule.field);
    if (fieldDef) {
      rule.fieldType = fieldDef.type;
      rule.fieldLabel = fieldDef.label;
      rule.value = null;
    }
  }

  getOperators(fieldType: FieldType): OperatorOption[] {
    const operatorLabels: Record<ConditionOperator, string> = {
      [ConditionOperator.EQ]: 'equals',
      [ConditionOperator.NE]: 'does not equal',
      [ConditionOperator.GT]: 'is greater than',
      [ConditionOperator.GTE]: 'is greater than or equal',
      [ConditionOperator.LT]: 'is less than',
      [ConditionOperator.LTE]: 'is less than or equal',
      [ConditionOperator.BETWEEN]: 'is between',
      [ConditionOperator.CONTAINS]: 'contains',
      [ConditionOperator.STARTS_WITH]: 'starts with',
      [ConditionOperator.ENDS_WITH]: 'ends with',
      [ConditionOperator.IS_EMPTY]: 'is empty',
      [ConditionOperator.IS_NOT_EMPTY]: 'is not empty',
      [ConditionOperator.BEFORE]: 'is before',
      [ConditionOperator.AFTER]: 'is after',
      [ConditionOperator.WITHIN_LAST]: 'is within last',
      [ConditionOperator.CONTAINS_ANY]: 'contains any',
      [ConditionOperator.CONTAINS_ALL]: 'contains all',
    };
    const evaluator = new ConditionEvaluatorService(new Logger());
    return evaluator.getOperatorsForFieldType(fieldType)
      .map(op => ({ operator: op, label: operatorLabels[op] || op }));
  }

  isNoValueOperator(op: ConditionOperator): boolean {
    return [ConditionOperator.IS_EMPTY, ConditionOperator.IS_NOT_EMPTY].includes(op);
  }

  getFieldType(field: string): FieldOption | undefined {
    return this.availableFields.find(f => f.field === field);
  }

  getDropdownOptions(field: string): { value: string; label: string }[] {
    // In real implementation, look up options from form definition
    if (field === 'formData.department') return [{ value: 'IT', label: 'IT' }, { value: 'HR', label: 'HR' }, { value: 'Finance', label: 'Finance' }];
    if (field === 'formData.priority') return [{ value: 'Low', label: 'Low' }, { value: 'Medium', label: 'Medium' }, { value: 'Urgent', label: 'Urgent' }];
    return [];
  }

  toggleMultiselect(rule: ConditionRule, value: string) {
    if (!rule.value) rule.value = [];
    const idx = rule.value.indexOf(value);
    if (idx >= 0) rule.value.splice(idx, 1);
    else rule.value.push(value);
  }

  getHumanReadable(config: ConditionConfig): string {
    const ruleToStr = (r: ConditionRule) => {
      const op = this.getOperators(r.fieldType).find(o => o.operator === r.operator)?.label || r.operator;
      const val = r.value !== null ? ` ${JSON.stringify(r.value)}` : '';
      return `${r.fieldLabel} ${op}${val}`;
    };
    const group = config.rootGroup;
    const parts = [
      ...group.rules.map(ruleToStr),
      ...(group.groups || []).map(g => `(${g.rules.map(ruleToStr).join(` ${g.combinator} `)})`),
    ];
    return parts.join(` ${group.combinator} `) || '(no conditions)';
  }

  onCancel() { this.cancel.emit(); }
  onSave() { this.save.emit(this.config); }
}
```

**`condition-builder.component.html`** (alternative template approach if not using inline):
```html
<!-- See inline template above — this is the reference layout -->
```

---

### 2.2 Parallel + Join Flow Guided UX
**Priority:** High

#### 2.2.1 Frontend — DeadlockDetectionService

```typescript
// frontend/src/app/features/workflow-designer/services/deadlock-detection.service.ts

import { Injectable } from '@angular/core';

export interface ValidationIssue {
  type: 'error' | 'warning';
  nodeId?: string;
  message: string;
  path?: string[]; // node IDs forming the problematic path
}

export interface WorkflowGraph {
  nodes: WorkflowNode[];
  connections: Connection[];
}

export interface WorkflowNode {
  id: string;
  type: 'start' | 'end' | 'task' | 'form' | 'approval' | 'condition' | 'parallel' | 'join' | 'subWorkflow' | 'script' | 'setValue' | 'transform';
  label: string;
  position: { x: number; y: number };
  config: Record<string, any>;
}

export interface Connection {
  id: string;
  sourceNodeId: string;
  targetNodeId: string;
  sourceHandle?: string;
}

@Injectable({ providedIn: 'root' })
export class DeadlockDetectionService {

  /**
   * Validate a workflow graph for structural issues
   * Returns array of issues (empty = valid)
   */
  validate(graph: WorkflowGraph): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    const parallelNodes = graph.nodes.filter(n => n.type === 'parallel');
    const joinNodes = graph.nodes.filter(n => n.type === 'join');

    // 1. Check: every parallel has a matching downstream join
    for (const parallel of parallelNodes) {
      const downstreamJoins = this.findDownstreamJoins(parallel.id, graph);
      if (downstreamJoins.length === 0) {
        issues.push({
          type: 'error',
          nodeId: parallel.id,
          message: `Parallel node "${parallel.label}" has no downstream Join node. This will cause a deadlock.`,
        });
      } else if (downstreamJoins.length > 1) {
        issues.push({
          type: 'warning',
          nodeId: parallel.id,
          message: `Parallel node "${parallel.label}" has ${downstreamJoins.length} downstream Join nodes. Consider using one Join per Parallel.`,
          path: [parallel.id, ...downstreamJoins.map(j => j.id)],
        });
      }
    }

    // 2. Check: every join has matching upstream parallels
    for (const join of joinNodes) {
      const upstreamParallels = this.findUpstreamParallels(join.id, graph);
      const upstreamParallelCount = upstreamParallels.length;

      // Get the expected branch count from join config
      const expectedBranches = (join.config?.branches as string[] | undefined)?.length || upstreamParallelCount;

      if (upstreamParallelCount === 0) {
        issues.push({
          type: 'error',
          nodeId: join.id,
          message: `Join node "${join.label}" has no upstream Parallel node.`,
        });
      } else if (upstreamParallelCount !== expectedBranches) {
        issues.push({
          type: 'warning',
          nodeId: join.id,
          message: `Join node "${join.label}" receives from ${upstreamParallelCount} branches but expects ${expectedBranches}.`,
          path: [...upstreamParallels.map(p => p.id), join.id],
        });
      }
    }

    // 3. Check: no unreachable nodes (nodes not reachable from Start)
    const reachable = this.computeReachableNodes(graph);
    const unreachable = graph.nodes.filter(n => n.type !== 'start' && !reachable.has(n.id));
    for (const node of unreachable) {
      issues.push({
        type: 'error',
        nodeId: node.id,
        message: `Node "${node.label}" is unreachable from the Start node.`,
      });
    }

    // 4. Check: every node except End has at least one outgoing connection
    for (const node of graph.nodes) {
      if (node.type === 'end') continue;
      const outgoing = graph.connections.filter(c => c.sourceNodeId === node.id);
      if (outgoing.length === 0) {
        issues.push({
          type: 'error',
          nodeId: node.id,
          message: `Node "${node.label}" has no outgoing connections.`,
        });
      }
    }

    // 5. Check: no infinite loops (DFS cycle detection)
    const cycles = this.detectCycles(graph);
    for (const cycle of cycles) {
      issues.push({
        type: 'warning',
        message: `Detected a loop: ${cycle.map(id => this.getNodeLabel(graph, id)).join(' → ')}`,
        path: cycle,
      });
    }

    return issues;
  }

  private findDownstreamJoins(nodeId: string, graph: WorkflowGraph): WorkflowNode[] {
    const visited = new Set<string>();
    const joins: WorkflowNode[] = [];
    const queue = [nodeId];

    while (queue.length) {
      const current = queue.shift()!;
      if (visited.has(current)) continue;
      visited.add(current);

      const outgoing = graph.connections.filter(c => c.sourceNodeId === current);
      for (const conn of outgoing) {
        const targetNode = graph.nodes.find(n => n.id === conn.targetNodeId);
        if (targetNode?.type === 'join') {
          joins.push(targetNode);
        } else if (targetNode) {
          queue.push(targetNode.id);
        }
      }
    }
    return joins;
  }

  private findUpstreamParallels(nodeId: string, graph: WorkflowGraph): WorkflowNode[] {
    const visited = new Set<string>();
    const parallels: WorkflowNode[] = [];
    const queue = [nodeId];

    while (queue.length) {
      const current = queue.shift()!;
      if (visited.has(current)) continue;
      visited.add(current);

      const incoming = graph.connections.filter(c => c.targetNodeId === current);
      for (const conn of incoming) {
        const sourceNode = graph.nodes.find(n => n.id === conn.sourceNodeId);
        if (sourceNode?.type === 'parallel') {
          parallels.push(sourceNode);
        } else if (sourceNode) {
          queue.push(sourceNode.id);
        }
      }
    }
    return parallels;
  }

  private computeReachableNodes(graph: WorkflowGraph): Set<string> {
    const reachable = new Set<string>();
    const startNodes = graph.nodes.filter(n => n.type === 'start');
    const queue = startNodes.map(n => n.id);

    while (queue.length) {
      const current = queue.shift()!;
      if (reachable.has(current)) continue;
      reachable.add(current);

      const outgoing = graph.connections.filter(c => c.sourceNodeId === current);
      for (const conn of outgoing) {
        if (!reachable.has(conn.targetNodeId)) queue.push(conn.targetNodeId);
      }
    }
    return reachable;
  }

  private detectCycles(graph: WorkflowGraph): string[][] {
    const cycles: string[][] = [];
    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    const path: string[] = [];

    function dfs(nodeId: string): void {
      visited.add(nodeId);
      recursionStack.add(nodeId);
      path.push(nodeId);

      const outgoing = graph.connections.filter(c => c.sourceNodeId === nodeId);
      for (const conn of outgoing) {
        if (!visited.has(conn.targetNodeId)) {
          dfs(conn.targetNodeId);
        } else if (recursionStack.has(conn.targetNodeId)) {
          // Found cycle — extract the cycle path
          const cycleStart = path.indexOf(conn.targetNodeId);
          cycles.push([...path.slice(cycleStart), conn.targetNodeId]);
        }
      }

      path.pop();
      recursionStack.delete(nodeId);
    }

    for (const node of graph.nodes) {
      if (!visited.has(node.id)) dfs(node.id);
    }
    return cycles;
  }

  private getNodeLabel(graph: WorkflowGraph, nodeId: string): string {
    return graph.nodes.find(n => n.id === nodeId)?.label || nodeId;
  }

  /**
   * Assign colors to parallel branch lanes for visualization
   */
  assignBranchColors(graph: WorkflowGraph): Map<string, string> {
    const colors = new Map<string, string>();
    const palette = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD'];
    let colorIndex = 0;

    for (const parallel of graph.nodes.filter(n => n.type === 'parallel')) {
      const downstreamNodes = this.getBranchNodes(parallel.id, graph);
      const branchColor = palette[colorIndex % palette.length];
      for (const nodeId of downstreamNodes) {
        colors.set(nodeId, branchColor);
      }
      colorIndex++;
    }
    return colors;
  }

  private getBranchNodes(parallelId: string, graph: WorkflowGraph): string[] {
    // Get all nodes in branches downstream of this parallel until the matching join
    const downstreamJoins = this.findDownstreamJoins(parallelId, graph);
    if (!downstreamJoins.length) return [];

    const matchingJoin = downstreamJoins[0];
    const reachable = new Set<string>();
    const queue = [parallelId];

    while (queue.length) {
      const current = queue.shift()!;
      if (reachable.has(current)) continue;
      reachable.add(current);

      const outgoing = graph.connections.filter(c => c.sourceNodeId === current);
      for (const conn of outgoing) {
        if (conn.targetNodeId !== matchingJoin.id && !reachable.has(conn.targetNodeId)) {
          queue.push(conn.targetNodeId);
        }
      }
    }
    return Array.from(reachable);
  }
}
```

---

#### 2.2.2 Backend — WorkflowValidatorService

```typescript
// backend/src/workflows/validators/workflow-validator.service.ts

import { Injectable } from '@nestjs/common';
import { WorkflowDefinition, WorkflowNode, Connection } from '../interfaces';

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

    // 1. Exactly one Start node
    const startNodes = definition.nodes.filter(n => n.type === 'start');
    if (startNodes.length === 0) errors.push('Workflow must have exactly one Start node');
    if (startNodes.length > 1) errors.push('Workflow must have exactly one Start node (found multiple)');

    // 2. At least one End node
    const endNodes = definition.nodes.filter(n => n.type === 'end');
    if (endNodes.length === 0) errors.push('Workflow must have at least one End node');

    // 3. Every node except End has outgoing connections
    for (const node of definition.nodes) {
      if (node.type === 'end') continue;
      const outgoing = definition.connections.filter(c => c.sourceNodeId === node.id);
      if (outgoing.length === 0) {
        errors.push(`Node "${node.label}" (${node.type}) has no outgoing connections`);
      }
    }

    // 4. Parallel/Join structural validation
    const parallelNodes = definition.nodes.filter(n => n.type === 'parallel');
    const joinNodes = definition.nodes.filter(n => n.type === 'join');

    for (const parallel of parallelNodes) {
      const joinsReached = this.findDownstreamNodesOfType(parallel.id, 'join', definition);
      if (joinsReached.length === 0) {
        errors.push(`Parallel node "${parallel.label}" has no downstream Join — will deadlock`);
      }
    }

    for (const join of joinNodes) {
      const parallelsReached = this.findUpstreamNodesOfType(join.id, 'parallel', definition);
      if (parallelsReached.length === 0) {
        errors.push(`Join node "${join.label}" has no upstream Parallel`);
      }

      const expectedBranches = (join.config?.branches as string[])?.length || 0;
      if (expectedBranches > 0 && parallelsReached.length !== expectedBranches) {
        warnings.push(`Join node "${join.label}" expects ${expectedBranches} branches but has ${parallelsReached.length} upstream`);
      }
    }

    // 5. No orphan nodes
    const reachable = this.computeReachable(definition);
    for (const node of definition.nodes) {
      if (!reachable.has(node.id) && node.type !== 'start') {
        errors.push(`Node "${node.label}" is unreachable from Start`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  private findDownstreamNodesOfType(nodeId: string, targetType: string, def: WorkflowDefinition): WorkflowNode[] {
    const visited = new Set<string>();
    const result: WorkflowNode[] = [];
    const queue = [nodeId];

    while (queue.length) {
      const current = queue.shift()!;
      if (visited.has(current)) continue;
      visited.add(current);

      const outgoing = def.connections.filter(c => c.sourceNodeId === current);
      for (const conn of outgoing) {
        const target = def.nodes.find(n => n.id === conn.targetNodeId);
        if (target?.type === targetType) result.push(target);
        else if (target) queue.push(target.id);
      }
    }
    return result;
  }

  private findUpstreamNodesOfType(nodeId: string, targetType: string, def: WorkflowDefinition): WorkflowNode[] {
    const visited = new Set<string>();
    const result: WorkflowNode[] = [];
    const queue = [nodeId];

    while (queue.length) {
      const current = queue.shift()!;
      if (visited.has(current)) continue;
      visited.add(current);

      const incoming = def.connections.filter(c => c.targetNodeId === current);
      for (const conn of incoming) {
        const source = def.nodes.find(n => n.id === conn.sourceNodeId);
        if (source?.type === targetType) result.push(source);
        else if (source) queue.push(source.id);
      }
    }
    return result;
  }

  private computeReachable(def: WorkflowDefinition): Set<string> {
    const reachable = new Set<string>();
    const starts = def.nodes.filter(n => n.type === 'start');
    const queue = starts.map(n => n.id);

    while (queue.length) {
      const current = queue.shift()!;
      if (reachable.has(current)) continue;
      reachable.add(current);

      def.connections
        .filter(c => c.sourceNodeId === current)
        .forEach(c => { if (!reachable.has(c.targetNodeId)) queue.push(c.targetNodeId); });
    }
    return reachable;
  }
}
```

---

### 2.3 Simplified Sub-Workflow Data Mapping
**Priority:** Medium

#### 2.3.1 Data Model — SubWorkflowMappingConfig

```typescript
// backend/src/workflows/interfaces/sub-workflow-mapping.interface.ts

export enum SubWorkflowMappingMode {
  INHERIT = 'inherit',   // Use same form data, no explicit mapping
  EXTRACT = 'extract',   // Select specific fields to pass
  TRANSFORM = 'transform', // Apply transforms before passing
}

export interface FieldMapping {
  sourceField: string;    // e.g., "formData.amount"
  targetField: string;    // e.g., "expenseData.amount"
  transform?: string;     // optional simple expression, e.g., "value * 1.1"
}

export interface SubWorkflowMappingConfig {
  mode: SubWorkflowMappingMode;
  // For EXTRACT and TRANSFORM modes
  mappings?: FieldMapping[];
  // For INHERIT mode — optional filter
  filterFields?: string[];  // if set, only pass these fields
}

export interface SubWorkflowInvocation {
  subWorkflowId: string;
  mapping: SubWorkflowMappingConfig;
  // Execution handles instance creation internally
}
```

**Example stored in `WorkflowNode.config`:**
```json
{
  "subWorkflowId": "wf_expense_approval_v2",
  "mapping": {
    "mode": "transform",
    "mappings": [
      { "sourceField": "formData.amount", "targetField": "expenseData.amount" },
      { "sourceField": "formData.department", "targetField": "expenseData.department" },
      { "sourceField": "formData.amount", "targetField": "expenseData.taxAmount", "transform": "value * 0.1" }
    ]
  }
}
```

---

#### 2.3.2 Frontend — SubWorkflowMapperComponent

```typescript
// frontend/src/app/features/workflow-designer/components/sub-workflow-mapper/sub-workflow-mapper.component.ts

import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SubWorkflowMappingConfig, SubWorkflowMappingMode, FieldMapping } from '../../../../../../../../backend/src/workflows/interfaces/sub-workflow-mapping.interface';

interface MappingLine {
  sourceField: string;
  targetField: string;
  transform?: string;
  compatible: boolean;
}

@Component({
  selector: 'app-sub-workflow-mapper',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="mapper-container">
      <div class="mapper-header">
        <h4>Data Mapping — {{ parentWorkflowName }} → {{ childWorkflowName }}</h4>
      </div>

      <!-- Mode Selector -->
      <div class="mode-selector">
        <label>Mapping Mode:</label>
        <div class="mode-buttons">
          <button [class.active]="config.mode === 'inherit'"
                  (click)="setMode('inherit')">Inherit All Fields</button>
          <button [class.active]="config.mode === 'extract'"
                  (click)="setMode('extract')">Extract Selected</button>
          <button [class.active]="config.mode === 'transform'"
                  (click)="setMode('transform')">Transform</button>
        </div>
      </div>

      <!-- Inherit Mode: Simple filter -->
      <div *ngIf="config.mode === 'inherit'" class="inherit-panel">
        <p>All form fields will be passed to the sub-workflow.</p>
        <div *ngIf="config.filterFields?.length" class="filter-info">
          <strong>Only passing:</strong> {{ config.filterFields.join(', ') }}
          <button class="btn-edit" (click)="editFilter()">Edit</button>
        </div>
        <div *ngIf="!config.filterFields?.length">
          <button class="btn-secondary" (click)="enableFilter()">Limit fields (optional)</button>
        </div>
      </div>

      <!-- Extract / Transform Mode: Field Mapping Table -->
      <div *ngIf="config.mode === 'extract' || config.mode === 'transform'" class="mapping-table">
        <div class="mapping-header-row">
          <div class="col-source">Parent Field</div>
          <div class="col-arrow"></div>
          <div class="col-target">Sub-Workflow Input</div>
          <div class="col-transform" *ngIf="config.mode === 'transform'">Transform</div>
          <div class="col-status"></div>
          <div class="col-action"></div>
        </div>

        <div class="mapping-row" *ngFor="let line of mappingLines; let i = index">
          <!-- Source Field -->
          <select [(ngModel)]="line.sourceField" (ngModelChange)="onSourceChange(line)">
            <option value="">— select —</option>
            <option *ngFor="let f of parentFields" [value]="f.field">{{ f.label }}</option>
          </select>

          <div class="col-arrow">→</div>

          <!-- Target Field -->
          <select [(ngModel)]="line.targetField" (ngModelChange)="onTargetChange(line)">
            <option value="">— select —</option>
            <option *ngFor="let f of childInputFields" [value]="f.field">{{ f.label }}</option>
          </select>

          <!-- Transform (only in transform mode) -->
          <input *ngIf="config.mode === 'transform'" type="text"
                 [(ngModel)]="line.transform"
                 placeholder="e.g., value * 1.1"
                 class="transform-input" />

          <!-- Compatibility Status -->
          <div class="col-status">
            <span *ngIf="line.compatible && line.sourceField && line.targetField" class="status-ok">✓</span>
            <span *ngIf="!line.compatible && line.sourceField && line.targetField" class="status-warn">⚠ type mismatch</span>
          </div>

          <button class="btn-remove" (click)="removeMapping(i)">×</button>
        </div>

        <!-- Auto-map suggestions -->
        <div class="auto-map-section">
          <button class="btn-secondary" (click)="autoMap()">🔄 Auto-map matching names</button>
          <button class="btn-secondary" (click)="addMapping()">+ Add Mapping</button>
        </div>

        <!-- Templates -->
        <div class="templates-section">
          <span>Quick templates:</span>
          <button class="btn-template" (click)="applyTemplate('passAll')">Pass All Fields</button>
          <button class="btn-template" (click)="applyTemplate('passResult')">Pass Approval Result Only</button>
        </div>
      </div>

      <!-- Advanced Toggle -->
      <div class="advanced-toggle">
        <button class="btn-link" (click)="showAdvanced = !showAdvanced">
          {{ showAdvanced ? '▲ Hide' : '▶ Show' }} Advanced (raw JSON)
        </button>
        <textarea *ngIf="showAdvanced" class="advanced-textarea"
                  [(ngModel)]="advancedJson" rows="6"></textarea>
      </div>

      <div class="mapper-footer">
        <button class="btn-cancel" (click)="onCancel()">Cancel</button>
        <button class="btn-save" (click)="onSave()">Save Mapping</button>
      </div>
    </div>
  `,
  styles: [`
    .mapper-container { background: #fff; border: 1px solid #ddd; border-radius: 8px; padding: 16px; max-width: 900px; }
    .mode-buttons { display: flex; gap: 8px; }
    .mode-buttons button { padding: 8px 16px; border: 1px solid #ccc; border-radius: 4px; background: #f5f5f5; cursor: pointer; }
    .mode-buttons button.active { background: #0066cc; color: #fff; border-color: #0066cc; }
    .mapping-table { margin-top: 16px; }
    .mapping-header-row, .mapping-row { display: flex; align-items: center; gap: 8px; padding: 8px 0; }
    .col-source, .col-target { flex: 2; }
    .col-arrow { flex: 0 0 30px; text-align: center; }
    .col-transform { flex: 2; }
    .col-status { flex: 1; font-size: 12px; }
    .col-action { flex: 0 0 30px; }
    .status-ok { color: green; }
    .status-warn { color: orange; }
    .transform-input { padding: 4px 8px; border: 1px solid #ccc; border-radius: 4px; width: 100%; }
    .advanced-textarea { width: 100%; font-family: monospace; font-size: 12px; margin-top: 8px; }
    .btn-template { background: #f0f0f0; border: 1px solid #ccc; padding: 4px 8px; border-radius: 4px; cursor: pointer; font-size: 12px; }
    .templates-section { margin-top: 8px; display: flex; align-items: center; gap: 8px; }
  `]
})
export class SubWorkflowMapperComponent implements OnInit {
  @Input() config: SubWorkflowMappingConfig;
  @Input() parentWorkflowName = 'Parent Workflow';
  @Input() childWorkflowName = 'Sub-Workflow';
  @Output() configChange = new EventEmitter<SubWorkflowMappingConfig>();
  @Output() save = new EventEmitter<SubWorkflowMappingConfig>();
  @Output() cancel = new EventEmitter<void>();

  parentFields: { field: string; label: string; type: string }[] = [];
  childInputFields: { field: string; label: string; type: string }[] = [];
  mappingLines: MappingLine[] = [];
  showAdvanced = false;
  advancedJson = '';

  ngOnInit() {
    this.loadFields();
    this.syncFromConfig();
  }

  loadFields() {
    // TODO: Load from WorkflowDesignerStateService
    this.parentFields = [
      { field: 'formData.amount', label: 'Amount', type: 'number' },
      { field: 'formData.department', label: 'Department', type: 'dropdown' },
      { field: 'formData.description', label: 'Description', type: 'text' },
      { field: 'formData.approved', label: 'Approved', type: 'yesNo' },
    ];
    this.childInputFields = [
      { field: 'expenseData.amount', label: 'Expense Amount', type: 'number' },
      { field: 'expenseData.department', label: 'Cost Center', type: 'dropdown' },
      { field: 'expenseData.description', label: 'Justification', type: 'text' },
      { field: 'expenseData.taxAmount', label: 'Tax Amount', type: 'number' },
    ];
  }

  syncFromConfig() {
    if (!this.config) {
      this.config = { mode: SubWorkflowMappingMode.INHERIT };
    }
    if (this.config.mappings) {
      this.mappingLines = this.config.mappings.map(m => ({
        sourceField: m.sourceField,
        targetField: m.targetField,
        transform: m.transform,
        compatible: this.checkCompatibility(m.sourceField, m.targetField),
      }));
    }
    this.advancedJson = JSON.stringify(this.config, null, 2);
  }

  setMode(mode: SubWorkflowMappingMode) {
    this.config.mode = mode;
    if (mode === SubWorkflowMappingMode.INHERIT) {
      this.config.mappings = undefined;
    }
  }

  addMapping() {
    this.mappingLines.push({ sourceField: '', targetField: '', compatible: false });
    this.config.mappings = this.toMappings();
  }

  removeMapping(index: number) {
    this.mappingLines.splice(index, 1);
    this.config.mappings = this.toMappings();
  }

  onSourceChange(line: MappingLine) {
    line.compatible = this.checkCompatibility(line.sourceField, line.targetField);
    this.config.mappings = this.toMappings();
  }

  onTargetChange(line: MappingLine) {
    line.compatible = this.checkCompatibility(line.sourceField, line.targetField);
    this.config.mappings = this.toMappings();
  }

  checkCompatibility(sourceField: string, targetField: string): boolean {
    if (!sourceField || !targetField) return false;
    const s = this.parentFields.find(f => f.field === sourceField);
    const t = this.childInputFields.find(f => f.field === targetField);
    return s?.type === t?.type;
  }

  autoMap() {
    this.mappingLines = [];
    for (const parent of this.parentFields) {
      const child = this.childInputFields.find(f => f.label === parent.label || f.field.includes(parent.field.split('.').pop()!));
      if (child) {
        this.mappingLines.push({
          sourceField: parent.field,
          targetField: child.field,
          compatible: parent.type === child.type,
        });
      }
    }
    this.config.mappings = this.toMappings();
  }

  applyTemplate(template: 'passAll' | 'passResult') {
    if (template === 'passAll') {
      this.mappingLines = this.parentFields.map(p => ({
        sourceField: p.field,
        targetField: p.field,
        compatible: true,
      }));
    } else if (template === 'passResult') {
      this.mappingLines = [
        { sourceField: 'formData.approved', targetField: 'approvalResult.approved', compatible: true },
      ];
    }
    this.config.mappings = this.toMappings();
  }

  private toMappings(): FieldMapping[] {
    return this.mappingLines
      .filter(l => l.sourceField && l.targetField)
      .map(l => ({
        sourceField: l.sourceField,
        targetField: l.targetField,
        transform: l.transform,
      }));
  }

  onCancel() { this.cancel.emit(); }
  onSave() { this.save.emit(this.config); }
}
```

---

### 2.4 Workflow Simulation / Dry Run Mode
**Priority:** High

#### 2.4.1 Backend — SimulationEngineService

```typescript
// backend/src/workflows/simulation-engine.service.ts

import { Injectable, Logger } from '@nestjs/common';
import { WorkflowEngineService } from './workflow-engine.service';
import { WorkflowDefinition } from './interfaces';
import { ConditionEvaluatorService } from './condition-evaluator.service';

export interface SimulationStep {
  stepNumber: number;
  timestamp: string;
  nodeId: string;
  nodeLabel: string;
  nodeType: string;
  action: 'entered' | 'paused' | 'completed' | 'branched' | 'joined' | 'decided';
  inputData: Record<string, any>;
  outputData?: Record<string, any>;
  decision?: { condition: string; result: boolean };
  parallelBranches?: string[];
  logMessages: string[];
}

export interface SimulationResult {
  completed: boolean;
  finalData: Record<string, any>;
  finalStatus: 'completed' | 'rejected' | 'cancelled' | 'deadlocked';
  steps: SimulationStep[];
  notificationsSent: string[];  // Would-have-been-sent notifications (log only)
  errors: string[];
}

@Injectable()
export class SimulationEngineService {
  private readonly logger = new Logger(SimulationEngineService.name);

  constructor(
    private readonly workflowEngine: WorkflowEngineService,
    private readonly conditionEvaluator: ConditionEvaluatorService,
  ) {}

  /**
   * Run a workflow simulation with injected sample data.
   * Does NOT persist any instances or send real notifications.
   */
  async simulate(
    workflowDefinition: WorkflowDefinition,
    initialData: Record<string, any>,
    options?: { maxSteps?: number; breakOnNodeIds?: string[] },
  ): Promise<SimulationResult> {
    const steps: SimulationStep[] = [];
    const notificationsSent: string[] = [];
    const errors: string[] = [];
    let currentData = { ...initialData };
    let stepNumber = 0;
    const maxSteps = options?.maxSteps ?? 200;
    const breakOnNodeIds = new Set(options?.breakOnNodeIds ?? []);

    // Clone definition so we don't mutate the real one
    const definition = JSON.parse(JSON.stringify(workflowDefinition)) as WorkflowDefinition;

    // Find start node
    const startNode = definition.nodes.find(n => n.type === 'start');
    if (!startNode) {
      return { completed: false, finalData: currentData, finalStatus: 'deadlocked', steps, notificationsSent, errors: ['No Start node found'] };
    }

    // Find first node after start
    const firstConnection = definition.connections.find(c => c.sourceNodeId === startNode.id);
    if (!firstConnection) {
      return { completed: false, finalData: currentData, finalStatus: 'deadlocked', steps, notificationsSent, errors: ['Start node has no outgoing connection'] };
    }

    let currentNodeId = firstConnection.targetNodeId;
    const pausedNodes: Map<string, string> = new Map(); // nodeId → incoming data (for parallel/join)
    const branchResults: Map<string, any> = new Map();  // branchId → result

    while (stepNumber < maxSteps) {
      stepNumber++;
      const node = definition.nodes.find(n => n.id === currentNodeId);
      if (!node) {
        errors.push(`Node not found: ${currentNodeId}`);
        break;
      }

      const step: SimulationStep = {
        stepNumber,
        timestamp: new Date().toISOString(),
        nodeId: node.id,
        nodeLabel: node.label,
        nodeType: node.type,
        action: 'entered',
        inputData: { ...currentData },
        logMessages: [],
      };

      // Check for breakpoint
      if (breakOnNodeIds.has(node.id)) {
        step.action = 'paused';
        steps.push(step);
        return {
          completed: false,
          finalData: currentData,
          finalStatus: 'cancelled',
          steps,
          notificationsSent,
          errors: [`Simulation paused at breakpoint: ${node.label}`],
        };
      }

      try {
        switch (node.type) {
          case 'end':
            step.action = 'completed';
            step.outputData = currentData;
            steps.push(step);
            return {
              completed: true,
              finalData: currentData,
              finalStatus: 'completed',
              steps,
              notificationsSent,
              errors: [],
            };

          case 'form':
          case 'task':
          case 'approval':
            // In simulation, treat as pause points — advance with current data
            step.action = 'paused';
            step.logMessages.push(`[SIMULATE] ${node.type} node "${node.label}" — would pause for user action`);
            step.logMessages.push(`[SIMULATE] Auto-advancing with current data for simulation`);
            currentNodeId = this.getNextNodeId(node.id, definition, currentData);
            break;

          case 'condition': {
            step.action = 'decided';
            const config = node.config as any;
            if (config.conditionConfig) {
              const result = this.conditionEvaluator.evaluate(config.conditionConfig, currentData);
              const branch = result ? 'true' : 'false';
              step.decision = { condition: JSON.stringify(config.conditionConfig), result };
              step.logMessages.push(`[SIMULATE] Condition evaluated to ${result}`);
              const conn = definition.connections.find(c => c.sourceNodeId === node.id && c.sourceHandle === branch);
              currentNodeId = conn?.targetNodeId ?? '';
              step.outputData = { ...currentData, _conditionResult: result };
            } else {
              errors.push(`Condition node "${node.label}" has no conditionConfig`);
              currentNodeId = '';
            }
            break;
          }

          case 'parallel': {
            step.action = 'branched';
            const branches = (node.config?.branches as string[]) ?? [];
            step.parallelBranches = branches;
            step.logMessages.push(`[SIMULATE] Parallel node — spawning ${branches.length} branches`);
            // For simulation, execute first branch only (sequential simulation of parallel)
            // In full simulation, you would spawn all branches concurrently
            currentNodeId = branches[0] ?? '';
            break;
          }

          case 'join': {
            step.action = 'joined';
            const joinType = node.config?.joinType ?? 'AND';
            step.logMessages.push(`[SIMULATE] Join node (${joinType}) — waiting for branches`);
            // In sequential simulation, assume all branches complete
            currentNodeId = this.getNextNodeId(node.id, definition, currentData);
            break;
          }

          case 'script': {
            step.action = 'completed';
            const scriptConfig = node.config as any;
            if (scriptConfig.script && scriptConfig.outputField) {
              // SAFE evaluation — only allow math and string ops, no side effects
              const result = this.evaluateScript(scriptConfig.script, currentData);
              currentData[scriptConfig.outputField] = result;
              step.outputData = { [scriptConfig.outputField]: result };
              step.logMessages.push(`[SIMULATE] Script set ${scriptConfig.outputField} = ${result}`);
            }
            currentNodeId = this.getNextNodeId(node.id, definition, currentData);
            break;
          }

          case 'setValue': {
            const setConfig = node.config as any;
            currentData[setConfig.field] = setConfig.value;
            step.outputData = { [setConfig.field]: setConfig.value };
            step.logMessages.push(`[SIMULATE] Set ${setConfig.field} = ${JSON.stringify(setConfig.value)}`);
            currentNodeId = this.getNextNodeId(node.id, definition, currentData);
            break;
          }

          default:
            currentNodeId = this.getNextNodeId(node.id, definition, currentData);
        }
      } catch (err) {
        errors.push(`Error at node "${node.label}": ${err.message}`);
        step.action = 'completed';
        steps.push(step);
        break;
      }

      if (!currentNodeId) {
        errors.push(`No outgoing connection from node "${node.label}"`);
        break;
      }

      steps.push(step);
    }

    return {
      completed: false,
      finalData: currentData,
      finalStatus: errors.length > 0 ? 'cancelled' : 'deadlocked',
      steps,
      notificationsSent,
      errors,
    };
  }

  /**
   * Safely evaluate a script expression — restrict to math/string operations only
   * NEVER use eval() directly — always parse and evaluate safely
   */
  private evaluateScript(script: string, data: Record<string, any>): any {
    // Very restricted expression evaluator
    // Only allow: +, -, *, /, %, comparisons, and field references
    const ALLOWED = /^[0-9+\-*/().<>=!&|%\s\w"']+$/;
    if (!ALLOWED.test(script)) {
      throw new Error(`Script contains disallowed characters: ${script}`);
    }

    // Build a safe context — only expose formData and workflowData
    const ctx = { ...data, formData: data.formData, workflowData: data.workflowData };

    // Simple expression parser (not full eval)
    // This is a stub — use a proper expression parser library like filter-parser or expr-eval
    try {
      // WARNING: In production, use a safe expression evaluator library
      // This direct Function() usage is intentionally restricted but not fully sandboxed
      const fn = new Function('formData', 'workflowData', `return ${script}`);
      return fn(ctx.formData, ctx.workflowData);
    } catch {
      throw new Error(`Failed to evaluate script: ${script}`);
    }
  }

  private getNextNodeId(nodeId: string, definition: WorkflowDefinition, data: Record<string, any>): string {
    const conns = definition.connections.filter(c => c.sourceNodeId === nodeId);
    if (conns.length === 0) return '';
    // For nodes with no conditional branching, take the first connection
    return conns[0].targetNodeId;
  }
}
```

---

#### 2.4.2 Backend — Simulate Endpoint

```typescript
// backend/src/workflows/controllers/workflows.controller.ts (add simulate endpoint)

import { Controller, Post, Param, Body, Get } from '@nestjs/common';
import { SimulationEngineService, SimulationResult } from '../simulation-engine.service';

@Controller('workflows')
export class WorkflowsController {

  constructor(private readonly simulationEngine: SimulationEngineService) {}

  @Post(':id/simulate')
  async simulateWorkflow(
    @Param('id') workflowId: string,
    @Body() body: { initialData: Record<string, any>; maxSteps?: number; breakOnNodeIds?: string[] },
  ): Promise<SimulationResult> {
    // 1. Load workflow definition (published version)
    const workflow = await this.workflowService.findPublishedVersion(workflowId);
    if (!workflow) throw new Error(`Workflow ${workflowId} not found`);

    // 2. Run simulation
    const result = await this.simulationEngine.simulate(
      workflow.definition,
      body.initialData,
      { maxSteps: body.maxSteps, breakOnNodeIds: body.breakOnNodeIds },
    );

    return result;
  }
}
```

---

### 2.5 Form Version + In-Flight Instance Handling
**Priority:** Medium

#### 2.5.1 Backend — FormVersionService

```typescript
// backend/src/forms/services/form-version.service.ts

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface FormVersionSummary {
  version: number;
  createdAt: Date;
  createdBy: string;
  elementCount: number;
  hasBreakingChanges: boolean;
}

export interface VersionDiff {
  added: string[];      // field labels added
  removed: string[];    // field labels removed
  modified: { label: string; before: any; after: any }[];
  breakingChanges: string[]; // fields that could break in-flight instances
}

@Injectable()
export class FormVersionService {

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get all versions for a form
   */
  async getVersions(formId: string): Promise<FormVersionSummary[]> {
    const versions = await this.prisma.formVersion.findMany({
      where: { formId },
      orderBy: { version: 'desc' },
      select: { version: true, createdAt: true, createdBy: true, elements: true },
    });

    return versions.map(v => ({
      version: v.version,
      createdAt: v.createdAt,
      createdBy: v.createdBy,
      elementCount: (v.elements as any[]).length,
      hasBreakingChanges: false, // compute below
    }));
  }

  /**
   * Compute diff between two form versions
   */
  async computeDiff(formId: string, fromVersion: number, toVersion: number): Promise<VersionDiff> {
    const [from, to] = await Promise.all([
      this.prisma.formVersion.findFirst({ where: { formId, version: fromVersion } }),
      this.prisma.formVersion.findFirst({ where: { formId, version: toVersion } }),
    ]);

    if (!from || !to) throw new Error('Version not found');

    const fromElements = (from.elements as any[]) || [];
    const toElements = (to.elements as any[]) || [];

    const fromMap = new Map(fromElements.map(e => [e.id, e]));
    const toMap = new Map(toElements.map(e => [e.id, e]));

    const added = toElements.filter(e => !fromMap.has(e.id)).map(e => e.label);
    const removed = fromElements.filter(e => !toMap.has(e.id)).map(e => e.label);

    const modified: VersionDiff['modified'] = [];
    for (const toEl of toElements) {
      const fromEl = fromMap.get(toEl.id);
      if (fromEl) {
        const changes: any = {};
        // Check key fields that affect runtime behavior
        for (const key of ['type', 'required', 'label', 'options']) {
          if (JSON.stringify(fromEl[key]) !== JSON.stringify(toEl[key])) {
            changes[key] = { before: fromEl[key], after: toEl[key] };
          }
        }
        if (Object.keys(changes).length > 0) {
          modified.push({ label: toEl.label || toEl.id, before: changes, after: {} });
        }
      }
    }

    // Breaking changes = removed fields + modified required flag + modified type
    const breakingChanges = [
      ...removed,
      ...modified
        .filter(m => m.before['required'] || m.before['type'])
        .map(m => m.label),
    ];

    return { added, removed, modified, breakingChanges };
  }

  /**
   * Get count of in-flight instances using a specific form version
   */
  async getInFlightInstanceCount(formId: string, version: number): Promise<number> {
    const count = await this.prisma.formSubmission.count({
      where: {
        form: { id: formId },
        formVersion,
        workflowInstance: { status: 'active' },
      },
    });
    return count;
  }

  /**
   * Rollback form to a previous version
   * Does NOT affect in-flight instances — they keep their original version
   */
  async rollback(formId: string, targetVersion: number, userId: string): Promise<void> {
    const version = await this.prisma.formVersion.findFirst({
      where: { formId, version: targetVersion },
    });
    if (!version) throw new Error(`Version ${targetVersion} not found`);

    // Create a new version that copies the target version's elements
    const latest = await this.prisma.formVersion.findFirst({
      where: { formId },
      orderBy: { version: 'desc' },
    });

    await this.prisma.formVersion.create({
      data: {
        formId,
        version: (latest?.version ?? 0) + 1,
        elements: version.elements,
        createdBy: userId,
      },
    });
  }
}
```

---

### 2.6 Function Blocks (Replace Script Node)
**Priority:** Low

#### 2.6.1 FunctionRegistryService

```typescript
// backend/src/workflows/function-registry.service.ts

import { Injectable } from '@nestjs/common';

export type FunctionCategory = 'math' | 'text' | 'date' | 'logic' | 'number';

export interface FunctionDef {
  name: string;
  category: FunctionCategory;
  label: string;
  description: string;
  inputs: { name: string; label: string; type: 'number' | 'text' | 'date' | 'boolean' | 'any' }[];
  outputType: 'number' | 'text' | 'date' | 'boolean' | 'any';
  fn: (...args: any[]) => any;
}

@Injectable()
export class FunctionRegistryService {

  private readonly functions: Map<string, FunctionDef> = new Map();

  constructor() {
    this.registerMathFunctions();
    this.registerTextFunctions();
    this.registerDateFunctions();
    this.registerLogicFunctions();
    this.registerNumberFunctions();
  }

  private registerMathFunctions() {
    this.add({
      name: 'sum', category: 'math', label: 'Sum',
      description: 'Add all numbers together',
      inputs: [{ name: 'values', label: 'Numbers', type: 'any' }],
      outputType: 'number',
      fn: (...args: any[]) => args.flat().reduce((a: number, b: number) => a + (Number(b) || 0), 0),
    });
    this.add({
      name: 'average', category: 'math', label: 'Average',
      description: 'Calculate the average of numbers',
      inputs: [{ name: 'values', label: 'Numbers', type: 'any' }],
      outputType: 'number',
      fn: (...args: any[]) => {
        const vals = args.flat().map(Number).filter(n => !isNaN(n));
        return vals.length ? vals.reduce((a: number, b: number) => a + b, 0) / vals.length : 0;
      },
    });
    this.add({
      name: 'min', category: 'math', label: 'Min',
      description: 'Return the minimum value',
      inputs: [{ name: 'values', label: 'Numbers', type: 'any' }],
      outputType: 'number',
      fn: (...args: any[]) => Math.min(...args.flat().map(Number)),
    });
    this.add({
      name: 'max', category: 'math', label: 'Max',
      description: 'Return the maximum value',
      inputs: [{ name: 'values', label: 'Numbers', type: 'any' }],
      outputType: 'number',
      fn: (...args: any[]) => Math.max(...args.flat().map(Number)),
    });
    this.add({
      name: 'round', category: 'math', label: 'Round',
      description: 'Round to N decimal places',
      inputs: [
        { name: 'value', label: 'Value', type: 'number' },
        { name: 'decimals', label: 'Decimal Places', type: 'number' },
      ],
      outputType: 'number',
      fn: (value: number, decimals = 0) => Number(value.toFixed(decimals)),
    });
    this.add({
      name: 'ceiling', category: 'math', label: 'Ceiling',
      description: 'Round up to nearest integer',
      inputs: [{ name: 'value', label: 'Value', type: 'number' }],
      outputType: 'number',
      fn: (value: number) => Math.ceil(value),
    });
    this.add({
      name: 'floor', category: 'math', label: 'Floor',
      description: 'Round down to nearest integer',
      inputs: [{ name: 'value', label: 'Value', type: 'number' }],
      outputType: 'number',
      fn: (value: number) => Math.floor(value),
    });
    this.add({
      name: 'multiply', category: 'math', label: 'Multiply',
      description: 'Multiply two numbers',
      inputs: [
        { name: 'a', label: 'First', type: 'number' },
        { name: 'b', label: 'Second', type: 'number' },
      ],
      outputType: 'number',
      fn: (a: number, b: number) => a * b,
    });
    this.add({
      name: 'divide', category: 'math', label: 'Divide',
      description: 'Divide two numbers',
      inputs: [
        { name: 'a', label: 'Dividend', type: 'number' },
        { name: 'b', label: 'Divisor', type: 'number' },
      ],
      outputType: 'number',
      fn: (a: number, b: number) => (b !== 0 ? a / b : 0),
    });
  }

  private registerTextFunctions() {
    this.add({
      name: 'concatenate', category: 'text', label: 'Concatenate',
      description: 'Join text strings together',
      inputs: [
        { name: 'str1', label: 'String 1', type: 'text' },
        { name: 'str2', label: 'String 2', type: 'text' },
      ],
      outputType: 'text',
      fn: (...args: string[]) => args.join(''),
    });
    this.add({
      name: 'uppercase', category: 'text', label: 'Uppercase',
      description: 'Convert text to UPPERCASE',
      inputs: [{ name: 'value', label: 'Text', type: 'text' }],
      outputType: 'text',
      fn: (value: string) => String(value).toUpperCase(),
    });
    this.add({
      name: 'lowercase', category: 'text', label: 'Lowercase',
      description: 'Convert text to lowercase',
      inputs: [{ name: 'value', label: 'Text', type: 'text' }],
      outputType: 'text',
      fn: (value: string) => String(value).toLowerCase(),
    });
    this.add({
      name: 'trim', category: 'text', label: 'Trim',
      description: 'Remove leading and trailing whitespace',
      inputs: [{ name: 'value', label: 'Text', type: 'text' }],
      outputType: 'text',
      fn: (value: string) => String(value).trim(),
    });
    this.add({
      name: 'substring', category: 'text', label: 'Substring',
      description: 'Extract part of text',
      inputs: [
        { name: 'value', label: 'Text', type: 'text' },
        { name: 'start', label: 'Start Index', type: 'number' },
        { name: 'end', label: 'End Index (optional)', type: 'number' },
      ],
      outputType: 'text',
      fn: (value: string, start: number, end?: number) => value.substring(start, end),
    });
    this.add({
      name: 'replace', category: 'text', label: 'Replace',
      description: 'Replace text within a string',
      inputs: [
        { name: 'value', label: 'Text', type: 'text' },
        { name: 'search', label: 'Search For', type: 'text' },
        { name: 'replacement', label: 'Replace With', type: 'text' },
      ],
      outputType: 'text',
      fn: (value: string, search: string, replacement: string) => value.replace(search, replacement),
    });
  }

  private registerDateFunctions() {
    this.add({
      name: 'today', category: 'date', label: 'Today',
      description: "Return today's date (YYYY-MM-DD)",
      inputs: [],
      outputType: 'date',
      fn: () => new Date().toISOString().split('T')[0],
    });
    this.add({
      name: 'now', category: 'date', label: 'Now',
      description: "Return current date and time (ISO string)",
      inputs: [],
      outputType: 'date',
      fn: () => new Date().toISOString(),
    });
    this.add({
      name: 'dateDiff', category: 'date', label: 'Date Difference',
      description: 'Days between two dates',
      inputs: [
        { name: 'date1', label: 'Date 1', type: 'date' },
        { name: 'date2', label: 'Date 2', type: 'date' },
      ],
      outputType: 'number',
      fn: (date1: string, date2: string) => {
        const d1 = new Date(date1);
        const d2 = new Date(date2);
        return Math.floor((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24));
      },
    });
    this.add({
      name: 'addDays', category: 'date', label: 'Add Days',
      description: 'Add N days to a date',
      inputs: [
        { name: 'date', label: 'Date', type: 'date' },
        { name: 'days', label: 'Days to Add', type: 'number' },
      ],
      outputType: 'date',
      fn: (date: string, days: number) => {
        const d = new Date(date);
        d.setDate(d.getDate() + days);
        return d.toISOString().split('T')[0];
      },
    });
    this.add({
      name: 'formatDate', category: 'date', label: 'Format Date',
      description: 'Format a date as string',
      inputs: [
        { name: 'date', label: 'Date', type: 'date' },
        { name: 'format', label: 'Format', type: 'text' },
      ],
      outputType: 'text',
      fn: (date: string, format: string) => {
        const d = new Date(date);
        return format
          .replace('YYYY', String(d.getFullYear()))
          .replace('MM', String(d.getMonth() + 1).padStart(2, '0'))
          .replace('DD', String(d.getDate()).padStart(2, '0'));
      },
    });
  }

  private registerLogicFunctions() {
    this.add({
      name: 'ifThenElse', category: 'logic', label: 'If-Then-Else',
      description: 'Return one value if condition is true, another if false',
      inputs: [
        { name: 'condition', label: 'Condition', type: 'boolean' },
        { name: 'then', label: 'Then Value', type: 'any' },
        { name: 'else', label: 'Else Value', type: 'any' },
      ],
      outputType: 'any',
      fn: (condition: boolean, thenVal: any, elseVal: any) => condition ? thenVal : elseVal,
    });
    this.add({
      name: 'coalesce', category: 'logic', label: 'Coalesce',
      description: 'Return first non-null/non-empty value',
      inputs: [{ name: 'values', label: 'Values', type: 'any' }],
      outputType: 'any',
      fn: (...args: any[]) => args.find(v => v !== null && v !== undefined && v !== ''),
    });
    this.add({
      name: 'isEmpty', category: 'logic', label: 'Is Empty',
      description: 'Check if value is null, undefined, or empty string',
      inputs: [{ name: 'value', label: 'Value', type: 'any' }],
      outputType: 'boolean',
      fn: (value: any) => value === null || value === undefined || value === '',
    });
    this.add({
      name: 'isNotEmpty', category: 'logic', label: 'Is Not Empty',
      description: 'Check if value is not null/undefined/empty',
      inputs: [{ name: 'value', label: 'Value', type: 'any' }],
      outputType: 'boolean',
      fn: (value: any) => value !== null && value !== undefined && value !== '',
    });
  }

  private registerNumberFunctions() {
    this.add({
      name: 'currencyFormat', category: 'number', label: 'Currency Format',
      description: 'Format number as currency',
      inputs: [
        { name: 'value', label: 'Amount', type: 'number' },
        { name: 'currency', label: 'Currency Code', type: 'text' },
      ],
      outputType: 'text',
      fn: (value: number, currency = 'USD') => {
        return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(value);
      },
    });
    this.add({
      name: 'percentageFormat', category: 'number', label: 'Percentage Format',
      description: 'Format number as percentage',
      inputs: [{ name: 'value', label: 'Value (0-1)', type: 'number' }],
      outputType: 'text',
      fn: (value: number) => new Intl.NumberFormat('en-US', { style: 'percent' }).format(value),
    });
  }

  private add(def: FunctionDef) {
    this.functions.set(def.name, def);
  }

  getAll(): FunctionDef[] {
    return Array.from(this.functions.values());
  }

  getByCategory(category: FunctionCategory): FunctionDef[] {
    return this.getAll().filter(f => f.category === category);
  }

  get(name: string): FunctionDef | undefined {
    return this.functions.get(name);
  }

  /**
   * Execute a function by name with provided arguments
   */
  execute(name: string, args: Record<string, any>): any {
    const def = this.functions.get(name);
    if (!def) throw new Error(`Unknown function: ${name}`);
    const argValues = def.inputs.map(input => args[input.name]);
    return def.fn(...argValues);
  }
}
```

---

### 2.7 Frontend — SimulationPanelComponent

```typescript
// frontend/src/app/features/workflow-designer/components/simulation-panel/simulation-panel.component.ts

import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SimulationService, SimulationResult, SimulationStep } from '../../services/simulation.service';

@Component({
  selector: 'app-simulation-panel',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="simulation-panel" *ngIf="isOpen">
      <div class="panel-header">
        <h3>Workflow Simulation</h3>
        <button class="btn-close" (click)="close()">×</button>
      </div>

      <!-- Sample Data Input -->
      <div class="sample-data-section" *ngIf="!simulationResult">
        <h4>Initial Data</h4>
        <p class="helper-text">Enter sample data to simulate the workflow execution.</p>

        <div class="data-fields">
          <div class="field-row" *ngFor="let field of sampleFields">
            <label>{{ field.label }}</label>
            <ng-container [ngSwitch]="field.type">
              <input *ngSwitchCase="'number'" type="number" [(ngModel)]="sampleData[field.field]" />
              <input *ngSwitchCase="'text'" type="text" [(ngModel)]="sampleData[field.field]" />
              <input *ngSwitchCase="'date'" type="date" [(ngModel)]="sampleData[field.field]" />
              <select *ngSwitchCase="'dropdown'" [(ngModel)]="sampleData[field.field]">
                <option *ngFor="let opt of field.options" [value]="opt.value">{{ opt.label }}</option>
              </select>
              <input *ngSwitchCase="'yesNo'" type="checkbox" [(ngModel)]="sampleData[field.field]" />
            </ng-container>
          </div>
        </div>

        <div class="simulation-controls">
          <button class="btn-run" (click)="runSimulation()">▶ Run Simulation</button>
        </div>
      </div>

      <!-- Execution Trace -->
      <div class="trace-section" *ngIf="simulationResult">
        <div class="trace-header">
          <h4>Execution Trace</h4>
          <span class="trace-status" [class]="simulationResult.finalStatus">
            {{ simulationResult.finalStatus | uppercase }}
          </span>
        </div>

        <div class="trace-timeline">
          <div class="trace-step" *ngFor="let step of simulationResult.steps"
               [class.decision]="step.nodeType === 'condition'"
               [class.paused]="step.action === 'paused'"
               [class.branch]="step.action === 'branched'">

            <div class="step-number">{{ step.stepNumber }}</div>
            <div class="step-content">
              <div class="step-title">
                <span class="step-node-type">[{{ step.nodeType }}]</span>
                {{ step.nodeLabel }}
                <span class="step-action badge-{{ step.action }}">{{ step.action }}</span>
              </div>

              <div class="step-data" *ngIf="step.decision">
                <span class="decision-label">Decision:</span>
                <span [class.result-true]="step.decision.result" [class.result-false]="!step.decision.result">
                  {{ step.decision.result ? 'TRUE (→ yes path)' : 'FALSE (→ no path)' }}
                </span>
              </div>

              <div class="step-data" *ngIf="step.parallelBranches?.length">
                <span>Parallel branches: {{ step.parallelBranches.length }}</span>
              </div>

              <div class="step-logs" *ngIf="step.logMessages.length">
                <div class="log-line" *ngFor="let msg of step.logMessages">{{ msg }}</div>
              </div>
            </div>
          </div>
        </div>

        <!-- Final State -->
        <div class="final-state">
          <h4>Final State</h4>
          <pre>{{ simulationResult.finalData | json }}</pre>
        </div>

        <!-- Errors -->
        <div class="errors-section" *ngIf="simulationResult.errors.length">
          <h4>Errors</h4>
          <ul class="error-list">
            <li *ngFor="let err of simulationResult.errors">{{ err }}</li>
          </ul>
        </div>

        <!-- Notifications that would have been sent -->
        <div class="notifications-section" *ngIf="simulationResult.notificationsSent.length">
          <h4>Notifications (not actually sent)</h4>
          <ul class="notif-list">
            <li *ngFor="let n of simulationResult.notificationsSent">{{ n }}</li>
          </ul>
        </div>

        <div class="trace-footer">
          <button class="btn-reset" (click)="reset()">← New Simulation</button>
          <button class="btn-step" (click)="runSimulation()">🔄 Re-run</button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .simulation-panel { position: fixed; right: 0; top: 0; width: 480px; height: 100vh; background: #fff; border-left: 1px solid #ddd; box-shadow: -4px 0 12px rgba(0,0,0,0.1); overflow-y: auto; z-index: 1000; }
    .panel-header { display: flex; justify-content: space-between; align-items: center; padding: 16px; border-bottom: 1px solid #eee; }
    .btn-close { background: none; border: none; font-size: 24px; cursor: pointer; }
    .sample-data-section { padding: 16px; }
    .data-fields { display: flex; flex-direction: column; gap: 8px; margin: 16px 0; }
    .field-row { display: flex; align-items: center; gap: 8px; }
    .field-row label { flex: 0 0 120px; font-weight: 500; }
    .field-row input, .field-row select { flex: 1; padding: 6px 8px; border: 1px solid #ccc; border-radius: 4px; }
    .btn-run { background: #0066cc; color: #fff; border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer; font-size: 14px; }
    .trace-section { padding: 16px; }
    .trace-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
    .trace-status { padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold; }
    .trace-status.completed { background: #d4edda; color: #155724; }
    .trace-status.cancelled { background: #fff3cd; color: #856404; }
    .trace-status.deadlocked { background: #f8d7da; color: #721c24; }
    .trace-timeline { border-left: 2px solid #ddd; margin-left: 8px; padding-left: 16px; }
    .trace-step { margin-bottom: 16px; position: relative; }
    .step-number { position: absolute; left: -28px; top: 0; width: 20px; height: 20px; background: #0066cc; color: #fff; border-radius: 50%; font-size: 11px; display: flex; align-items: center; justify-content: center; }
    .step-title { font-weight: 500; }
    .step-node-type { font-size: 11px; color: #888; font-family: monospace; }
    .step-action { font-size: 11px; padding: 2px 6px; border-radius: 3px; margin-left: 8px; }
    .badge-entered { background: #e3f2fd; }
    .badge-paused { background: #fff3cd; }
    .badge-completed { background: #d4edda; }
    .badge-branched { background: #e8daef; }
    .badge-decided { background: #f0e6ff; }
    .step-data { margin-top: 4px; font-size: 13px; }
    .log-line { font-family: monospace; font-size: 12px; color: #555; background: #f5f5f5; padding: 2px 6px; border-radius: 3px; margin-top: 2px; }
    .final-state { margin-top: 16px; }
    .final-state pre { background: #f5f5f5; padding: 8px; border-radius: 4px; font-size: 12px; max-height: 200px; overflow-y: auto; }
    .error-list, .notif-list { padding-left: 20px; font-size: 13px; }
    .error-list li { color: #dc3545; }
    .trace-footer { display: flex; gap: 8px; margin-top: 16px; }
    .btn-reset, .btn-step { padding: 8px 16px; border-radius: 4px; cursor: pointer; }
  `]
})
export class SimulationPanelComponent implements OnInit {
  @Input() isOpen = false;
  @Input() workflowId: string;
  @Output() closePanel = new EventEmitter<void>();

  simulationResult: SimulationResult | null = null;
  sampleFields: { field: string; label: string; type: string; options?: any[] }[] = [];
  sampleData: Record<string, any> = {};

  constructor(private simulationService: SimulationService) {}

  ngOnInit() {
    this.loadSampleFields();
  }

  loadSampleFields() {
    // TODO: Load from workflow's form definition
    this.sampleFields = [
      { field: 'formData.amount', label: 'Amount', type: 'number' },
      { field: 'formData.department', label: 'Department', type: 'dropdown', options: [{ value: 'IT', label: 'IT' }, { value: 'HR', label: 'HR' }] },
      { field: 'formData.description', label: 'Description', type: 'text' },
      { field: 'formData.urgent', label: 'Is Urgent', type: 'yesNo' },
    ];
    this.sampleData = {
      'formData.amount': 500,
      'formData.department': 'IT',
      'formData.description': 'Sample request',
      'formData.urgent': false,
    };
  }

  async runSimulation() {
    try {
      this.simulationResult = await this.simulationService.simulate(this.workflowId, this.sampleData);
    } catch (err) {
      console.error('Simulation failed:', err);
    }
  }

  reset() {
    this.simulationResult = null;
  }

  close() {
    this.closePanel.emit();
  }
}
```

---

### 2.8 Frontend — SimulationService

```typescript
// frontend/src/app/features/workflow-designer/services/simulation.service.ts

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface SimulationResult {
  completed: boolean;
  finalData: Record<string, any>;
  finalStatus: 'completed' | 'rejected' | 'cancelled' | 'deadlocked';
  steps: SimulationStep[];
  notificationsSent: string[];
  errors: string[];
}

export interface SimulationStep {
  stepNumber: number;
  timestamp: string;
  nodeId: string;
  nodeLabel: string;
  nodeType: string;
  action: string;
  inputData: Record<string, any>;
  outputData?: Record<string, any>;
  decision?: { condition: string; result: boolean };
  parallelBranches?: string[];
  logMessages: string[];
}

@Injectable({ providedIn: 'root' })
export class SimulationService {

  constructor(private http: HttpClient) {}

  simulate(
    workflowId: string,
    initialData: Record<string, any>,
    options?: { maxSteps?: number; breakOnNodeIds?: string[] },
  ): Observable<SimulationResult> {
    return this.http.post<SimulationResult>(`/api/workflows/${workflowId}/simulate`, {
      initialData,
      ...options,
    });
  }
}
```

---

## 3. Implementation Phases

### Phase 1 — Foundation (Weeks 1–2)
- [x] Visual Condition Builder (`ConditionBuilderComponent` + `ConditionEvaluatorService`)
- [x] Workflow Validator (`DeadlockDetectionService` frontend + `WorkflowValidatorService` backend)
- [x] Basic Simulation Mode (`SimulationPanelComponent` + `SimulationEngineService` + `/simulate` endpoint)

### Phase 2 — UX Polish (Weeks 3–4)
- [ ] Parallel + Join guided setup wizard
- [ ] Sub-workflow visual data mapper (`SubWorkflowMapperComponent`)
- [ ] Simulation trace and breakpoints

### Phase 3 — Production Hardening (Weeks 5–6)
- [ ] Form version diff view (`FormVersionService.computeDiff`)
- [ ] Instance migration service
- [ ] Function block library (`FunctionRegistryService`)

---

## 4. Out of Scope

- BPMN standard compliance
- Mobile-optimized workflow designer
- Workflow analytics dashboards
- External system integration

---

## 5. Success Metrics

| Improvement | Metric |
|-------------|--------|
| Visual Condition Builder | % of conditions built with builder vs. raw expression |
| Parallel/Join UX | Reduction in workflow deadlocks in production |
| Sub-workflow Mapper | % of sub-workflow invocations using simplified mode |
| Simulation Mode | % of workflows tested via simulation before first deployment |
| Version Handling | % of admins aware of in-flight instance impact before editing |

---

## Related Pages

- [[Overview]] — Project overview
- [[Workflow Engine]] — Current execution model
- [[Form Builder]] — Current element types
- [[Technical Architecture]] — System design
