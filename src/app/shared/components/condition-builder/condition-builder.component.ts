import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

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
  field: string;
  fieldType: FieldType;
  fieldLabel: string;
  operator: ConditionOperator;
  value: any;
  valueEnd?: any;
}

export interface ConditionGroup {
  id: string;
  combinator: 'AND' | 'OR';
  rules: ConditionRule[];
  groups?: ConditionGroup[];
}

export interface ConditionConfig {
  rootGroup: ConditionGroup;
}

interface FieldOption {
  field: string;
  label: string;
  type: FieldType;
  options?: { value: string; label: string }[];
}

interface OperatorOption {
  operator: ConditionOperator;
  label: string;
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

      <div class="condition-group">
        <div class="combinator-toggle">
          <label>Match</label>
          <select [(ngModel)]="config.rootGroup.combinator">
            <option value="AND">ALL conditions (AND)</option>
            <option value="OR">ANY condition (OR)</option>
          </select>
        </div>

        <div class="rules-list">
          @for (rule of config.rootGroup.rules; track rule.id; let i = $index) {
            <div class="rule-card">
              <div class="rule-row">
                <select [(ngModel)]="rule.field" (ngModelChange)="onFieldChange(rule)">
                  <option value="">-- Select field --</option>
                  @for (f of availableFields; track f.field) {
                    <option [value]="f.field">{{ f.label }}</option>
                  }
                </select>

                <select [(ngModel)]="rule.operator">
                  @for (op of getOperators(rule.fieldType); track op.operator) {
                    <option [value]="op.operator">{{ op.label }}</option>
                  }
                </select>

                @if (!isNoValueOperator(rule.operator)) {
                  <ng-container [ngSwitch]="getFieldType(rule.field)?.type">
                    <input *ngSwitchCase="'number'" type="number" [(ngModel)]="rule.value" />
                    <input *ngSwitchCase="'text'" type="text" [(ngModel)]="rule.value" />
                    <input *ngSwitchCase="'date'" type="date" [(ngModel)]="rule.value" />
                    <select *ngSwitchCase="'dropdown'" [(ngModel)]="rule.value">
                      @for (opt of getFieldType(rule.field)?.options; track opt.value) {
                        <option [value]="opt.value">{{ opt.label }}</option>
                      }
                    </select>
                    @if (rule.operator === 'between') {
                      <span class="between-separator">and</span>
                      <input type="number" [(ngModel)]="rule.valueEnd" placeholder="End" />
                    }
                  </ng-container>
                }

                <button class="btn-remove" (click)="removeRule(i)">×</button>
              </div>
            </div>
          }
        </div>

        @if (config.rootGroup.rules.length === 0) {
          <p class="no-rules">No conditions yet. Click "Add Rule" to start.</p>
        }
      </div>

      <div class="condition-preview">
        <strong>Preview:</strong> {{ getHumanReadable() }}
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
    .builder-header h4 { margin: 0; }
    .btn-add-rule { background: #0066cc; color: #fff; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size: 13px; }
    .condition-group { background: #f9f9f9; border-radius: 6px; padding: 12px; }
    .combinator-toggle { display: flex; align-items: center; gap: 8px; margin-bottom: 12px; }
    .combinator-toggle label { font-weight: 500; font-size: 14px; }
    .combinator-toggle select { padding: 6px 8px; border: 1px solid #ccc; border-radius: 4px; }
    .rules-list { display: flex; flex-direction: column; gap: 8px; }
    .rule-card { background: #fff; border: 1px solid #e0e0e0; border-radius: 6px; padding: 8px; }
    .rule-row { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
    .rule-row select, .rule-row input { padding: 6px 8px; border: 1px solid #ccc; border-radius: 4px; font-size: 13px; }
    .rule-row input[type="number"] { width: 100px; }
    .rule-row input[type="text"] { width: 120px; }
    .rule-row select { min-width: 120px; }
    .btn-remove { background: #ff4444; color: #fff; border: none; border-radius: 50%; width: 24px; height: 24px; cursor: pointer; font-size: 14px; line-height: 1; }
    .between-separator { color: #666; font-size: 12px; }
    .no-rules { color: #888; font-size: 13px; text-align: center; padding: 16px; margin: 0; }
    .condition-preview { margin-top: 12px; padding: 8px 12px; background: #e8f4ff; border-radius: 4px; font-size: 13px; }
    .builder-footer { display: flex; justify-content: flex-end; gap: 8px; margin-top: 16px; }
    .btn-save { background: #0066cc; color: #fff; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; }
    .btn-cancel { background: #f0f0f0; border: 1px solid #ccc; padding: 8px 16px; border-radius: 4px; cursor: pointer; }
  `]
})
export class ConditionBuilderComponent implements OnInit {
  @Input() config!: ConditionConfig;
  @Input() availableFields: FieldOption[] = [];
  @Output() configChange = new EventEmitter<ConditionConfig>();
  @Output() save = new EventEmitter<ConditionConfig>();
  @Output() cancel = new EventEmitter<void>();

  ngOnInit() {
    if (!this.config?.rootGroup) {
      this.config = { rootGroup: { id: 'group_1', combinator: 'AND', rules: [], groups: [] } };
    }
    if (!this.availableFields || this.availableFields.length === 0) {
      this.availableFields = this.getDefaultFields();
    }
  }

  private getDefaultFields(): FieldOption[] {
    return [
      { field: 'formData.amount', label: 'Amount', type: FieldType.NUMBER },
      { field: 'formData.department', label: 'Department', type: FieldType.DROPDOWN, options: [{ value: 'IT', label: 'IT' }, { value: 'HR', label: 'HR' }, { value: 'Finance', label: 'Finance' }] },
      { field: 'formData.priority', label: 'Priority', type: FieldType.DROPDOWN, options: [{ value: 'Low', label: 'Low' }, { value: 'Medium', label: 'Medium' }, { value: 'High', label: 'High' }] },
      { field: 'formData.description', label: 'Description', type: FieldType.TEXT },
      { field: 'formData.startDate', label: 'Start Date', type: FieldType.DATE },
      { field: 'formData.urgent', label: 'Is Urgent', type: FieldType.YES_NO },
    ];
  }

  addRule() {
    const firstField = this.availableFields[0];
    const rule: ConditionRule = {
      id: `rule_${Date.now()}`,
      field: firstField?.field || '',
      fieldType: firstField?.type || FieldType.TEXT,
      fieldLabel: firstField?.label || '',
      operator: ConditionOperator.EQ,
      value: null,
    };
    this.config.rootGroup.rules.push(rule);
  }

  removeRule(index: number) {
    this.config.rootGroup.rules.splice(index, 1);
  }

  onFieldChange(rule: ConditionRule) {
    const fieldDef = this.availableFields.find(f => f.field === rule.field);
    if (fieldDef) {
      rule.fieldType = fieldDef.type;
      rule.fieldLabel = fieldDef.label;
      rule.value = null;
      rule.valueEnd = undefined;
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
      [ConditionOperator.IS_EMPTY]: 'is empty',
      [ConditionOperator.IS_NOT_EMPTY]: 'is not empty',
    };

    const fieldOperators = this.getOperatorsForFieldType(fieldType);
    return fieldOperators.map(op => ({ operator: op, label: operatorLabels[op] || op }));
  }

  private getOperatorsForFieldType(fieldType: FieldType): ConditionOperator[] {
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

  getFieldType(field: string): FieldOption | undefined {
    return this.availableFields.find(f => f.field === field);
  }

  isNoValueOperator(op: ConditionOperator): boolean {
    return [ConditionOperator.IS_EMPTY, ConditionOperator.IS_NOT_EMPTY].includes(op);
  }

  getHumanReadable(): string {
    if (!this.config?.rootGroup?.rules?.length) {
      return '(no conditions)';
    }

    const ruleToStr = (r: ConditionRule) => {
      const op = this.getOperators(r.fieldType).find(o => o.operator === r.operator)?.label || r.operator;
      const val = r.value !== null && r.value !== undefined ? ` ${JSON.stringify(r.value)}` : '';
      const valEnd = r.valueEnd !== undefined ? ` and ${JSON.stringify(r.valueEnd)}` : '';
      return `${r.fieldLabel} ${op}${val}${valEnd}`;
    };

    const group = this.config.rootGroup;
    const parts = group.rules.map(ruleToStr);
    return parts.join(` ${group.combinator} `);
  }

  onCancel() {
    this.cancel.emit();
  }

  onSave() {
    this.save.emit(this.config);
  }
}