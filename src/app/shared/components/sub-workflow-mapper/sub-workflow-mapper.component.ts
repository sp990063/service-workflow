import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

export enum SubWorkflowMappingMode {
  INHERIT = 'inherit',
  EXTRACT = 'extract',
  TRANSFORM = 'transform',
}

export interface FieldMapping {
  sourceField: string;
  targetField: string;
  transform?: string;
}

export interface SubWorkflowMappingConfig {
  mode: SubWorkflowMappingMode;
  mappings?: FieldMapping[];
  filterFields?: string[];
}

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
      <div *ngIf="config?.mode === 'inherit'" class="inherit-panel">
        <p>All form fields will be passed to the sub-workflow.</p>
        <div *ngIf="config?.filterFields?.length" class="filter-info">
          <strong>Only passing:</strong> {{ getFilterFieldsDisplay() }}
          <button class="btn-edit" (click)="editFilter()">Edit</button>
        </div>
        <div *ngIf="!config?.filterFields?.length">
          <button class="btn-secondary" (click)="enableFilter()">Limit fields (optional)</button>
        </div>
      </div>

      <!-- Extract / Transform Mode: Field Mapping Table -->
      <div *ngIf="config?.mode === 'extract' || config?.mode === 'transform'" class="mapping-table">
        <div class="mapping-header-row">
          <div class="col-source">Parent Field</div>
          <div class="col-arrow"></div>
          <div class="col-target">Sub-Workflow Input</div>
          <div class="col-transform" *ngIf="config?.mode === 'transform'">Transform</div>
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
          <input *ngIf="config?.mode === 'transform'" type="text"
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
  @Input() config!: SubWorkflowMappingConfig;
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

  setMode(mode: string) {
    this.config!.mode = mode as SubWorkflowMappingMode;
    if (mode === 'inherit') {
      this.config!.mappings = undefined;
    }
  }

  addMapping() {
    this.mappingLines.push({ sourceField: '', targetField: '', compatible: false });
    this.config!.mappings = this.toMappings();
  }

  removeMapping(index: number) {
    this.mappingLines.splice(index, 1);
    this.config!.mappings = this.toMappings();
  }

  onSourceChange(line: MappingLine) {
    line.compatible = this.checkCompatibility(line.sourceField, line.targetField);
    this.config!.mappings = this.toMappings();
  }

  onTargetChange(line: MappingLine) {
    line.compatible = this.checkCompatibility(line.sourceField, line.targetField);
    this.config!.mappings = this.toMappings();
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
    this.config!.mappings = this.toMappings();
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
    this.config!.mappings = this.toMappings();
  }

  enableFilter() {
    // Enable field filtering for inherit mode
    this.config!.filterFields = [];
  }

  editFilter() {
    // TODO: Implement filter editor
  }

  getFilterFieldsDisplay(): string {
    return this.config?.filterFields?.join(', ') ?? '';
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