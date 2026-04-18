import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';

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

export interface SimulationResult {
  completed: boolean;
  finalData: Record<string, any>;
  finalStatus: 'completed' | 'rejected' | 'cancelled' | 'deadlocked';
  steps: SimulationStep[];
  notificationsSent: string[];
  errors: string[];
}

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

      <div class="panel-body">
        @if (!simulationResult) {
          <div class="sample-data-section">
            <h4>Initial Data</h4>
            <p class="helper-text">Enter sample data to simulate the workflow execution.</p>

            <div class="data-fields">
              @for (field of sampleFields; track field.field) {
                <div class="field-row">
                  <label>{{ field.label }}</label>
                  <ng-container [ngSwitch]="field.type">
                    <input *ngSwitchCase="'number'" type="number" [(ngModel)]="sampleData[field.field]" />
                    <input *ngSwitchCase="'text'" type="text" [(ngModel)]="sampleData[field.field]" />
                    <input *ngSwitchCase="'date'" type="date" [(ngModel)]="sampleData[field.field]" />
                    <select *ngSwitchCase="'dropdown'" [(ngModel)]="sampleData[field.field]">
                      @for (opt of field.options; track opt.value) {
                        <option [value]="opt.value">{{ opt.label }}</option>
                      }
                    </select>
                    <input *ngSwitchCase="'yesNo'" type="checkbox" [(ngModel)]="sampleData[field.field]" />
                  </ng-container>
                </div>
              }
            </div>

            <div class="simulation-controls">
              <button class="btn-run" (click)="runSimulation()" [disabled]="isLoading">
                {{ isLoading ? 'Running...' : '▶ Run Simulation' }}
              </button>
            </div>
          </div>
        } @else {
          <div class="trace-section">
            <div class="trace-header">
              <h4>Execution Trace</h4>
              <span class="trace-status" [class]="simulationResult.finalStatus">
                {{ simulationResult.finalStatus | uppercase }}
              </span>
            </div>

            <div class="trace-timeline">
              @for (step of simulationResult.steps; track step.stepNumber) {
                <div class="trace-step" [class.decision]="step.nodeType === 'condition'"
                     [class.paused]="step.action === 'paused'"
                     [class.branch]="step.action === 'branched'">
                  <div class="step-number">{{ step.stepNumber }}</div>
                  <div class="step-content">
                    <div class="step-title">
                      <span class="step-node-type">[{{ step.nodeType }}]</span>
                      {{ step.nodeLabel }}
                      <span class="step-action badge-{{ step.action }}">{{ step.action }}</span>
                    </div>

                    @if (step.decision) {
                      <div class="step-data">
                        <span class="decision-label">Decision:</span>
                        <span [class.result-true]="step.decision.result" [class.result-false]="!step.decision.result">
                          {{ step.decision.result ? 'TRUE (→ yes path)' : 'FALSE (→ no path)' }}
                        </span>
                      </div>
                    }

                    @if (step.parallelBranches?.length) {
                      <div class="step-data">
                        <span>Parallel branches: {{ step.parallelBranches?.length }}</span>
                      </div>
                    }

                    @for (msg of step.logMessages; track msg) {
                      <div class="log-line">{{ msg }}</div>
                    }
                  </div>
                </div>
              }
            </div>

            <div class="final-state">
              <h4>Final State</h4>
              <pre>{{ simulationResult.finalData | json }}</pre>
            </div>

            @if (simulationResult.errors.length) {
              <div class="errors-section">
                <h4>Errors</h4>
                <ul class="error-list">
                  @for (err of simulationResult.errors; track err) {
                    <li>{{ err }}</li>
                  }
                </ul>
              </div>
            }

            <div class="trace-footer">
              <button class="btn-reset" (click)="reset()">← New Simulation</button>
              <button class="btn-step" (click)="runSimulation()">🔄 Re-run</button>
            </div>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .simulation-panel { position: fixed; right: 0; top: 0; width: 480px; height: 100vh; background: #fff; border-left: 1px solid #ddd; box-shadow: -4px 0 12px rgba(0,0,0,0.1); overflow-y: auto; z-index: 1000; display: flex; flex-direction: column; }
    .panel-header { display: flex; justify-content: space-between; align-items: center; padding: 16px; border-bottom: 1px solid #eee; }
    .panel-header h3 { margin: 0; }
    .btn-close { background: none; border: none; font-size: 24px; cursor: pointer; }
    .panel-body { flex: 1; overflow-y: auto; padding: 16px; }
    .sample-data-section h4 { margin: 0 0 8px 0; }
    .helper-text { color: #666; font-size: 13px; margin-bottom: 16px; }
    .data-fields { display: flex; flex-direction: column; gap: 8px; margin-bottom: 16px; }
    .field-row { display: flex; align-items: center; gap: 8px; }
    .field-row label { flex: 0 0 120px; font-weight: 500; font-size: 13px; }
    .field-row input, .field-row select { flex: 1; padding: 6px 8px; border: 1px solid #ccc; border-radius: 4px; font-size: 13px; }
    .btn-run { background: #0066cc; color: #fff; border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer; font-size: 14px; }
    .btn-run:disabled { background: #ccc; cursor: not-allowed; }
    .trace-section { }
    .trace-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
    .trace-header h4 { margin: 0; }
    .trace-status { padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold; }
    .trace-status.completed { background: #d4edda; color: #155724; }
    .trace-status.cancelled { background: #fff3cd; color: #856404; }
    .trace-status.deadlocked { background: #f8d7da; color: #721c24; }
    .trace-timeline { border-left: 2px solid #ddd; margin-left: 8px; padding-left: 16px; margin-bottom: 16px; }
    .trace-step { margin-bottom: 16px; position: relative; }
    .step-number { position: absolute; left: -28px; top: 0; width: 20px; height: 20px; background: #0066cc; color: #fff; border-radius: 50%; font-size: 11px; display: flex; align-items: center; justify-content: center; }
    .step-title { font-weight: 500; font-size: 13px; }
    .step-node-type { font-size: 11px; color: #888; font-family: monospace; }
    .step-action { font-size: 11px; padding: 2px 6px; border-radius: 3px; margin-left: 8px; }
    .badge-entered { background: #e3f2fd; }
    .badge-paused { background: #fff3cd; }
    .badge-completed { background: #d4edda; }
    .badge-branched { background: #e8daef; }
    .badge-decided { background: #f0e6ff; }
    .step-data { margin-top: 4px; font-size: 13px; }
    .result-true { color: green; font-weight: 500; }
    .result-false { color: red; font-weight: 500; }
    .log-line { font-family: monospace; font-size: 12px; color: #555; background: #f5f5f5; padding: 2px 6px; border-radius: 3px; margin-top: 2px; }
    .final-state { margin-top: 16px; }
    .final-state h4 { margin: 0 0 8px 0; }
    .final-state pre { background: #f5f5f5; padding: 8px; border-radius: 4px; font-size: 12px; max-height: 200px; overflow-y: auto; margin: 0; }
    .errors-section { margin-top: 16px; }
    .errors-section h4 { color: #dc3545; margin: 0 0 8px 0; }
    .error-list { padding-left: 20px; font-size: 13px; color: #dc3545; margin: 0; }
    .trace-footer { display: flex; gap: 8px; margin-top: 16px; }
    .btn-reset, .btn-step { padding: 8px 16px; border-radius: 4px; cursor: pointer; border: 1px solid #ccc; background: #f5f5f5; }
  `]
})
export class SimulationPanelComponent implements OnInit {
  @Input() isOpen = false;
  @Input() workflowId?: string;
  @Output() closePanel = new EventEmitter<void>();

  simulationResult: SimulationResult | null = null;
  isLoading = false;

  sampleFields: { field: string; label: string; type: string; options?: { value: string; label: string }[] }[] = [];
  sampleData: Record<string, any> = {};

  constructor(private http: HttpClient) {}

  ngOnInit() {
    this.loadSampleFields();
  }

  loadSampleFields() {
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
    this.isLoading = true;
    try {
      this.simulationResult = await this.http.post<SimulationResult>(
        `/api/workflows/${this.workflowId}/simulate`,
        { initialData: this.sampleData }
      ).toPromise() || null;
    } catch (err) {
      console.error('Simulation failed:', err);
      this.simulationResult = {
        completed: false,
        finalData: {},
        finalStatus: 'cancelled',
        steps: [],
        notificationsSent: [],
        errors: ['Simulation failed: ' + (err as Error).message],
      };
    } finally {
      this.isLoading = false;
    }
  }

  reset() {
    this.simulationResult = null;
  }

  close() {
    this.closePanel.emit();
  }
}