import { Component, OnInit, signal, ChangeDetectorRef, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { WorkflowService } from '../../core/services/workflow.service';
import { AuthService } from '../../core/services/auth.service';
import { FormService } from '../../core/services/form.service';
import { Workflow, WorkflowNode, Form } from '../../core/models';

interface WorkflowInstance {
  id: string;
  workflowId: string;
  workflowName: string;
  currentNodeId: string | null;
  status: 'PENDING' | 'IN_PROGRESS' | 'WAITING_FOR_CHILD' | 'COMPLETED';
  formData: Record<string, any>;
  history: Array<{ nodeId: string; action: string; timestamp: Date }>;
  childInstanceId?: string;  // Child workflow instance if waiting
  parentInstanceId?: string; // Parent instance if this is a child
  parallelApprovals?: ParallelApprovalState; // Track parallel approvals
}

interface ParallelApprovalState {
  parallelNodeId: string;
  requiredApprovers: string[];
  approvals: string[]; // List of approvers who have approved
  status: 'PENDING' | 'ALL_APPROVED' | 'REJECTED';
}

@Component({
  selector: 'app-workflow-player',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="workflow-player">
      @if (loading()) {
        <div class="loading">Loading workflow...</div>
      } @else if (!workflow()) {
        <div class="not-found">
          <h2>Workflow Not Found</h2>
          <p>The workflow you're looking for doesn't exist.</p>
          <a routerLink="/workflows" class="btn btn-secondary">Back to Workflows</a>
        </div>
      } @else {
        <header class="player-header">
          <div>
            <h1>{{ workflow()!.name }}</h1>
            <p>Follow the steps to complete this workflow</p>
          </div>
          <a routerLink="/workflows" class="btn btn-secondary">Back to Workflows</a>
        </header>

        <div class="player-body">
          <!-- Progress Steps -->
          <div class="progress-steps">
            <h3>Workflow Progress</h3>
            <div class="steps-list">
              @for (node of workflow()!.nodes; track node.id; let i = $index) {
                <div
                  class="step-item"
                  [class.active]="isCurrentStep(node.id)"
                  [class.completed]="isStepCompleted(node.id)"
                  [class.pending]="isStepPending(node.id)"
                >
                  <div class="step-number">
                    @if (isStepCompleted(node.id)) {
                      ✓
                    } @else {
                      {{ i + 1 }}
                    }
                  </div>
                  <div class="step-info">
                    <span class="step-type">{{ getNodeTypeLabel(node.type) }}</span>
                    <span class="step-label">{{ node.data['label'] || node.type }}</span>
                  </div>
                </div>
              }
            </div>
          </div>

          <!-- Current Step Content -->
          <div class="step-content">
            @if (instance()?.status === 'COMPLETED') {
              <!-- Workflow Completed -->
              <div class="completed-section">
                <div class="completed-icon">✓</div>
                <h2>Workflow Completed!</h2>
                <p>You have successfully completed all steps in this workflow.</p>
                <div class="summary">
                  <h4>Summary</h4>
                  <ul>
                    @for (h of instance()?.history || []; track h.timestamp) {
                      <li>{{ h.action }} - {{ h.timestamp | date:'short' }}</li>
                    }
                  </ul>
                </div>
                <a routerLink="/workflows" class="btn btn-primary">Back to Workflows</a>
              </div>
            } @else if (!instance()?.currentNodeId) {
              <!-- Start Workflow -->
              <div class="start-section">
                <div class="start-icon">▶</div>
                <h2>Ready to Start</h2>
                <p>This workflow has {{ workflow()!.nodes.length }} steps. Click the button below to begin.</p>
                <button class="btn btn-primary btn-lg" (click)="startWorkflow()">
                  Start Workflow
                </button>
              </div>
            } @else {
              <!-- Active Step -->
              @if (currentNode()) {
                <div class="active-step">
                  <div class="step-header">
                    <span class="step-badge" [style.background]="getNodeColor(currentNode()!.type)">
                      {{ getNodeTypeLabel(currentNode()!.type) }}
                    </span>
                    <h2>{{ currentNode()!.data['label'] || currentNode()!.type }}</h2>
                  </div>

                  @if (currentNode()!.data['description']) {
                    <p class="step-description">{{ currentNode()!.data['description'] }}</p>
                  }

                  <!-- Task: Show associated form if available -->
                  @if (currentNode()!.type === 'task') {
                    <div class="task-form">
                      <h4>Task Details</h4>
                      <div class="form-field">
                        <label>Task Instructions</label>
                        <textarea disabled>{{ currentNode()!.data['description'] || 'Complete this task as described.' }}</textarea>
                      </div>
                      @if (currentNode()!.data['formId']) {
                        <a [routerLink]="['/form-fill', currentNode()!.data['formId']]" class="btn btn-secondary">
                          Open Form
                        </a>
                      }
                    </div>
                  }

                  <!-- Approval: Show approval options -->
                  @if (currentNode()!.type === 'approval') {
                    <div class="approval-section">
                      <h4>Approval Required</h4>
                      <p>Please review and approve or reject this request.</p>
                      @if (currentNode()!.data['formId']) {
                        <a [routerLink]="['/form-fill', currentNode()!.data['formId']]" class="btn btn-secondary">
                          Review Form
                        </a>
                      }
                      <div class="approval-actions">
                        <button class="btn btn-success" (click)="approve()">✓ Approve</button>
                        <button class="btn btn-danger" (click)="reject()">✗ Reject</button>
                      </div>
                    </div>
                  }

                  <!-- Condition: Show path options -->
                  @if (currentNode()!.type === 'condition') {
                    <div class="condition-section">
                      <h4>Condition Check</h4>
                      <p>Field: <strong>{{ currentNode()!.data['field'] || 'N/A' }}</strong></p>
                      <p>Operator: <strong>{{ currentNode()!.data['operator'] || 'equals' }}</strong></p>
                      <p>Value: <strong>{{ currentNode()!.data['value'] || 'N/A' }}</strong></p>
                      @if (getConditionFieldValue()) {
                        <p class="form-value">Current Value: <code>{{ getConditionFieldValue() }}</code></p>
                      }
                      <p class="condition-note">Based on the form data, the workflow will proceed to the appropriate path.</p>
                      <button class="btn btn-primary" (click)="proceedFromCondition()">Evaluate Condition</button>
                    </div>
                  }

                  <!-- Form: Show inline form fields -->
                  @if (currentNode()!.type === 'form') {
                    <div class="form-section">
                      <h4>Form</h4>
                      @if (currentForm()) {
                        <p class="form-description">{{ currentNode()!.data['description'] || 'Please fill out the form below.' }}</p>
                        <div class="form-fields">
                          @for (element of currentForm()!.elements; track element.id; let i = $index) {
                            <div class="form-field">
                              <label [for]="'field-' + i">
                                {{ element.label }}
                                @if (element.required) { <span class="required">*</span> }
                              </label>
                              @switch (element.type) {
                                @case ('text') {
                                  <input 
                                    type="text" 
                                    [id]="'field-' + i"
                                    [(ngModel)]="formData()[element.id]"
                                    [name]="'field-' + element.id"
                                    [placeholder]="element.placeholder || ''"
                                    [required]="element.required"
                                  >
                                }
                                @case ('number') {
                                  <input 
                                    type="number" 
                                    [id]="'field-' + i"
                                    [(ngModel)]="formData()[element.id]"
                                    [name]="'field-' + element.id"
                                    [placeholder]="element.placeholder || ''"
                                    [required]="element.required"
                                  >
                                }
                                @case ('textarea') {
                                  <textarea 
                                    [id]="'field-' + i"
                                    [(ngModel)]="formData()[element.id]"
                                    [name]="'field-' + element.id"
                                    [placeholder]="element.placeholder || ''"
                                    [required]="element.required"
                                    rows="3"
                                  ></textarea>
                                }
                                @case ('email') {
                                  <input 
                                    type="email" 
                                    [id]="'field-' + i"
                                    [(ngModel)]="formData()[element.id]"
                                    [name]="'field-' + element.id"
                                    [placeholder]="element.placeholder || 'email@example.com'"
                                    [required]="element.required"
                                  >
                                }
                                @case ('date') {
                                  <input 
                                    type="date" 
                                    [id]="'field-' + i"
                                    [(ngModel)]="formData()[element.id]"
                                    [name]="'field-' + element.id"
                                    [required]="element.required"
                                  >
                                }
                                @case ('dropdown') {
                                  <select 
                                    [id]="'field-' + i"
                                    [(ngModel)]="formData()[element.id]"
                                    [name]="'field-' + element.id"
                                    [required]="element.required"
                                  >
                                    <option value="">Select an option...</option>
                                    @for (option of element.options; track option) {
                                      <option [value]="option">{{ option }}</option>
                                    }
                                  </select>
                                }
                                @case ('checkbox') {
                                  <label class="checkbox-label">
                                    <input 
                                      type="checkbox" 
                                      [(ngModel)]="formData()[element.id]"
                                      [name]="'field-' + element.id"
                                    >
                                    {{ element.label }}
                                  </label>
                                }
                                @case ('radio') {
                                  <div class="radio-group">
                                    @for (option of element.options; track option) {
                                      <label class="radio-label">
                                        <input 
                                          type="radio" 
                                          [name]="'field-' + element.id"
                                          [value]="option"
                                          [(ngModel)]="formData()[element.id]"
                                        >
                                        {{ option }}
                                      </label>
                                    }
                                  </div>
                                }
                                @default {
                                  <input 
                                    type="text" 
                                    [id]="'field-' + i"
                                    [(ngModel)]="formData()[element.id]"
                                    [name]="'field-' + element.id"
                                    [placeholder]="element.placeholder || ''"
                                    [required]="element.required"
                                  >
                                }
                              }
                            </div>
                          }
                        </div>
                        <div class="form-actions">
                          <button 
                            class="btn btn-primary" 
                            (click)="submitFormAndAdvance()"
                            [disabled]="formSubmitting()"
                          >
                            {{ formSubmitting() ? 'Submitting...' : 'Submit Form' }}
                          </button>
                        </div>
                      } @else {
                        <p>Loading form...</p>
                      }
                    </div>
                  }

                  <!-- Parallel: Multiple tasks -->
                  @if (currentNode()!.type === 'parallel') {
                    <div class="parallel-section">
                      <h4>Parallel Approval</h4>
                      <p>All approvers must approve for the workflow to continue (AND logic).</p>
                      @if (currentNode()!.data['approvers']) {
                        <p>Required Approvers: {{ currentNode()!.data['approvers'] }}</p>
                      }
                      @if (instance()?.parallelApprovals?.approvals?.length) {
                        <p class="approval-progress">Approvals: {{ instance()?.parallelApprovals?.approvals?.length }} / {{ instance()?.parallelApprovals?.requiredApprovers?.length || '?' }}</p>
                      }
                      <div class="parallel-actions">
                        <button class="btn btn-success" (click)="completeParallel()">✓ Approve (You)</button>
                      </div>
                    </div>
                  }

                  <!-- Join: Synchronize parallel paths -->
                  @if (currentNode()!.type === 'join') {
                    <div class="join-section">
                      <h4>Join - Synchronizing</h4>
                      <p>All parallel paths have completed. Workflow is proceeding.</p>
                      <button class="btn btn-primary" (click)="advanceWorkflow()">Continue</button>
                    </div>
                  }

                  <!-- Sub-Workflow: Trigger child workflow -->
                  @if (currentNode()!.type === 'sub-workflow') {
                    <div class="sub-workflow-section">
                      <h4>Sub-Workflow</h4>
                      <p>{{ currentNode()!.data['description'] || 'This step triggers a child workflow' }}</p>

                      @if (!instance()?.childInstanceId) {
                        <p class="child-workflow-name">Child: {{ getChildWorkflowName() }}</p>
                        <button class="btn btn-primary" (click)="startSubWorkflow()">
                          ▶ Start Sub-Workflow
                        </button>
                      } @else {
                        <div class="waiting-message">
                          <p>⏳ Waiting for sub-workflow to complete...</p>
                          <p class="child-status">Child workflow is running</p>
                          <button class="btn btn-secondary" (click)="checkSubWorkflowStatus()">
                            Check Status
                          </button>
                        </div>
                      }
                    </div>
                  }

                  <!-- Script: Execute JavaScript expression -->
                  @if (currentNode()!.type === 'script') {
                    <div class="script-section">
                      <h4>Script Execution</h4>
                      <p>Execute a JavaScript expression to compute a value.</p>
                      <div class="script-preview">
                        <label>Expression:</label>
                        <code>{{ currentNode()!.data['expression'] || 'No expression set' }}</code>
                      </div>
                      @if (currentNode()!.data['outputField']) {
                        <div class="script-preview">
                          <label>Output Field:</label>
                          <code>{{ currentNode()!.data['outputField'] }}</code>
                        </div>
                      }
                      @if (scriptResult()) {
                        <div class="script-result">
                          <label>Result:</label>
                          <code>{{ scriptResult() }}</code>
                        </div>
                      }
                      <button class="btn btn-primary" (click)="executeScript()">Execute Script</button>
                    </div>
                  }

                  <!-- Set Value: Set form field values -->
                  @if (currentNode()!.type === 'setvalue') {
                    <div class="setvalue-section">
                      <h4>Set Value</h4>
                      <p>Set a form field to a specific value.</p>
                      <div class="setvalue-preview">
                        <label>Field:</label>
                        <code>{{ currentNode()!.data['field'] || 'No field set' }}</code>
                      </div>
                      <div class="setvalue-preview">
                        <label>Value:</label>
                        <code>{{ currentNode()!.data['value'] || 'No value set' }}</code>
                      </div>
                      @if (lastSetValue()) {
                        <div class="setvalue-result">
                          <label>Set:</label>
                          <code>{{ lastSetValue() }}</code>
                        </div>
                      }
                      <button class="btn btn-primary" (click)="executeSetValue()">Set Value</button>
                    </div>
                  }

                  <!-- Transform: Transform/concatenate values -->
                  @if (currentNode()!.type === 'transform') {
                    <div class="transform-section">
                      <h4>Transform</h4>
                      <p>Transform or concatenate values into a new field.</p>
                      <div class="transform-preview">
                        <label>Output Field:</label>
                        <code>{{ currentNode()!.data['outputField'] || 'No output field set' }}</code>
                      </div>
                      <div class="transform-preview">
                        <label>Expression:</label>
                        <code>{{ currentNode()!.data['expression'] || 'No expression set' }}</code>
                      </div>
                      @if (transformResult()) {
                        <div class="transform-result">
                          <label>Result:</label>
                          <code>{{ transformResult() }}</code>
                        </div>
                      }
                      <button class="btn btn-primary" (click)="executeTransform()">Transform</button>
                    </div>
                  }

                  <!-- End node -->
                  @if (currentNode()!.type === 'end') {
                    <div class="end-section">
                      <h4>End of Workflow</h4>
                      <button class="btn btn-primary" (click)="finishWorkflow()">Finish</button>
                    </div>
                  }

                  <!-- Generic next button for simple nodes -->
                  @if (currentNode()!.type === 'start' || currentNode()!.type === 'join' || currentNode()!.type === 'task') {
                    <button class="btn btn-primary" (click)="advanceWorkflow()">Next Step</button>
                  }
                  @if (currentNode()!.type === 'script' || currentNode()!.type === 'setvalue' || currentNode()!.type === 'transform') {
                    <button class="btn btn-secondary" (click)="advanceWorkflow()">Skip (auto-executes)</button>
                  }
                </div>
              }
            }
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .workflow-player {
      max-width: 1000px;
      margin: 0 auto;
      padding: 2rem;
    }
    .loading, .not-found {
      text-align: center;
      padding: 4rem 2rem;
    }
    .not-found h2 {
      margin-bottom: 0.5rem;
    }
    .not-found p {
      color: var(--color-text-muted);
      margin-bottom: 1rem;
    }
    .player-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 2rem;
    }
    .player-header h1 {
      font-size: 1.5rem;
      margin-bottom: 0.25rem;
    }
    .player-header p {
      color: var(--color-text-muted);
      font-size: 0.875rem;
    }
    .player-body {
      display: grid;
      grid-template-columns: 280px 1fr;
      gap: 2rem;
    }

    /* Progress Steps */
    .progress-steps {
      background: var(--color-surface);
      border-radius: var(--radius-lg);
      padding: 1.5rem;
      height: fit-content;
    }
    .progress-steps h3 {
      font-size: 1rem;
      margin-bottom: 1rem;
    }
    .steps-list {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }
    .step-item {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.75rem;
      border-radius: var(--radius-md);
      background: var(--color-background);
      opacity: 0.6;
    }
    .step-item.active {
      opacity: 1;
      background: var(--color-primary);
      color: white;
    }
    .step-item.completed {
      opacity: 1;
      background: var(--color-success);
      color: white;
    }
    .step-item.pending {
      opacity: 0.6;
    }
    .step-number {
      width: 28px;
      height: 28px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(255,255,255,0.2);
      border-radius: 50%;
      font-size: 0.875rem;
      font-weight: 600;
    }
    .step-info {
      display: flex;
      flex-direction: column;
    }
    .step-type {
      font-size: 0.625rem;
      text-transform: uppercase;
      opacity: 0.8;
    }
    .step-label {
      font-size: 0.875rem;
      font-weight: 500;
    }

    /* Step Content */
    .step-content {
      background: var(--color-surface);
      border-radius: var(--radius-lg);
      padding: 2rem;
    }
    .start-section, .completed-section {
      text-align: center;
      padding: 3rem 2rem;
    }
    .start-icon, .completed-icon {
      width: 80px;
      height: 80px;
      margin: 0 auto 1.5rem;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 2.5rem;
      border-radius: 50%;
    }
    .start-icon {
      background: #dbeafe;
    }
    .completed-icon {
      background: var(--color-success);
      color: white;
    }
    .start-section h2, .completed-section h2 {
      margin-bottom: 0.5rem;
    }
    .start-section p, .completed-section p {
      color: var(--color-text-muted);
      margin-bottom: 1.5rem;
    }
    .btn-lg {
      padding: 0.875rem 2rem;
      font-size: 1rem;
    }
    .summary {
      background: var(--color-background);
      border-radius: var(--radius-md);
      padding: 1rem;
      margin: 1.5rem 0;
      text-align: left;
    }
    .summary h4 {
      font-size: 0.875rem;
      margin-bottom: 0.5rem;
    }
    .summary ul {
      font-size: 0.875rem;
      color: var(--color-text-muted);
      padding-left: 1.25rem;
    }

    /* Active Step */
    .active-step {
      padding: 1rem 0;
    }
    .step-header {
      margin-bottom: 1.5rem;
    }
    .step-badge {
      display: inline-block;
      padding: 0.25rem 0.75rem;
      border-radius: var(--radius-sm);
      color: white;
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
      margin-bottom: 0.5rem;
    }
    .step-header h2 {
      font-size: 1.5rem;
    }
    .step-description {
      color: var(--color-text-muted);
      margin-bottom: 1.5rem;
    }

    /* Task Form */
    .task-form, .approval-section, .parallel-section, .condition-section, .end-section, .sub-workflow-section, .join-section {
      background: var(--color-background);
      border-radius: var(--radius-lg);
      padding: 1.5rem;
      margin-bottom: 1.5rem;
    }
    .task-form h4, .approval-section h4, .parallel-section h4, .condition-section h4, .end-section h4, .sub-workflow-section h4, .join-section h4 {
      font-size: 1rem;
      margin-bottom: 0.75rem;
    }
    .parallel-section {
      background: #ecfdf5;
      border: 1px solid #10b981;
    }
    .condition-section {
      background: #fffbeb;
      border: 1px solid #f59e0b;
    }
    .join-section {
      background: #eff6ff;
      border: 1px solid #3b82f6;
    }
    .approval-progress, .form-value {
      font-size: 0.875rem;
      color: var(--color-text-muted);
      margin-top: 0.5rem;
    }
    .form-value code {
      background: var(--color-surface);
      padding: 0.125rem 0.5rem;
      border-radius: var(--radius-sm);
    }
    .parallel-actions {
      margin-top: 1rem;
    }
    .sub-workflow-section {
      background: #fdf4ff;
      border: 1px solid #ec4899;
    }
    .sub-workflow-section .child-workflow-name {
      font-weight: 500;
      margin-bottom: 1rem;
    }
    .script-section {
      background: #fff7ed;
      border: 1px solid #f97316;
    }
    .script-section h4 {
      color: #c2410c;
    }
    .setvalue-section {
      background: #f0fdf4;
      border: 1px solid #22c55e;
    }
    .setvalue-section h4 {
      color: #15803d;
    }
    .transform-section {
      background: #faf5ff;
      border: 1px solid #a855f7;
    }
    .transform-section h4 {
      color: #7e22ce;
    }
    .script-preview, .setvalue-preview, .transform-preview {
      margin-bottom: 0.75rem;
    }
    .script-preview label, .setvalue-preview label, .transform-preview label,
    .script-result label, .setvalue-result label, .transform-result label {
      display: block;
      font-size: 0.75rem;
      color: var(--color-text-muted);
      margin-bottom: 0.25rem;
    }
    .script-preview code, .setvalue-preview code, .transform-preview code,
    .script-result code, .setvalue-result code, .transform-result code {
      display: block;
      background: var(--color-surface);
      padding: 0.5rem;
      border-radius: var(--radius-sm);
      font-size: 0.875rem;
    }
    .script-result, .setvalue-result, .transform-result {
      margin-top: 1rem;
      padding: 0.75rem;
      background: rgba(0,0,0,0.05);
      border-radius: var(--radius-md);
    }
    .waiting-message {
      padding: 1rem;
      background: #fef3c7;
      border-radius: var(--radius-md);
      margin-top: 1rem;
    }
    .waiting-message p {
      margin-bottom: 0.5rem;
    }
    .child-status {
      font-size: 0.875rem;
      color: #666;
    }
    .form-field {
      margin-bottom: 1rem;
    }
    .form-field label {
      display: block;
      font-size: 0.875rem;
      font-weight: 500;
      margin-bottom: 0.25rem;
    }
    .form-field textarea {
      width: 100%;
      padding: 0.75rem;
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      font-size: 0.875rem;
      resize: vertical;
    }
    .approval-actions {
      display: flex;
      gap: 1rem;
      margin-top: 1rem;
    }
    .btn-success {
      background: var(--color-success);
      color: white;
    }
    .btn-danger {
      background: var(--color-danger);
      color: white;
    }
    .condition-note {
      font-size: 0.875rem;
      color: var(--color-text-muted);
      margin: 1rem 0;
    }
  `]
})
export class WorkflowPlayerComponent implements OnInit {
  workflow = signal<Workflow | null>(null);
  instance = signal<WorkflowInstance | null>(null);
  loading = signal(true);
  scriptResult = signal<string | null>(null);
  lastSetValue = signal<string | null>(null);
  transformResult = signal<string | null>(null);
  currentForm = signal<Form | null>(null);
  formData = signal<Record<string, any>>({});
  formSubmitting = signal(false);

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private workflowService: WorkflowService,
    private auth: AuthService,
    private formService: FormService,
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone
  ) {}

  ngOnInit() {
    const workflowId = this.route.snapshot.paramMap.get('id');
    if (workflowId) {
      this.loadWorkflowAndInstance(workflowId);
    } else {
      this.loading.set(false);
    }
  }

  loadWorkflowAndInstance(workflowId: string) {
    console.log('[DEBUG] loadWorkflowAndInstance called, workflowId:', workflowId);
    // Load both workflow and instances in parallel
    this.workflowService.getById(workflowId).subscribe({
      next: (workflow) => {
        console.log('[DEBUG] getById returned workflow:', !!workflow, 'nodes:', workflow?.nodes?.length);
        this.workflow.set(workflow);
        // Also load instances
        this.workflowService.getAllInstances().subscribe({
          next: (instances) => {
            console.log('[DEBUG] getAllInstances returned', instances?.length, 'instances');
            const existing = instances.find((i: any) => i.workflowId === workflowId && i.status !== 'COMPLETED');
            if (existing) {
              console.log('[DEBUG] Found existing instance:', JSON.stringify(existing));
              this.instance.set(existing);
              this.formData.set(existing.formData || {});
              // Check if current node is a form node and load the form
              const currentNode = workflow.nodes.find((n: any) => n.id === existing.currentNodeId);
              const formId = currentNode?.data?.['formId'];
              if (currentNode?.type === 'form' && typeof formId === 'string' && formId) {
                this.loadForm(formId);
              }
            } else {
              // Create local pending instance
              const pendingInstance = {
                id: '',
                workflowId,
                workflowName: workflow.name,
                currentNodeId: null,
                status: 'PENDING' as const,
                formData: {},
                history: []
              };
              console.log('[DEBUG] Creating pending instance:', JSON.stringify(pendingInstance));
              this.instance.set(pendingInstance);
            }
            console.log('[DEBUG] instance signal set, now:', JSON.stringify(this.instance()));
            this.loading.set(false);
          },
          error: (err) => {
            console.log('[DEBUG] getAllInstances error:', err);
            this.loading.set(false);
          }
        });
      },
      error: (err) => {
        console.log('[DEBUG] getById error:', err);
        this.workflow.set(null);
        this.loading.set(false);
      }
    });
  }

  loadOrCreateInstance(workflowId: string) {
    this.workflowService.getAllInstances().subscribe({
      next: (instances) => {
        let instance = instances.find((i: any) => i.workflowId === workflowId && i.status !== 'COMPLETED');
        if (!instance) {
          const workflow = this.workflow();
          if (workflow) {
            const startNode = workflow.nodes?.find((n: any) => n.type === 'start');
            instance = {
              id: '',
              workflowId,
              workflowName: workflow.name,
              currentNodeId: null,
              status: 'PENDING' as const,
              formData: {},
              history: []
            };
          } else {
            // No workflow yet, can't create instance
            this.instance.set(null);
            return;
          }
        }
        console.log('[DEBUG] loadOrCreateInstance setting instance:', JSON.stringify(instance));
        this.instance.set(instance || null);
      },
      error: () => {
        this.instance.set(null);
      }
    });
  }

  currentNode(): WorkflowNode | null {
    const inst = this.instance();
    const wf = this.workflow();
    if (!inst || !wf || !inst.currentNodeId) return null;
    return wf.nodes.find(n => n.id === inst.currentNodeId) || null;
  }

  getNodeTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      'start': 'Start',
      'end': 'End',
      'form': 'Form',
      'task': 'Task',
      'condition': 'Condition',
      'approval': 'Approval',
      'parallel': 'Parallel Split',
      'join': 'Join',
      'sub-workflow': 'Sub-Workflow',
      'script': 'Script',
      'setvalue': 'Set Value',
      'transform': 'Transform'
    };
    return labels[type] || type;
  }

  getNodeColor(type: string): string {
    const colors: Record<string, string> = {
      'start': '#10b981',
      'end': '#ef4444',
      'form': '#3b82f6',
      'task': '#6366f1',
      'condition': '#f59e0b',
      'approval': '#8b5cf6',
      'parallel': '#06b6d4',
      'join': '#3b82f6',
      'sub-workflow': '#ec4899',
      'script': '#f97316',
      'setvalue': '#22c55e',
      'transform': '#a855f7'
    };
    return colors[type] || '#64748b';
  }

  isCurrentStep(nodeId: string): boolean {
    return this.instance()?.currentNodeId === nodeId;
  }

  isStepCompleted(nodeId: string): boolean {
    const inst = this.instance();
    if (!inst) return false;
    const wf = this.workflow();
    if (!wf) return false;

    const node = wf.nodes.find(n => n.id === nodeId);
    const historyNode = inst.history.find(h => h.nodeId === nodeId);

    // If in history, it's completed
    if (historyNode !== undefined) return true;

    // For start node: completed if workflow is in-progress (we've started and moved past it)
    if (node?.type === 'start') {
      return inst.status === 'IN_PROGRESS' || inst.status === 'COMPLETED';
    }

    // For other nodes: find indices to compare
    const currentIdx = wf.nodes.findIndex(n => n.id === inst.currentNodeId);
    const nodeIdx = wf.nodes.findIndex(n => n.id === nodeId);

    return nodeIdx < currentIdx;
  }

  isStepPending(nodeId: string): boolean {
    return !this.isCurrentStep(nodeId) && !this.isStepCompleted(nodeId);
  }

  startWorkflow() {
    const inst = this.instance();
    const wf = this.workflow();
    console.log('[DEBUG] startWorkflow inst:', !!inst, 'inst.id:', inst?.id, 'wf:', !!wf);
    if (!inst || !wf) return;
    const startNode = wf.nodes.find(n => n.type === 'start');
    if (!startNode) return;
    
    const nextNodeIdx = wf.nodes.findIndex(n => n.type === 'start') + 1;
    const nextNode = wf.nodes[nextNodeIdx];
    const nextNodeId = nextNode ? nextNode.id : startNode.id;
    
    // Use backend API to start instance (persists to DB)
    console.log('[DEBUG] Calling startInstance API, wf.id:', wf.id);
    this.workflowService.startInstance(wf.id, 'admin').subscribe({
      next: (startedInst: any) => {
        console.log('[DEBUG] startInstance API success, inst:', JSON.stringify(startedInst));
        this.instance.set(startedInst);
        this.formData.set(startedInst.formData || {});
        // Check if current node is a form node and load the form
        const wf2 = this.workflow();
        if (wf2 && startedInst.currentNodeId) {
          const currentNode = wf2.nodes.find((n: any) => n.id === startedInst.currentNodeId);
          const formId = currentNode?.data?.['formId'];
          if (currentNode?.type === 'form' && typeof formId === 'string' && formId) {
            this.loadForm(formId);
          }
        }
        this.cdr.markForCheck(); // Force change detection
        console.log('[DEBUG] instance signal now:', JSON.stringify(this.instance()));
      },
      error: (err: any) => {
        console.log('[DEBUG] startInstance API error:', err?.message || err);
        const updated = { 
          ...inst, 
          history: [...inst.history, {
            nodeId: startNode.id,
            action: `Started: ${startNode.data['label'] || startNode.type}`,
            timestamp: new Date()
          }],
          currentNodeId: nextNodeId,
          status: 'IN_PROGRESS' as const
        };
        this.instance.set(updated);
        this.cdr.markForCheck();
      }
    });
  }

  advanceWorkflow() {
    const inst = this.instance();
    const wf = this.workflow();
    if (!inst || !wf) return;

    // If waiting for child workflow, don't advance
    if (inst.status === 'WAITING_FOR_CHILD') {
      return;
    }

    // Find current node index
    const currentIdx = wf.nodes.findIndex(n => n.id === inst.currentNodeId);
    if (currentIdx < 0) return;

    const currentNode = wf.nodes[currentIdx];

    // For script/setvalue/transform nodes, execute them before advancing
    if (currentNode.type === 'script') {
      this.executeScriptNoAdvance();
      // executeScriptNoAdvance already calls advanceWorkflow again after updating instance
      return;
    }
    if (currentNode.type === 'setvalue') {
      this.executeSetValueNoAdvance();
      return;
    }
    if (currentNode.type === 'transform') {
      this.executeTransformNoAdvance();
      return;
    }

    // If at last node, finish workflow
    if (currentIdx >= wf.nodes.length - 1) {
      this.finishWorkflow();
      return;
    }

    // Add to history (skip if already there - happens when we already added via startWorkflow)
    const alreadyInHistory = inst.history.some(h => h.nodeId === currentNode.id);
    if (!alreadyInHistory) {
      inst.history.push({
        nodeId: currentNode.id,
        action: `Completed: ${currentNode.data['label'] || currentNode.type}`,
        timestamp: new Date()
      });
    }

    // Move to next node
    const nextNode = wf.nodes[currentIdx + 1];
    const addToHistory = [...inst.history, {
      nodeId: currentNode.id,
      action: `Completed: ${currentNode.data['label'] || currentNode.type}`,
      timestamp: new Date()
    }];
    const newStatus = nextNode.type === 'end' ? 'completed' : inst.status;

    if (nextNode.type === 'end') {
      // Use finish workflow API
      this.workflowService.completeInstance(inst.id).subscribe({
        next: (updated: any) => { 
          console.log('[DEBUG] completeInstance returned:', JSON.stringify(updated));
          this.instance.set(updated); 
          this.cdr.markForCheck(); 
        },
        error: (err) => { 
          console.log('[DEBUG] completeInstance error:', err);
          this.instance.set({ ...inst, status: 'COMPLETED' }); 
          this.cdr.markForCheck(); 
        }
      });
    } else {
      // Use advance instance API
      this.workflowService.advanceInstance(inst.id, nextNode.id, addToHistory).subscribe({
        next: (updated: any) => { this.ngZone.run(() => { this.instance.set(updated); this.cdr.markForCheck(); }); },
        error: () => {
          // Fallback: update locally
          this.instance.set({ ...inst, currentNodeId: nextNode.id, history: addToHistory, status: inst.status });
          this.cdr.markForCheck();
        }
      });
    }
  }

  approve() {
    const inst = this.instance();
    if (!inst) return;

    const currentNode = this.currentNode();
    const currentUser = this.auth.user();

    // If in parallel mode, use parallel completion logic
    if (currentNode?.type === 'parallel') {
      this.completeParallel();
      return;
    }

    inst.history.push({
      nodeId: currentNode?.id || '',
      action: `Approved by ${currentUser?.name || 'User'}`,
      timestamp: new Date()
    });

    this.advanceWorkflow();
  }

  reject() {
    const inst = this.instance();
    if (!inst) return;

    const currentNode = this.currentNode();
    inst.history.push({
      nodeId: currentNode?.id || '',
      action: 'Rejected',
      timestamp: new Date()
    });

    // Rejection ends workflow
    inst.status = 'COMPLETED';

    this.workflowService.completeInstance(inst.id).subscribe({
      next: (updated) => {
        this.instance.set({ ...updated });
      },
      error: () => {
        this.instance.set({ ...inst });
      }
    });
  }

  getConditionFieldValue(): string | null {
    const inst = this.instance();
    const node = this.currentNode();
    if (!inst || !node || node.type !== 'condition') return null;
    const field = node.data['field'] as string;
    if (!field) return null;
    const formData = inst.formData as Record<string, any>;
    return formData[field] ?? null;
  }

  proceedFromCondition() {
    const inst = this.instance();
    const wf = this.workflow();
    const currentNode = this.currentNode();

    if (!inst || !wf || !currentNode || currentNode.type !== 'condition') {
      this.advanceWorkflow();
      return;
    }

    // Get condition criteria from node data
    const field = currentNode.data['field'] as string;
    const value = currentNode.data['value'] as string;
    const operator = currentNode.data['operator'] as string || 'equals';

    // Get form field value
    const formValue = inst.formData[field];

    // Evaluate condition
    let conditionMet = false;

    if (formValue === undefined || formValue === null) {
      conditionMet = false;
    } else if (operator === 'equals') {
      conditionMet = String(formValue).toLowerCase() === String(value).toLowerCase();
    } else if (operator === 'not_equals') {
      conditionMet = String(formValue).toLowerCase() !== String(value).toLowerCase();
    } else if (operator === 'greater_than') {
      conditionMet = Number(formValue) > Number(value);
    } else if (operator === 'less_than') {
      conditionMet = Number(formValue) < Number(value);
    } else if (operator === 'contains') {
      conditionMet = String(formValue).toLowerCase().includes(String(value).toLowerCase());
    }

    // Add to history
    inst.history.push({
      nodeId: currentNode.id,
      action: `Condition evaluated: ${field} ${operator} ${value} → ${conditionMet ? 'TRUE' : 'FALSE'}`,
      timestamp: new Date()
    });

    // Find the next node based on condition result
    // Look for connections from this condition node
    const trueBranchId = currentNode.data['trueBranch'] as string;
    const falseBranchId = currentNode.data['falseBranch'] as string;

    if (conditionMet && trueBranchId) {
      inst.currentNodeId = trueBranchId;
    } else if (!conditionMet && falseBranchId) {
      inst.currentNodeId = falseBranchId;
    } else {
      // Fallback: just advance to next node in sequence
      this.advanceWorkflow();
      return;
    }

    if (inst.currentNodeId) {
      const nextNode = wf.nodes.find(n => n.id === inst.currentNodeId);
      if (nextNode?.type === 'end') {
        inst.status = 'COMPLETED';
      }
    }

    this.updateInstance(inst);
  }

  completeParallel() {
    const inst = this.instance();
    const wf = this.workflow();
    const currentNode = this.currentNode();

    if (!inst || !wf || !currentNode || currentNode.type !== 'parallel') {
      this.advanceWorkflow();
      return;
    }

    // Get parallel approvers from node data
    const approvers = (currentNode.data['approvers'] as string[]) || [];
    const currentUser = this.auth.user();

    // Initialize or update parallel approval state
    if (!inst.parallelApprovals || inst.parallelApprovals.parallelNodeId !== currentNode.id) {
      inst.parallelApprovals = {
        parallelNodeId: currentNode.id,
        requiredApprovers: approvers,
        approvals: [],
        status: 'PENDING'
      };
    }

    // Add current user's approval
    if (currentUser && !inst.parallelApprovals.approvals.includes(currentUser.id)) {
      inst.parallelApprovals.approvals.push(currentUser.id);
    }

    // Check if ALL required approvers have approved (AND logic)
    const allApproved = inst.parallelApprovals.requiredApprovers.length === 0 ||
      inst.parallelApprovals.requiredApprovers.every(approver =>
        inst.parallelApprovals!.approvals.includes(approver)
      );

    inst.history.push({
      nodeId: currentNode.id,
      action: `Parallel task approved: ${inst.parallelApprovals.approvals.length}/${inst.parallelApprovals.requiredApprovers.length || '?'} approvers`,
      timestamp: new Date()
    });

    if (allApproved) {
      inst.parallelApprovals.status = 'ALL_APPROVED';

      // Find the join node after this parallel section
      // In a proper implementation, we'd look at connections
      // For now, find the join node by looking for nodes after parallel
      const currentIdx = wf.nodes.findIndex(n => n.id === currentNode.id);
      const joinNode = wf.nodes.find((n, idx) => idx > currentIdx && n.type === 'join');

      if (joinNode) {
        inst.currentNodeId = joinNode.id;
        // Clear parallel state
        inst.parallelApprovals = undefined;
      } else {
        // No join node, just advance
        inst.parallelApprovals = undefined;
        this.advanceWorkflow();
        return;
      }

      if (joinNode?.type === 'end') {
        inst.status = 'COMPLETED';
      }

      this.updateInstance(inst);
    } else {
      // Still waiting for more approvals
      this.instance.set({ ...inst });
    }
  }

  startSubWorkflow() {
    const inst = this.instance();
    const currentNode = this.currentNode();
    const user = this.auth.user();
    if (!inst || !currentNode || currentNode.type !== 'sub-workflow' || !user) return;

    const childWorkflowId = currentNode.data['childWorkflowId'] as string;
    if (!childWorkflowId) {
      alert('Please select a child workflow in the designer');
      return;
    }

    this.workflowService.createChildInstance(inst.id, childWorkflowId, user.id, inst.formData).subscribe({
      next: (childInstance) => {
        inst.childInstanceId = childInstance.id;
        inst.status = 'WAITING_FOR_CHILD';
        inst.history.push({
          nodeId: currentNode.id,
          action: `Started sub-workflow: ${currentNode.data['label'] || 'Sub-workflow'}`,
          timestamp: new Date()
        });
        this.instance.set({ ...inst });
      },
      error: () => {
        alert('Failed to start sub-workflow');
      }
    });
  }

  checkSubWorkflowStatus() {
    const inst = this.instance();
    if (!inst?.childInstanceId) return;

    this.workflowService.getInstance(inst.childInstanceId).subscribe({
      next: (childInstance: any) => {
        if (childInstance?.status === 'COMPLETED') {
          this.resumeFromSubWorkflow();
        }
      },
      error: () => {}
    });
  }

  getChildWorkflowName(): string {
    const currentNode = this.currentNode();
    if (!currentNode || currentNode.type !== 'sub-workflow') return '';

    const childWorkflowId = currentNode.data['childWorkflowId'] as string;
    if (!childWorkflowId) return 'Not selected';

    return 'Sub-workflow';
  }

  resumeFromSubWorkflow() {
    const inst = this.instance();
    const currentNode = this.currentNode();
    const wf = this.workflow();
    if (!inst || !currentNode || !wf) return;

    // Find current node index and advance to next
    const currentIdx = wf.nodes.findIndex(n => n.id === inst.currentNodeId);
    if (currentIdx >= 0 && currentIdx < wf.nodes.length - 1) {
      // Add sub-workflow node to history
      inst.history.push({
        nodeId: currentNode.id,
        action: `Completed: ${currentNode.data['label'] || currentNode.type}`,
        timestamp: new Date()
      });

      const nextNode = wf.nodes[currentIdx + 1];
      inst.currentNodeId = nextNode.id;
      inst.childInstanceId = undefined;
      inst.status = 'IN_PROGRESS';

      if (nextNode.type === 'end') {
        inst.status = 'COMPLETED';
      }

      this.updateInstance(inst);
    }
  }

  finishWorkflow() {
    const inst = this.instance();
    if (!inst) return;

    const currentNode = this.currentNode();
    if (currentNode) {
      inst.history.push({
        nodeId: currentNode.id,
        action: `Completed: ${currentNode.data['label'] || currentNode.type}`,
        timestamp: new Date()
      });
    }

    inst.status = 'COMPLETED';
    inst.currentNodeId = null;
    this.updateInstance(inst);
  }

  executeScript() {
    const inst = this.instance();
    const currentNode = this.currentNode();
    if (!inst || !currentNode || currentNode.type !== 'script') return;

    const expression = currentNode.data['expression'] as string;
    const outputField = (currentNode.data['outputField'] as string) || '_scriptResult';

    if (!expression) {
      this.scriptResult.set('Error: No expression defined');
      return;
    }

    try {
      // Create a safe context with formData
      const formData = inst.formData || {};
      // Evaluate the expression
      const result = new Function('formData', `with(formData) { return ${expression}; }`)(formData);

      // Store result in formData
      inst.formData[outputField] = result;
      this.scriptResult.set(String(result));

      inst.history.push({
        nodeId: currentNode.id,
        action: `Script executed: ${expression} → ${result}`,
        timestamp: new Date()
      });

      this.instance.set({ ...inst });

      // Auto-advance after execution
      setTimeout(() => this.advanceWorkflow(), 500);
    } catch (err: any) {
      this.scriptResult.set(`Error: ${err.message}`);
    }
  }

  executeScriptNoAdvance() {
    const inst = this.instance();
    const currentNode = this.currentNode();
    if (!inst || !currentNode || currentNode.type !== 'script') {
      this.advanceWorkflow();
      return;
    }

    const expression = currentNode.data['expression'] as string;
    const outputField = (currentNode.data['outputField'] as string) || '_scriptResult';

    if (!expression) {
      this.scriptResult.set('Error: No expression defined');
      this.advanceWorkflow();
      return;
    }

    try {
      const formData = inst.formData || {};
      const result = new Function('formData', `with(formData) { return ${expression}; }`)(formData);
      inst.formData[outputField] = result;
      this.scriptResult.set(String(result));

      inst.history.push({
        nodeId: currentNode.id,
        action: `Script executed: ${expression} → ${result}`,
        timestamp: new Date()
      });

      this.instance.set({ ...inst });

      // Auto-advance after execution
      setTimeout(() => this.advanceWorkflow(), 500);
    } catch (err: any) {
      this.scriptResult.set(`Error: ${err.message}`);
      setTimeout(() => this.advanceWorkflow(), 500);
    }
  }

  executeSetValue() {
    const inst = this.instance();
    const currentNode = this.currentNode();
    if (!inst || !currentNode || currentNode.type !== 'setvalue') return;

    const field = currentNode.data['field'] as string;
    let value = currentNode.data['value'] as string;

    if (!field) {
      this.lastSetValue.set('Error: No field defined');
      return;
    }

    try {
      // Check if value references formData (e.g., currentUser.name)
      if (value && value.includes('.')) {
        const parts = value.split('.');
        let resolved = inst.formData;
        for (const part of parts) {
          resolved = resolved?.[part];
        }
        inst.formData[field] = resolved;
        this.lastSetValue.set(`${field} = ${resolved}`);
      } else {
        // Direct value assignment
        inst.formData[field] = value;
        this.lastSetValue.set(`${field} = ${value}`);
      }

      inst.history.push({
        nodeId: currentNode.id,
        action: `Set value: ${field} = ${value}`,
        timestamp: new Date()
      });

      this.instance.set({ ...inst });

      // Auto-advance after execution
      setTimeout(() => this.advanceWorkflow(), 500);
    } catch (err: any) {
      this.lastSetValue.set(`Error: ${err.message}`);
    }
  }

  executeSetValueNoAdvance() {
    const inst = this.instance();
    const currentNode = this.currentNode();
    if (!inst || !currentNode || currentNode.type !== 'setvalue') {
      this.advanceWorkflow();
      return;
    }

    const field = currentNode.data['field'] as string;
    let value = currentNode.data['value'] as string;

    if (!field) {
      this.lastSetValue.set('Error: No field defined');
      setTimeout(() => this.advanceWorkflow(), 500);
      return;
    }

    try {
      if (value && value.includes('.')) {
        const parts = value.split('.');
        let resolved = inst.formData;
        for (const part of parts) {
          resolved = resolved?.[part];
        }
        inst.formData[field] = resolved;
        this.lastSetValue.set(`${field} = ${resolved}`);
      } else {
        inst.formData[field] = value;
        this.lastSetValue.set(`${field} = ${value}`);
      }

      inst.history.push({
        nodeId: currentNode.id,
        action: `Set value: ${field} = ${value}`,
        timestamp: new Date()
      });

      this.instance.set({ ...inst });

      setTimeout(() => this.advanceWorkflow(), 500);
    } catch (err: any) {
      this.lastSetValue.set(`Error: ${err.message}`);
      setTimeout(() => this.advanceWorkflow(), 500);
    }
  }

  executeTransform() {
    const inst = this.instance();
    const currentNode = this.currentNode();
    if (!inst || !currentNode || currentNode.type !== 'transform') return;

    const expression = currentNode.data['expression'] as string;
    const outputField = currentNode.data['outputField'] as string;

    if (!expression || !outputField) {
      this.transformResult.set('Error: Missing expression or output field');
      return;
    }

    try {
      // Create a safe context with formData
      const formData = inst.formData || {};
      // Evaluate the expression
      const result = new Function('formData', `with(formData) { return ${expression}; }`)(formData);

      // Store result in formData
      inst.formData[outputField] = result;
      this.transformResult.set(String(result));

      inst.history.push({
        nodeId: currentNode.id,
        action: `Transformed: ${outputField} = ${result}`,
        timestamp: new Date()
      });

      this.instance.set({ ...inst });

      // Auto-advance after execution
      setTimeout(() => this.advanceWorkflow(), 500);
    } catch (err: any) {
      this.transformResult.set(`Error: ${err.message}`);
    }
  }

  executeTransformNoAdvance() {
    const inst = this.instance();
    const currentNode = this.currentNode();
    if (!inst || !currentNode || currentNode.type !== 'transform') {
      this.advanceWorkflow();
      return;
    }

    const expression = currentNode.data['expression'] as string;
    const outputField = currentNode.data['outputField'] as string;

    if (!expression || !outputField) {
      this.transformResult.set('Error: Missing expression or output field');
      setTimeout(() => this.advanceWorkflow(), 500);
      return;
    }

    try {
      const formData = inst.formData || {};
      const result = new Function('formData', `with(formData) { return ${expression}; }`)(formData);
      inst.formData[outputField] = result;
      this.transformResult.set(String(result));

      inst.history.push({
        nodeId: currentNode.id,
        action: `Transformed: ${outputField} = ${result}`,
        timestamp: new Date()
      });

      this.instance.set({ ...inst });

      setTimeout(() => this.advanceWorkflow(), 500);
    } catch (err: any) {
      this.transformResult.set(`Error: ${err.message}`);
      setTimeout(() => this.advanceWorkflow(), 500);
    }
  }

  updateInstance(updated: WorkflowInstance) {
    console.log('[DEBUG] updateInstance called, id:', updated.id);
    if (!updated.id) {
      // Instance not yet persisted - just update locally
      console.log('[DEBUG] No ID, setting instance locally');
      this.instance.set({ ...updated });
      return;
    }
    this.workflowService.getInstance(updated.id).subscribe({
      next: (inst: any) => {
        this.instance.set({ ...inst, ...updated });
      },
      error: () => {
        this.instance.set({ ...updated });
      }
    });
  }

  // Form handling for form-type nodes
  loadForm(formId: string) {
    console.log('[DEBUG] loadForm called, formId:', formId);
    this.formService.getById(formId).subscribe({
      next: (form: any) => {
        console.log('[DEBUG] Form loaded:', form.name, 'elements:', form.elements?.length);
        this.currentForm.set(form);
        // Initialize formData with existing data or empty object
        const inst = this.instance();
        this.formData.set(inst?.formData || {});
        this.cdr.markForCheck();
      },
      error: (err: any) => {
        console.log('[DEBUG] loadForm error:', err?.message || err);
        this.currentForm.set(null);
      }
    });
  }

  submitFormAndAdvance() {
    const inst = this.instance();
    const form = this.currentForm();
    if (!inst || !form) return;

    this.formSubmitting.set(true);
    const formData = this.formData();
    console.log('[DEBUG] submitFormAndAdvance, formData:', JSON.stringify(formData));

    // Update instance with form data and advance to next node
    this.workflowService.updateInstance(inst.id, { formData }).subscribe({
      next: (updated: any) => {
        console.log('[DEBUG] Form data saved, advancing workflow');
        this.instance.set(updated);
        this.formSubmitting.set(false);
        // Advance to next node after form submission
        setTimeout(() => this.advanceWorkflow(), 300);
      },
      error: (err: any) => {
        console.log('[DEBUG] submitFormAndAdvance error:', err?.message || err);
        this.formSubmitting.set(false);
      }
    });
  }
}
