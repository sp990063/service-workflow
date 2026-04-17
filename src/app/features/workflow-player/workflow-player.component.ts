import { Component, OnInit, signal, computed, ViewChildren, QueryList, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { WorkflowService } from '../../core/services/workflow.service';
import { AuthService } from '../../core/services/auth.service';
import { FormService } from '../../core/services/form.service';
import { Workflow, WorkflowNode, Form } from '../../core/models';
import { FormFieldComponent } from '../../shared/components/form-field';

type WorkflowNodeType = WorkflowNode['type'];

interface WorkflowInstance {
  id: string;
  workflowId: string;
  workflowName: string;
  currentNodeId: string | null;
  status: 'PENDING' | 'IN_PROGRESS' | 'WAITING_FOR_CHILD' | 'COMPLETED';
  formData: Record<string, unknown>;
  history: Array<{ nodeId: string; action: string; timestamp: Date }>;
  childInstanceId?: string;
  parentInstanceId?: string;
  parallelApprovals?: ParallelApprovalState;
}

interface ParallelApprovalState {
  parallelNodeId: string;
  requiredApprovers: string[];
  approvals: string[];
  status: 'PENDING' | 'ALL_APPROVED' | 'REJECTED';
}

interface ParallelApprovalData {
  [nodeId: string]: ParallelApprovalState;
}

interface FormDataType {
  [key: string]: unknown;
  parallelApprovals?: ParallelApprovalData;
}

interface NodeTypeConfig {
  label: string;
  color: string;
  isExecutable: boolean;
  hasCustomAction: boolean;
}

const NODE_TYPE_CONFIGS: Record<WorkflowNodeType, NodeTypeConfig> = {
  'start': { label: 'Start', color: '#10b981', isExecutable: false, hasCustomAction: true },
  'end': { label: 'End', color: '#ef4444', isExecutable: false, hasCustomAction: true },
  'form': { label: 'Form', color: '#3b82f6', isExecutable: false, hasCustomAction: false },
  'task': { label: 'Task', color: '#6366f1', isExecutable: false, hasCustomAction: true },
  'condition': { label: 'Condition', color: '#f59e0b', isExecutable: true, hasCustomAction: true },
  'approval': { label: 'Approval', color: '#8b5cf6', isExecutable: false, hasCustomAction: false },
  'parallel': { label: 'Parallel Split', color: '#06b6d4', isExecutable: false, hasCustomAction: false },
  'join': { label: 'Join', color: '#3b82f6', isExecutable: false, hasCustomAction: true },
  'sub-workflow': { label: 'Sub-Workflow', color: '#ec4899', isExecutable: false, hasCustomAction: false },
  'script': { label: 'Script', color: '#f97316', isExecutable: true, hasCustomAction: false },
  'setvalue': { label: 'Set Value', color: '#22c55e', isExecutable: true, hasCustomAction: false },
  'transform': { label: 'Transform', color: '#a855f7', isExecutable: true, hasCustomAction: false },
};

@Component({
  selector: 'app-workflow-player',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, FormFieldComponent],
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
                    <span class="step-type">{{ getNodeConfig(node.type).label }}</span>
                    <span class="step-label">{{ node.data['label'] || node.type }}</span>
                  </div>
                </div>
              }
            </div>
          </div>

          <div class="step-content">
            @if (instance()?.status === 'COMPLETED') {
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
              <div class="start-section">
                <div class="start-icon">▶</div>
                <h2>Ready to Start</h2>
                <p>This workflow has {{ workflow()!.nodes.length }} steps. Click the button below to begin.</p>
                <button class="btn btn-primary btn-lg" (click)="startWorkflow()">
                  Start Workflow
                </button>
              </div>
            } @else {
              @if (currentNode()) {
                <div class="active-step">
                  <div class="step-header">
                    <span class="step-badge" [style.background]="getNodeConfig(currentNode()!.type).color">
                      {{ getNodeConfig(currentNode()!.type).label }}
                    </span>
                    <h2>{{ currentNode()!.data['label'] || currentNode()!.type }}</h2>
                  </div>

                  @if (currentNode()!.data['description']) {
                    <p class="step-description">{{ currentNode()!.data['description'] }}</p>
                  }

                  @if (formError()) {
                    <div class="form-error">
                      <span>{{ formError() }}</span>
                      <button type="button" class="btn-close" (click)="formError.set(null)">×</button>
                    </div>
                  }

                  @switch (currentNode()!.type) {
                    @case ('task') {
                      <ng-container *ngTemplateOutlet="taskTemplate"></ng-container>
                    }
                    @case ('approval') {
                      <ng-container *ngTemplateOutlet="approvalTemplate"></ng-container>
                    }
                    @case ('form') {
                      <ng-container *ngTemplateOutlet="formTemplate"></ng-container>
                    }
                    @case ('parallel') {
                      <ng-container *ngTemplateOutlet="parallelTemplate"></ng-container>
                    }
                    @case ('condition') {
                      <ng-container *ngTemplateOutlet="conditionTemplate"></ng-container>
                    }
                    @case ('script') {
                      <ng-container *ngTemplateOutlet="scriptTemplate"></ng-container>
                    }
                    @case ('setvalue') {
                      <ng-container *ngTemplateOutlet="setvalueTemplate"></ng-container>
                    }
                    @case ('transform') {
                      <ng-container *ngTemplateOutlet="transformTemplate"></ng-container>
                    }
                    @case ('join') {
                      <ng-container *ngTemplateOutlet="joinTemplate"></ng-container>
                    }
                    @case ('sub-workflow') {
                      <ng-container *ngTemplateOutlet="subWorkflowTemplate"></ng-container>
                    }
                    @case ('end') {
                      <ng-container *ngTemplateOutlet="endTemplate"></ng-container>
                    }
                  }

                  @if (showNextButton()) {
                    <button class="btn btn-primary" (click)="advanceWorkflow()">Next Step</button>
                  }
                </div>
              }
            }
          </div>
        </div>
      }
    </div>

    <!-- Task Template -->
    <ng-template #taskTemplate>
      <div class="task-form">
        @if (isCompletedInstance()) {
          <div class="completed-banner">
            <span>✓ This workflow has been completed</span>
          </div>
        }
        <h4>Task Details</h4>
        <div class="form-field">
          <label>Task Instructions</label>
          <textarea disabled>{{ currentNode()!.data['description'] || 'Complete this task as described.' }}</textarea>
        </div>
        @if (currentNode()!.data['formId']) {
          <a [routerLink]="['/form-fill', currentNode()!.data['formId'], instance()?.id]" class="btn btn-secondary">
            View Submitted Form
          </a>
        }
        @if (!isCompletedInstance()) {
          <button class="btn btn-primary" (click)="advanceWorkflow()">Next Step</button>
        }
      </div>
    </ng-template>

    <!-- Approval Template -->
    <ng-template #approvalTemplate>
      <div class="approval-section">
        @if (isCompletedInstance()) {
          <div class="completed-banner">
            <span>✓ This workflow has been completed</span>
          </div>
        }
        <h4>Approval Required</h4>
        <p>Please review and approve or reject this request.</p>
        @if (currentNode()!.data['formId']) {
          <a [routerLink]="['/form-fill', currentNode()!.data['formId'], instance()?.id]" class="btn btn-secondary">
            View Submitted Form
          </a>
        }
        @if (!isCompletedInstance()) {
          <div class="approval-actions">
            <button class="btn btn-success" (click)="approve()">✓ Approve</button>
            <button class="btn btn-danger" (click)="reject()">✗ Reject</button>
          </div>
        }
      </div>
    </ng-template>

    <!-- Form Template -->
    <ng-template #formTemplate>
      <div class="form-section">
        <h4>Form</h4>
        @if (currentForm()) {
          <p class="form-description">{{ currentNode()!.data['description'] || 'Please fill out the form below.' }}</p>
          @if (formError()) {
            <div class="form-error error-message alert-error">
              <span>{{ formError() }}</span>
              <button type="button" class="btn-close" (click)="formError.set(null)">×</button>
            </div>
          }
          <form #form="ngForm" (submit)="onFormSubmit($event)">
            <div class="form-fields">
              @for (element of currentForm()!.elements; track element.id; let i = $index) {
                <app-form-field
                  [element]="element"
                  [value]="formData()[element.label]"
                  [fieldIndex]="i"
                  (valueChange)="onFormFieldChange(element.label, $event)"
                ></app-form-field>
              }
            </div>
            <div class="form-actions">
              <button
                type="submit"
                class="btn btn-primary"
                [disabled]="formSubmitting()"
              >
                {{ formSubmitting() ? 'Submitting...' : 'Submit Form' }}
              </button>
            </div>
          </form>
        } @else {
          <p>Loading form...</p>
        }
      </div>
    </ng-template>

    <!-- Parallel Template -->
    <ng-template #parallelTemplate>
      <div class="parallel-section">
        <h4>Parallel Approval</h4>
        <p class="parallel-mode-hint">
          @if (currentNode()!.data['parallelMode'] === 'any') {
            Any approver can approve to continue (OR logic).
          } @else {
            All approvers must approve for the workflow to continue (AND logic).
          }
        </p>
        @if (currentNode()!.data['approvers']) {
          <div class="approvers-list">
            <h5>Required Approvers ({{ getParallelApprovalProgress() }}):</h5>
            @for (approver of $any(currentNode()!.data['approvers']); track approver) {
              <div class="approver-item" [class.approved]="isApproverApproved(approver)">
                <div class="approver-avatar" [class.avatar-approved]="isApproverApproved(approver)">
                  {{ getApproverInitials(approver) }}
                </div>
                <div class="approver-info">
                  <span class="approver-name">{{ getApproverDisplayName(approver) }}</span>
                  <span class="approver-status-text">
                    @if (isApproverApproved(approver)) {
                      <span class="status-approved">✓ Approved</span>
                    } @else {
                      <span class="status-pending">○ Pending</span>
                    }
                  </span>
                </div>
              </div>
            }
          </div>
        }
        <div class="parallel-actions">
          @if (canCurrentUserApprove()) {
            <button class="btn btn-success" (click)="completeParallel()">✓ Approve</button>
          } @else {
            <div class="already-approved-badge">✓ You have already approved this step</div>
          }
        </div>
      </div>
    </ng-template>

    <!-- Condition Template - Auto-evaluated by backend -->
    <ng-template #conditionTemplate>
      <div class="condition-section">
        <h4>Condition Check</h4>
        <p>Field: <strong>{{ currentNode()!.data['field'] || 'N/A' }}</strong></p>
        <p>Operator: <strong>{{ currentNode()!.data['operator'] || 'equals' }}</strong></p>
        <p>Value: <strong>{{ currentNode()!.data['value'] || 'N/A' }}</strong></p>
        @if (getConditionFieldValue()) {
          <p class="form-value">Current Value: <code>{{ getConditionFieldValue() }}</code></p>
        }
        <p class="condition-note">Condition is being evaluated automatically...</p>
      </div>
    </ng-template>

    <!-- Script Template -->
    <ng-template #scriptTemplate>
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
    </ng-template>

    <!-- SetValue Template -->
    <ng-template #setvalueTemplate>
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
    </ng-template>

    <!-- Transform Template -->
    <ng-template #transformTemplate>
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
    </ng-template>

    <!-- Join Template -->
    <ng-template #joinTemplate>
      <div class="join-section">
        <h4>Join - Synchronizing</h4>
        <p>All parallel paths have completed. Workflow is proceeding.</p>
        <button class="btn btn-primary" (click)="advanceWorkflow()">Continue</button>
      </div>
    </ng-template>

    <!-- Sub-Workflow Template -->
    <ng-template #subWorkflowTemplate>
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
    </ng-template>

    <!-- End Template -->
    <ng-template #endTemplate>
      <div class="end-section">
        <h4>End of Workflow</h4>
        <button class="btn btn-primary" (click)="finishWorkflow()">Finish</button>
      </div>
    </ng-template>
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
    .not-found h2 { margin-bottom: 0.5rem; }
    .not-found p { color: var(--color-text-muted); margin-bottom: 1rem; }
    .completed-banner {
      background: #dcfce7;
      color: #166534;
      padding: 0.75rem 1rem;
      border-radius: var(--radius-md);
      margin-bottom: 1rem;
      font-weight: 500;
    }
    .player-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 2rem;
    }
    .player-header h1 { font-size: 1.5rem; margin-bottom: 0.25rem; }
    .player-header p { color: var(--color-text-muted); font-size: 0.875rem; }
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
    .progress-steps h3 { font-size: 1rem; margin-bottom: 1rem; }
    .steps-list { display: flex; flex-direction: column; gap: 0.5rem; }
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
    .step-item.pending { opacity: 0.6; }
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
    .step-info { display: flex; flex-direction: column; }
    .step-type { font-size: 0.625rem; text-transform: uppercase; opacity: 0.8; }
    .step-label { font-size: 0.875rem; font-weight: 500; }

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
    .start-icon { background: #dbeafe; }
    .completed-icon {
      background: var(--color-success);
      color: white;
    }
    .start-section h2, .completed-section h2 { margin-bottom: 0.5rem; }
    .start-section p, .completed-section p {
      color: var(--color-text-muted);
      margin-bottom: 1.5rem;
    }
    .btn-lg { padding: 0.875rem 2rem; font-size: 1rem; }
    .summary {
      background: var(--color-background);
      border-radius: var(--radius-md);
      padding: 1rem;
      margin: 1.5rem 0;
      text-align: left;
    }
    .summary h4 { font-size: 0.875rem; margin-bottom: 0.5rem; }
    .summary ul {
      font-size: 0.875rem;
      color: var(--color-text-muted);
      padding-left: 1.25rem;
    }

    /* Active Step */
    .active-step { padding: 1rem 0; }
    .step-header { margin-bottom: 1.5rem; }
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
    .step-header h2 { font-size: 1.5rem; }
    .step-description { color: var(--color-text-muted); margin-bottom: 1.5rem; }

    /* Node Sections */
    .task-form, .approval-section, .parallel-section, .condition-section,
    .end-section, .sub-workflow-section, .join-section, .form-section {
      background: var(--color-background);
      border-radius: var(--radius-lg);
      padding: 1.5rem;
      margin-bottom: 1.5rem;
    }
    .task-form h4, .approval-section h4, .parallel-section h4,
    .condition-section h4, .end-section h4, .sub-workflow-section h4,
    .join-section h4, .form-section h4 {
      font-size: 1rem;
      margin-bottom: 0.75rem;
    }
    .parallel-section { background: #ecfdf5; border: 1px solid #10b981; }
    .parallel-mode-hint { font-size: 0.875rem; color: var(--color-text-muted); margin-bottom: 1rem; }
    .approvers-list { margin: 1rem 0; }
    .approvers-list h5 { font-size: 0.875rem; margin-bottom: 0.75rem; }
    .approver-item {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.75rem;
      background: var(--color-surface);
      border-radius: var(--radius-md);
      margin-bottom: 0.5rem;
    }
    .approver-item.approved { background: #d1fae5; }
    .approver-avatar {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: var(--color-secondary);
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.875rem;
      font-weight: 600;
      flex-shrink: 0;
    }
    .approver-avatar.avatar-approved { background: var(--color-success); }
    .approver-info { flex: 1; }
    .approver-name { font-weight: 500; display: block; }
    .approver-status-text { font-size: 0.75rem; }
    .status-approved { color: var(--color-success); font-weight: 600; }
    .status-pending { color: var(--color-text-muted); }
    .already-approved-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.375rem;
      padding: 0.5rem 1rem;
      background: #d1fae5;
      color: #065f46;
      border-radius: var(--radius-md);
      font-size: 0.875rem;
      font-weight: 500;
    }
    .condition-section { background: #fffbeb; border: 1px solid #f59e0b; }
    .join-section { background: #eff6ff; border: 1px solid #3b82f6; }
    .approval-progress, .form-value { font-size: 0.875rem; color: var(--color-text-muted); margin-top: 0.5rem; }
    .form-value code {
      background: var(--color-surface);
      padding: 0.125rem 0.5rem;
      border-radius: var(--radius-sm);
    }
    .parallel-actions { margin-top: 1rem; }
    .sub-workflow-section { background: #fdf4ff; border: 1px solid #ec4899; }
    .sub-workflow-section .child-workflow-name { font-weight: 500; margin-bottom: 1rem; }
    .script-section { background: #fff7ed; border: 1px solid #f97316; }
    .script-section h4 { color: #c2410c; }
    .setvalue-section { background: #f0fdf4; border: 1px solid #22c55e; }
    .setvalue-section h4 { color: #15803d; }
    .transform-section { background: #faf5ff; border: 1px solid #a855f7; }
    .transform-section h4 { color: #7e22ce; }
    .script-preview, .setvalue-preview, .transform-preview { margin-bottom: 0.75rem; }
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
    .waiting-message p { margin-bottom: 0.5rem; }
    .child-status { font-size: 0.875rem; color: #666; }
    .approval-actions { display: flex; gap: 1rem; margin-top: 1rem; }
    .btn-success { background: var(--color-success); color: white; }
    .btn-danger { background: var(--color-danger); color: white; }
    .condition-note { font-size: 0.875rem; color: var(--color-text-muted); margin: 1rem 0; }
    .form-description { color: var(--color-text-muted); margin-bottom: 1rem; }
    .form-actions { margin-top: 1.5rem; }
    .form-error {
      display: flex;
      align-items: center;
      justify-content: space-between;
      background: #fef2f2;
      border: 1px solid #ef4444;
      border-radius: var(--radius-md);
      padding: 0.75rem 1rem;
      margin-bottom: 1rem;
      color: #dc2626;
      font-size: 0.875rem;
    }
    .form-error span { flex: 1; }
    .btn-close {
      background: none;
      border: none;
      font-size: 1.25rem;
      color: #dc2626;
      cursor: pointer;
      padding: 0 0.25rem;
      line-height: 1;
    }
    .btn-close:hover { opacity: 0.7; }
    .approvers-list { margin: 1rem 0; }
    .approvers-list h5 { font-size: 0.875rem; margin-bottom: 0.5rem; color: var(--color-text-muted); }
    .approver-item {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.5rem 0.75rem;
      background: var(--color-surface);
      border-radius: var(--radius-md);
      margin-bottom: 0.5rem;
    }
    .approver-item.approved { background: #ecfdf5; }
    .approver-status { font-size: 1rem; }
    .approver-name { flex: 1; font-weight: 500; }
    .approver-badge {
      font-size: 0.75rem;
      padding: 0.125rem 0.5rem;
      border-radius: var(--radius-sm);
    }
    .badge-approved { background: var(--color-success); color: white; }
    .badge-pending { background: #e5e7eb; color: #6b7280; }
    .already-approved { font-size: 0.875rem; color: var(--color-text-muted); font-style: italic; }
  `]
})
export class WorkflowPlayerComponent implements OnInit {
  @ViewChildren(FormFieldComponent) formFields?: QueryList<FormFieldComponent>;

  workflow = signal<Workflow | null>(null);
  instance = signal<WorkflowInstance | null>(null);
  loading = signal(true);
  scriptResult = signal<string | null>(null);
  lastSetValue = signal<string | null>(null);
  transformResult = signal<string | null>(null);
  currentForm = signal<Form | null>(null);
  formData = signal<Record<string, unknown>>({});
  formSubmitting = signal(false);
  formError = signal<string | null>(null);

  // Computed properties
  isCompletedInstance = computed((): boolean => {
    const inst = this.instance();
    return inst?.status === 'COMPLETED';
  });
  
  currentNode = computed((): WorkflowNode | null => {
    const inst = this.instance();
    const wf = this.workflow();
    if (!inst || !wf || !inst.currentNodeId) return null;
    return wf.nodes.find(n => n.id === inst.currentNodeId) ?? null;
  });

  showNextButton = computed((): boolean => {
    const node = this.currentNode();
    if (!node) return false;
    // Only show generic Next Step for nodes without their own action button:
    // - 'start' has no dedicated template button
    // - 'join', 'script', 'setvalue', 'transform' have their own buttons in their templates
    // - 'task' has no dedicated advance button
    return node.type === 'start';
  });

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private workflowService: WorkflowService,
    private auth: AuthService,
    private formService: FormService,
    private ngZone: NgZone
  ) {}

  ngOnInit(): void {
    const workflowId = this.route.snapshot.paramMap.get('id');
    const instanceId = this.route.snapshot.paramMap.get('instanceId');
    if (workflowId) {
      if (instanceId) {
        this.loadWorkflowAndSpecificInstance(workflowId, instanceId);
      } else {
        this.loadWorkflowAndInstance(workflowId);
      }
    } else {
      this.loading.set(false);
    }
  }
  
  private loadWorkflowAndSpecificInstance(workflowId: string, instanceId: string): void {
    this.workflowService.getById(workflowId).subscribe({
      next: (workflow) => {
        this.workflow.set(workflow);
        this.workflowService.getInstance(instanceId).subscribe({
          next: (instance) => {
            this.instance.set(instance);
            this.formData.set(instance.formData ?? {});
            this.loadFormForCurrentNode(workflow);
            this.loading.set(false);
          },
          error: () => {
            this.formError.set('Failed to load workflow instance.');
            this.loading.set(false);
          }
        });
      },
      error: () => {
        this.workflow.set(null);
        this.formError.set('Failed to load workflow.');
        this.loading.set(false);
      }
    });
  }

  getNodeConfig(type: WorkflowNodeType): NodeTypeConfig {
    return NODE_TYPE_CONFIGS[type];
  }

  isCurrentStep(nodeId: string): boolean {
    return this.instance()?.currentNodeId === nodeId;
  }

  isStepCompleted(nodeId: string): boolean {
    const inst = this.instance();
    if (!inst) return false;
    const wf = this.workflow();
    if (!wf) return false;

    // If in history, it's completed
    if (inst.history.some(h => h.nodeId === nodeId)) return true;

    // For start node: completed if workflow is in-progress
    const node = wf.nodes.find(n => n.id === nodeId);
    if (node?.type === 'start') {
      return inst.status === 'IN_PROGRESS' || inst.status === 'COMPLETED';
    }

    // For other nodes: compare indices
    const currentIdx = wf.nodes.findIndex(n => n.id === inst.currentNodeId);
    const nodeIdx = wf.nodes.findIndex(n => n.id === nodeId);
    return nodeIdx < currentIdx;
  }

  isStepPending(nodeId: string): boolean {
    return !this.isCurrentStep(nodeId) && !this.isStepCompleted(nodeId);
  }

  onFormFieldChange(elementLabel: string, value: unknown): void {
    // Use element.label as the form data key to match backend condition field names.
    const fieldKey = elementLabel;
    this.formData.update(data => ({ ...data, [fieldKey]: value }));
  }

  private loadWorkflowAndInstance(workflowId: string): void {
    this.workflowService.getById(workflowId).subscribe({
      next: (workflow) => {
        this.workflow.set(workflow);
        this.workflowService.getAllInstances().subscribe({
          next: (instances) => {
            const existing = instances.find(
              (i: WorkflowInstance) => i.workflowId === workflowId && i.status !== 'COMPLETED'
            );

            if (existing) {
              this.instance.set(existing);
              this.formData.set(existing.formData ?? {});
              this.loadFormForCurrentNode(workflow);
            } else {
              this.instance.set(this.createPendingInstance(workflowId, workflow.name));
            }
            this.loading.set(false);
          },
          error: () => {
            this.instance.set(this.createPendingInstance(workflowId, workflow.name));
            this.loading.set(false);
          }
        });
      },
      error: () => {
        this.workflow.set(null);
        this.formError.set('Failed to load workflow. Please try again.');
        this.loading.set(false);
      }
    });
  }

  private createPendingInstance(workflowId: string, workflowName: string): WorkflowInstance {
    return {
      id: '',
      workflowId,
      workflowName,
      currentNodeId: null,
      status: 'PENDING',
      formData: {},
      history: []
    };
  }

  private loadFormForCurrentNode(workflow: Workflow): void {
    const currentNode = this.currentNode();
    const formId = currentNode?.data?.['formId'];
    if (currentNode?.type === 'form' && typeof formId === 'string' && formId) {
      this.loadForm(formId);
    }
  }

  startWorkflow(): void {
    const inst = this.instance();
    const wf = this.workflow();
    if (!inst || !wf) return;

    const startNode = wf.nodes.find(n => n.type === 'start');
    if (!startNode) return;

    const currentUser = this.auth.user();
    const userId = currentUser?.id || 'admin';
    this.workflowService.startInstance(wf.id, userId).subscribe({
      next: (startedInst: WorkflowInstance) => {
        this.instance.set(startedInst);
        this.formData.set(startedInst.formData ?? {});
        this.loadFormForCurrentNode(wf);
      },
      error: () => {
        const nextNodeIdx = wf.nodes.findIndex(n => n.type === 'start') + 1;
        const nextNode = wf.nodes[nextNodeIdx];
        const nextNodeId = nextNode ? nextNode.id : startNode.id;

        this.instance.set({
          ...inst,
          history: [...inst.history, {
            nodeId: startNode.id,
            action: `Started: ${startNode.data['label'] || startNode.type}`,
            timestamp: new Date()
          }],
          currentNodeId: nextNodeId,
          status: 'IN_PROGRESS'
        });
      }
    });
  }

  advanceWorkflow(): void {
    const inst = this.instance();
    const wf = this.workflow();
    if (!inst || !wf) return;

    if (inst.status === 'WAITING_FOR_CHILD') return;

    const currentIdx = wf.nodes.findIndex(n => n.id === inst.currentNodeId);
    if (currentIdx < 0) return;

    const currentNode = wf.nodes[currentIdx];

    // Auto-execute nodes that need it
    if (currentNode.type === 'script' || currentNode.type === 'setvalue' || currentNode.type === 'transform') {
      this.executeAndAdvance(currentNode);
      return;
    }

    // At last node
    if (currentIdx >= wf.nodes.length - 1) {
      this.finishWorkflow();
      return;
    }

    this.moveToNextNode(currentNode, currentIdx, wf);
  }

  private moveToNextNode(currentNode: WorkflowNode, currentIdx: number, wf: Workflow): void {
    const inst = this.instance();
    if (!inst) return;

    const nextNode = wf.nodes[currentIdx + 1];
    console.log('[DEBUG] moveToNextNode:', { currentNodeId: currentNode.id, nextNodeId: nextNode?.id, nextNodeType: nextNode?.type });
    const historyEntry = {
      nodeId: currentNode.id,
      action: `Completed: ${currentNode.data['label'] || currentNode.type}`,
      timestamp: new Date()
    };
    const newHistory = inst.history.some(h => h.nodeId === currentNode.id)
      ? inst.history
      : [...inst.history, historyEntry];

    if (nextNode.type === 'end') {
      this.workflowService.completeInstance(inst.id).subscribe({
        next: (updated) => this.instance.set(updated),
        error: () => this.instance.set({ ...inst, status: 'COMPLETED' })
      });
    } else {
      // Backend auto-evaluates condition nodes, so just advance
      this.workflowService.advanceInstance(inst.id, nextNode.id, newHistory).subscribe({
        next: (updated) => {
          // Backend should have already auto-evaluated any condition nodes
          // Just update the instance with whatever the backend returned
          this.instance.set(updated);
        },
        error: () => {
          this.instance.set({
            ...inst,
            currentNodeId: nextNode.id,
            history: newHistory,
            status: inst.status
          });
        }
      });
    }
  }

  approve(): void {
    const inst = this.instance();
    if (!inst) return;

    const currentNode = this.currentNode();
    const currentUser = this.auth.user();

    if (currentNode?.type === 'parallel') {
      this.completeParallel();
      return;
    }

    this.instance.set({
      ...inst,
      history: [...inst.history, {
        nodeId: currentNode?.id ?? '',
        action: `Approved by ${currentUser?.name || 'User'}`,
        timestamp: new Date()
      }]
    });

    this.advanceWorkflow();
  }

  reject(): void {
    const inst = this.instance();
    if (!inst) return;

    const currentNode = this.currentNode();

    this.workflowService.completeInstance(inst.id).subscribe({
      next: (updated) => this.instance.set({
        ...updated,
        history: [...(updated.history ?? []), {
          nodeId: currentNode?.id ?? '',
          action: 'Rejected',
          timestamp: new Date()
        }]
      }),
      error: () => this.instance.set({
        ...inst,
        status: 'COMPLETED',
        history: [...inst.history, {
          nodeId: currentNode?.id ?? '',
          action: 'Rejected',
          timestamp: new Date()
        }]
      })
    });
  }

  getConditionFieldValue(): string | null {
    const inst = this.instance();
    const node = this.currentNode();
    if (!inst || !node || node.type !== 'condition') return null;
    const field = node.data['field'] as string;
    if (!field) return null;
    return String(inst.formData[field] ?? '');
  }

  completeParallel(): void {
    const inst = this.instance();
    const wf = this.workflow();
    const currentNode = this.currentNode();
    const currentUser = this.auth.user();

    if (!inst || !wf || !currentNode || currentNode.type !== 'parallel') {
      this.advanceWorkflow();
      return;
    }

    const approvers = (currentNode.data['approvers'] as string[]) || [];

    // Initialize parallel approval if not already done
    const existingParallel = this.getParallelApprovalState(currentNode.id);
    if (!existingParallel) {
      this.workflowService.initParallelApproval(inst.id, currentNode.id, approvers).subscribe({
        next: (updated) => {
          this.instance.set(updated);
          // Now approve as current user
          if (currentUser) {
            this.doParallelApprove(updated, currentNode.id, currentUser.id);
          }
        },
        error: () => {
          // Fall back to local-only handling
          this.handleParallelApprovalLocally(currentUser, approvers);
        }
      });
    } else if (currentUser && !existingParallel.approvals.includes(currentUser.id)) {
      // Already initialized, just record this approval
      this.doParallelApprove(inst, currentNode.id, currentUser.id);
    }
  }

  private doParallelApprove(inst: any, nodeId: string, approverId: string): void {
    const wf = this.workflow();
    if (!wf) return;

    this.workflowService.approveParallel(inst.id, nodeId, approverId).subscribe({
      next: (result) => {
        this.instance.set(result.instance);
        if (result.allApproved) {
          // All approved - advance to next node
          setTimeout(() => this.advanceWorkflow(), 300);
        }
      },
      error: () => {
        // Fall back to local handling
        this.handleParallelApprovalLocally({ id: approverId } as any, inst.formData?.parallelApprovals?.[nodeId]?.requiredApprovers || []);
      }
    });
  }

  private handleParallelApprovalLocally(currentUser: { id: string; name?: string } | null, approvers: string[]): void {
    const inst = this.instance();
    const wf = this.workflow();
    const currentNode = this.currentNode();

    if (!inst || !wf || !currentNode) return;

    let parallelState = inst.parallelApprovals;
    if (!parallelState || parallelState.parallelNodeId !== currentNode.id) {
      parallelState = {
        parallelNodeId: currentNode.id,
        requiredApprovers: approvers,
        approvals: [],
        status: 'PENDING'
      };
    }

    if (currentUser && !parallelState.approvals.includes(currentUser.id)) {
      parallelState.approvals.push(currentUser.id);
    }

    const allApproved = parallelState.requiredApprovers.length === 0 ||
      parallelState.requiredApprovers.every(a => parallelState!.approvals.includes(a));

    const historyEntry = {
      nodeId: currentNode.id,
      action: `Parallel task approved: ${parallelState.approvals.length}/${parallelState.requiredApprovers.length || '?'} approvers`,
      timestamp: new Date()
    };

    if (allApproved) {
      const currentIdx = wf.nodes.findIndex(n => n.id === currentNode.id);
      const joinNode = wf.nodes.find((n, idx) => idx > currentIdx && n.type === 'join');

      if (joinNode) {
        const newStatus = joinNode.type === 'end' ? 'COMPLETED' : inst.status;
        this.instance.set({
          ...inst,
          currentNodeId: joinNode.id,
          parallelApprovals: undefined,
          history: [...inst.history, historyEntry],
          status: newStatus
        });
      } else {
        this.advanceWorkflow();
      }
    } else {
      this.instance.set({
        ...inst,
        parallelApprovals: { ...parallelState },
        history: [...inst.history, historyEntry]
      });
    }
  }

  private getParallelApprovalState(nodeId: string): ParallelApprovalState | undefined {
    const inst = this.instance();
    if (!inst) return undefined;

    const formData = inst.formData as FormDataType;
    const parallelApprovals = formData?.parallelApprovals;
    return parallelApprovals?.[nodeId];
  }

  isApproverApproved(approverName: string): boolean {
    const currentNode = this.currentNode();
    if (!currentNode || currentNode.type !== 'parallel') return false;

    const parallelState = this.getParallelApprovalState(currentNode.id);
    if (parallelState?.approvals?.length) {
      return parallelState.approvals.includes(approverName);
    }

    // Fall back to local parallelApprovals
    const inst = this.instance();
    const localApprovals = inst?.parallelApprovals?.approvals || [];
    return localApprovals.includes(approverName);
  }

  getApproverInitials(approverName: string): string {
    if (!approverName) return '?';
    if (approverName.startsWith('role:')) {
      // Format role names nicely
      const role = approverName.replace('role:', '');
      return role.charAt(0).toUpperCase();
    }
    return approverName.split(' ').map(n => n.charAt(0)).join('').toUpperCase().slice(0, 2);
  }

  getApproverDisplayName(approverName: string): string {
    if (!approverName) return 'Unknown';
    if (approverName.startsWith('role:')) {
      const role = approverName.replace('role:', '');
      return role.charAt(0).toUpperCase() + role.slice(1) + ' (by role)';
    }
    return approverName;
  }

  getParallelApprovalProgress(): string {
    const currentNode = this.currentNode();
    if (!currentNode || currentNode.type !== 'parallel') return '';

    const parallelState = this.getParallelApprovalState(currentNode.id);
    const approvals = parallelState?.approvals || [];
    const required = parallelState?.requiredApprovers ||
      (currentNode.data['approvers'] as string[]) || [];

    return `${approvals.length} of ${required.length} approvers have approved`;
  }

  canCurrentUserApprove(): boolean {
    const currentNode = this.currentNode();
    const currentUser = this.auth.user();
    if (!currentNode || !currentUser || currentNode.type !== 'parallel') return false;

    const parallelState = this.getParallelApprovalState(currentNode.id);
    const approvals = parallelState?.approvals || [];

    // Check if current user (by name/id) has already approved
    return !approvals.includes(currentUser.id) && !approvals.includes(currentUser.name || '');
  }

  startSubWorkflow(): void {
    const inst = this.instance();
    const currentNode = this.currentNode();
    const user = this.auth.user();
    console.log('startSubWorkflow called:', { instId: inst?.id, currentNodeType: currentNode?.type, hasUser: !!user });
    if (!inst || !currentNode || currentNode.type !== 'sub-workflow' || !user) return;

    const childWorkflowId = currentNode.data['childWorkflowId'] as string;
    if (!childWorkflowId) {
      alert('Please select a child workflow in the designer');
      return;
    }

    this.workflowService.createChildInstance(inst.id, childWorkflowId, user.id, inst.formData).subscribe({
      next: (childInstance) => {
        console.log('createChildInstance success:', childInstance);
        // Reload the instance from backend to get updated state
        this.ngZone.run(() => {
          this.workflowService.getInstance(inst.id).subscribe({
            next: (updatedInstance) => {
              console.log('getInstance success, childInstanceId:', updatedInstance.childInstanceId, 'status:', updatedInstance.status);
              this.instance.set(updatedInstance);
            },
            error: (err) => {
              console.log('getInstance error:', err);
              // Fallback: manually update if reload fails
              this.instance.set({
                ...inst,
                childInstanceId: childInstance.id,
                status: 'WAITING_FOR_CHILD',
                history: [...inst.history, {
                  nodeId: currentNode.id,
                  action: `Started sub-workflow: ${currentNode.data['label'] || 'Sub-workflow'}`,
                  timestamp: new Date()
                }]
              });
            }
          });
        });
      },
      error: (err) => {
        console.log('createChildInstance error:', err);
        this.ngZone.run(() => this.formError.set('Failed to start sub-workflow. Please try again.'));
      }
    });
  }

  checkSubWorkflowStatus(): void {
    const inst = this.instance();
    if (!inst?.childInstanceId) return;

    this.workflowService.getInstance(inst.childInstanceId).subscribe({
      next: (childInstance) => {
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
    return currentNode.data['childWorkflowId'] ? 'Sub-workflow' : 'Not selected';
  }

  private resumeFromSubWorkflow(): void {
    const inst = this.instance();
    const currentNode = this.currentNode();
    const wf = this.workflow();
    if (!inst || !currentNode || !wf) return;

    const currentIdx = wf.nodes.findIndex(n => n.id === inst.currentNodeId);
    if (currentIdx >= 0 && currentIdx < wf.nodes.length - 1) {
      const nextNode = wf.nodes[currentIdx + 1];
      const newStatus = nextNode.type === 'end' ? 'COMPLETED' : 'IN_PROGRESS';

      this.instance.set({
        ...inst,
        currentNodeId: nextNode.id,
        childInstanceId: undefined,
        status: newStatus,
        history: [...inst.history, {
          nodeId: currentNode.id,
          action: `Completed: ${currentNode.data['label'] || currentNode.type}`,
          timestamp: new Date()
        }]
      });
    }
  }

  finishWorkflow(): void {
    const inst = this.instance();
    if (!inst) return;

    const currentNode = this.currentNode();
    this.instance.set({
      ...inst,
      status: 'COMPLETED',
      currentNodeId: null,
      history: [...inst.history, {
        nodeId: currentNode?.id ?? '',
        action: `Completed: ${currentNode?.data['label'] || currentNode?.type || 'Workflow'}`,
        timestamp: new Date()
      }]
    });
  }

  executeScript(): void {
    const currentNode = this.currentNode();
    const inst = this.instance();
    if (!currentNode || !inst || currentNode.type !== 'script') return;

    const expression = currentNode.data['expression'] as string;
    const outputField = (currentNode.data['outputField'] as string) || '_scriptResult';

    if (!expression) {
      this.scriptResult.set('Error: No expression defined');
      return;
    }

    try {
      const result = this.safeEvaluate(expression, inst.formData);
      const updatedFormData = { ...inst.formData, [outputField]: result };
      this.scriptResult.set(String(result));
      this.formData.set(updatedFormData);

      this.instance.set({
        ...inst,
        formData: updatedFormData,
        history: [...inst.history, {
          nodeId: currentNode.id,
          action: `Script executed: ${expression} → ${result}`,
          timestamp: new Date()
        }]
      });

      setTimeout(() => this.advanceWorkflow(), 500);
    } catch (err: unknown) {
      this.scriptResult.set(`Error: ${(err as Error).message}`);
    }
  }

  executeSetValue(): void {
    const currentNode = this.currentNode();
    const inst = this.instance();
    if (!currentNode || !inst || currentNode.type !== 'setvalue') return;

    const field = currentNode.data['field'] as string;
    const value = currentNode.data['value'] as string;

    if (!field) {
      this.lastSetValue.set('Error: No field defined');
      return;
    }

    try {
      let resolved: unknown = value;
      if (value?.includes('.')) {
        const parts = value.split('.');
        resolved = this.resolvePath(inst.formData, parts);
      }

      const updatedFormData = { ...inst.formData, [field]: resolved };
      this.instance.set({
        ...inst,
        formData: updatedFormData,
        history: [...inst.history, {
          nodeId: currentNode.id,
          action: `Set value: ${field} = ${resolved}`,
          timestamp: new Date()
        }]
      });
      this.lastSetValue.set(`${field} = ${resolved}`);
      this.formData.set(updatedFormData);

      setTimeout(() => this.advanceWorkflow(), 500);
    } catch (err: unknown) {
      this.lastSetValue.set(`Error: ${(err as Error).message}`);
    }
  }

  executeTransform(): void {
    const currentNode = this.currentNode();
    const inst = this.instance();
    if (!currentNode || !inst || currentNode.type !== 'transform') return;

    const expression = currentNode.data['expression'] as string;
    const outputField = currentNode.data['outputField'] as string;

    if (!expression || !outputField) {
      this.transformResult.set('Error: Missing expression or output field');
      return;
    }

    try {
      const result = this.safeEvaluate(expression, inst.formData);
      const updatedFormData = { ...inst.formData, [outputField]: result };
      this.instance.set({
        ...inst,
        formData: updatedFormData,
        history: [...inst.history, {
          nodeId: currentNode.id,
          action: `Transformed: ${outputField} = ${result}`,
          timestamp: new Date()
        }]
      });
      this.transformResult.set(String(result));
      this.formData.set(updatedFormData);

      setTimeout(() => this.advanceWorkflow(), 500);
    } catch (err: unknown) {
      this.transformResult.set(`Error: ${(err as Error).message}`);
    }
  }

  private executeAndAdvance(currentNode: WorkflowNode): void {
    switch (currentNode.type) {
      case 'script':
        this.executeScript();
        break;
      case 'setvalue':
        this.executeSetValue();
        break;
      case 'transform':
        this.executeTransform();
        break;
      default:
        this.advanceWorkflow();
    }
  }

  private safeEvaluate(expression: string, formData: Record<string, unknown>): unknown {
    const keys = Object.keys(formData);
    const values = Object.values(formData);
    const fn = new Function(...keys, `return ${expression};`);
    return fn(...values);
  }

  private resolvePath(obj: Record<string, unknown>, parts: string[]): unknown {
    let current: unknown = obj;
    for (const part of parts) {
      if (current === null || current === undefined) return undefined;
      current = (current as Record<string, unknown>)[part];
    }
    return current;
  }

  loadForm(formId: string): void {
    this.formService.getById(formId).subscribe({
      next: (form) => {
        this.currentForm.set(form);
        const inst = this.instance();
        this.formData.set(inst?.formData ?? {});
      },
      error: () => this.currentForm.set(null)
    });
  }

  submitFormAndAdvance(): void {
    // Legacy method - now uses onFormSubmit via form submit event
    this.onFormSubmit(new Event('submit'));
  }

  validateForm(): string | null {
    const form = this.currentForm();
    const data = this.formData();
    if (!form) return null;

    for (const element of form.elements) {
      const value = data[element.label] as string | null | undefined;
      
      if (element.required) {
        if (!value || value.trim() === '') {
          return `${element.label} is required`;
        }
      }
      // Email validation
      if (element.type === 'email' && value) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) {
          return `Invalid email format for ${element.label}`;
        }
      }
    }
    return null;
  }

  onFormSubmit(event: Event): void {
    event.preventDefault();
    
    const inst = this.instance();
    const form = this.currentForm();
    if (!inst || !form) return;

    // Validate required fields
    const validationError = this.validateForm();
    if (validationError) {
      this.formError.set(validationError);
      return;
    }

    this.formSubmitting.set(true);
    const data = this.formData();

    this.workflowService.updateInstance(inst.id, { formData: data }).subscribe({
      next: (updated) => {
        this.instance.set(updated);
        this.formSubmitting.set(false);
        setTimeout(() => this.advanceWorkflow(), 300);
      },
      error: () => {
        this.formSubmitting.set(false);
        this.formError.set('Failed to submit form. Please try again.');
      }
    });
  }

  // Test helper: allow E2E tests to directly set formData and submit
  __testSetFormData(data: Record<string, unknown>): void {
    this.formData.set(data);
  }
  __testSubmitForm(): void {
    this.onFormSubmit(new Event('submit'));
  }
}
