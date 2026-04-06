import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { WorkflowService } from '../../core/services/workflow.service';
import { AuthService } from '../../core/services/auth.service';
import { Workflow, WorkflowNode } from '../../core/models';

// WorkflowInstance interface - defined locally since not exported from service
interface WorkflowInstance {
  id: string;
  workflowId: string;
  userId: string;
  currentNodeId: string | null;
  status: string;
  formData: Record<string, any>;
  history: Array<{nodeId: string; action: string; timestamp: string | Date}>;
  createdAt: string;
  updatedAt: string;
}

type NodeStatus = 'COMPLETED' | 'IN_PROGRESS' | 'PENDING';

interface WorkflowStep {
  node: WorkflowNode;
  status: NodeStatus;
  completedAt?: Date | string;
}

@Component({
  selector: 'app-workflow-instance-detail',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="instance-detail">
      @if (loading()) {
        <div class="loading">Loading workflow instance...</div>
      } @else if (!instance()) {
        <div class="not-found">
          <h2>Workflow Instance Not Found</h2>
          <p>The workflow instance you're looking for doesn't exist.</p>
          <a routerLink="/workflows" class="btn btn-secondary">Back to Workflows</a>
        </div>
      } @else {
        <!-- Header -->
        <header class="detail-header">
          <div class="header-info">
            <h1>Workflow Instance #{{ instance()!.id.slice(0, 8) }}</h1>
            <div class="header-meta">
              <span class="status-badge" [class]="getStatusClass(instance()!.status)">
                {{ formatStatus(instance()!.status) }}
              </span>
              <span class="current-step" *ngIf="currentStep()">
                Current Step: <strong>{{ currentStep()!.node.data['label'] || currentStep()!.node.type }}</strong>
              </span>
            </div>
          </div>
          <a routerLink="/workflows" class="btn btn-secondary">Back to Workflows</a>
        </header>

        <!-- Workflow Steps -->
        <section class="workflow-steps">
          <h2>Workflow Steps</h2>
          <div class="steps-timeline">
            @for (step of steps(); track step.node.id; let i = $index) {
              <div 
                class="step-card"
                [class.completed]="step.status === 'COMPLETED'"
                [class.in-progress]="step.status === 'IN_PROGRESS'"
                [class.pending]="step.status === 'PENDING'"
              >
                <div class="step-indicator">
                  @if (step.status === 'COMPLETED') {
                    <span class="icon completed-icon">✓</span>
                  } @else if (step.status === 'IN_PROGRESS') {
                    <span class="icon in-progress-icon">⟳</span>
                  } @else {
                    <span class="icon pending-icon">⏳</span>
                  }
                </div>
                <div class="step-content">
                  <div class="step-name">
                    {{ step.node.data['label'] || step.node.type }}
                  </div>
                  <div class="step-type">{{ getNodeTypeLabel(step.node.type) }}</div>
                  @if (step.completedAt) {
                    <div class="step-time">{{ step.completedAt | date:'short' }}</div>
                  }
                  @if (step.status === 'IN_PROGRESS') {
                    <div class="current-marker">← Current</div>
                  }
                </div>
                <div class="step-status-badge" [class]="step.status.toLowerCase()">
                  {{ step.status }}
                </div>
              </div>
            }
          </div>
        </section>

        <!-- History Timeline -->
        <section class="history-section">
          <h2>History</h2>
          <div class="history-timeline">
            @if (instance()!.history.length === 0) {
              <p class="no-history">No history yet.</p>
            } @else {
              @for (entry of instance()!.history; track entry.timestamp) {
                <div class="history-entry">
                  <span class="history-time">{{ entry.timestamp | date:'shortTime' }}</span>
                  <span class="history-separator">-</span>
                  <span class="history-action">{{ entry.action }}</span>
                </div>
              }
            }
          </div>
        </section>

        <!-- Action Buttons (if in-progress and current step is approval or parallel) -->
        @if (instance()!.status === 'in-progress' && currentStep() && (currentStep()!.node.type === 'approval' || currentStep()!.node.type === 'parallel')) {
          <section class="action-buttons">
            @if (currentStep()!.node.type === 'parallel') {
              <!-- Parallel approval: show progress and button -->
              <div class="parallel-progress">
                <span>{{ getParallelProgress() }}</span>
              </div>
              @if (canApproveParallel()) {
                <button class="btn btn-success" (click)="approve()">✓ Approve</button>
              } @else {
                <span class="already-approved">You have already approved</span>
              }
            } @else {
              <button class="btn btn-success" (click)="approve()">✓ Approve</button>
              <button class="btn btn-danger" (click)="reject()">✗ Reject</button>
              <button class="btn btn-secondary" (click)="requestInfo()">? Request Info</button>
            }
          </section>
        }
      }
    </div>
  `,
  styles: [`
    .instance-detail {
      max-width: 900px;
      margin: 0 auto;
      padding: 2rem;
    }
    .loading, .not-found {
      text-align: center;
      padding: 4rem 2rem;
    }
    .detail-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 2rem;
      padding: 1.5rem;
      background: var(--color-surface);
      border-radius: var(--radius-lg);
    }
    .detail-header h1 {
      font-size: 1.5rem;
      margin-bottom: 0.5rem;
    }
    .header-meta {
      display: flex;
      align-items: center;
      gap: 1rem;
    }
    .status-badge {
      padding: 0.25rem 0.75rem;
      border-radius: var(--radius-sm);
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
    }
    .status-badge.pending { background: #fef3c7; color: #92400e; }
    .status-badge.in-progress { background: #dbeafe; color: #1e40af; }
    .status-badge.waiting-for-child { background: #ede9fe; color: #5b21b6; }
    .status-badge.completed { background: #d1fae5; color: #065f46; }
    .current-step {
      color: var(--color-text-muted);
      font-size: 0.875rem;
    }
    
    /* Steps Timeline */
    .workflow-steps {
      background: var(--color-surface);
      border-radius: var(--radius-lg);
      padding: 1.5rem;
      margin-bottom: 1.5rem;
    }
    .workflow-steps h2 {
      font-size: 1.125rem;
      margin-bottom: 1rem;
    }
    .steps-timeline {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }
    .step-card {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 1rem;
      border-radius: var(--radius-md);
      background: var(--color-background);
      border-left: 4px solid transparent;
    }
    .step-card.completed {
      border-left-color: var(--color-success);
      opacity: 0.85;
    }
    .step-card.in-progress {
      border-left-color: var(--color-primary);
      background: #eff6ff;
    }
    .step-card.pending {
      border-left-color: #d1d5db;
      opacity: 0.7;
    }
    .step-indicator {
      width: 40px;
      height: 40px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
      font-size: 1.25rem;
    }
    .completed-icon {
      background: var(--color-success);
      color: white;
    }
    .in-progress-icon {
      background: var(--color-primary);
      color: white;
    }
    .pending-icon {
      background: #d1d5db;
      color: #6b7280;
    }
    .step-content {
      flex: 1;
    }
    .step-name {
      font-weight: 600;
      margin-bottom: 0.125rem;
    }
    .step-type {
      font-size: 0.75rem;
      color: var(--color-text-muted);
      text-transform: uppercase;
    }
    .step-time {
      font-size: 0.75rem;
      color: var(--color-text-muted);
      margin-top: 0.25rem;
    }
    .current-marker {
      font-size: 0.75rem;
      color: var(--color-primary);
      font-weight: 600;
      margin-top: 0.25rem;
    }
    .step-status-badge {
      padding: 0.25rem 0.5rem;
      border-radius: var(--radius-sm);
      font-size: 0.625rem;
      font-weight: 600;
      text-transform: uppercase;
    }
    .step-status-badge.completed { background: #d1fae5; color: #065f46; }
    .step-status-badge.in_progress { background: #dbeafe; color: #1e40af; }
    .step-status-badge.pending { background: #f3f4f6; color: #6b7280; }
    
    /* History */
    .history-section {
      background: var(--color-surface);
      border-radius: var(--radius-lg);
      padding: 1.5rem;
      margin-bottom: 1.5rem;
    }
    .history-section h2 {
      font-size: 1.125rem;
      margin-bottom: 1rem;
    }
    .history-timeline {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }
    .history-entry {
      font-size: 0.875rem;
      padding: 0.5rem;
      background: var(--color-background);
      border-radius: var(--radius-sm);
    }
    .history-time {
      color: var(--color-text-muted);
      font-weight: 500;
    }
    .history-separator {
      margin: 0 0.5rem;
      color: var(--color-text-muted);
    }
    .history-action {
      color: var(--color-text);
    }
    .no-history {
      color: var(--color-text-muted);
      font-size: 0.875rem;
      font-style: italic;
    }
    
    /* Actions */
    .action-buttons {
      display: flex;
      gap: 1rem;
      justify-content: center;
      align-items: center;
      padding: 1rem;
      background: var(--color-surface);
      border-radius: var(--radius-lg);
    }
    .action-buttons .parallel-progress {
      font-size: 0.875rem;
      color: var(--color-text-muted);
    }
    .action-buttons .already-approved {
      font-size: 0.875rem;
      color: var(--color-text-muted);
      font-style: italic;
    }
    .btn-success {
      background: var(--color-success);
      color: white;
    }
    .btn-danger {
      background: var(--color-danger);
      color: white;
    }
  `]
})
export class WorkflowInstanceDetailComponent implements OnInit {
  workflow = signal<Workflow | null>(null);
  instance = signal<WorkflowInstance | null>(null);
  loading = signal(true);

  steps = computed<WorkflowStep[]>(() => {
    const wf = this.workflow();
    const inst = this.instance();
    if (!wf || !inst) return [];

    return wf.nodes.map(node => {
      const status = this.getStepStatus(node.id);
      const historyEntry = inst.history.find(h => h.nodeId === node.id);
      
      return {
        node,
        status,
        completedAt: historyEntry?.timestamp
      };
    });
  });

  currentStep = computed<WorkflowStep | null>(() => {
    const inst = this.instance();
    return this.steps().find(s => s.status === 'IN_PROGRESS') || null;
  });

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private workflowService: WorkflowService,
    private auth: AuthService
  ) {}

  ngOnInit() {
    const instanceId = this.route.snapshot.paramMap.get('id');
    if (instanceId) {
      this.loadInstance(instanceId);
    } else {
      this.loading.set(false);
    }
  }

  loadInstance(instanceId: string) {
    this.loading.set(true);
    this.workflowService.getInstance(instanceId).subscribe({
      next: (instance: any) => {
        this.instance.set(instance);
        // Load associated workflow
        if (instance.workflowId) {
          this.workflowService.getById(instance.workflowId).subscribe({
            next: (workflow: any) => {
              this.workflow.set(workflow);
              this.loading.set(false);
            },
            error: () => {
              this.workflow.set(null);
              this.loading.set(false);
            }
          });
        } else {
          this.loading.set(false);
        }
      },
      error: () => {
        this.instance.set(null);
        this.loading.set(false);
      }
    });
  }

  getStepStatus(nodeId: string): NodeStatus {
    const inst = this.instance();
    const wf = this.workflow();
    if (!inst || !wf) return 'PENDING';

    // If current node
    if (inst.currentNodeId === nodeId) {
      return 'IN_PROGRESS';
    }

    // If in history, it's completed
    if (inst.history.some(h => h.nodeId === nodeId)) {
      return 'COMPLETED';
    }

    // For nodes before current (based on order)
    const currentIdx = wf.nodes.findIndex(n => n.id === inst.currentNodeId);
    const nodeIdx = wf.nodes.findIndex(n => n.id === nodeId);
    
    if (nodeIdx < currentIdx && currentIdx >= 0) {
      return 'COMPLETED';
    }

    return 'PENDING';
  }

  getNodeTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      'start': 'Start',
      'end': 'End',
      'task': 'Task',
      'condition': 'Condition',
      'approval': 'Approval',
      'parallel': 'Parallel Split',
      'join': 'Join',
      'sub-workflow': 'Sub-Workflow'
    };
    return labels[type] || type;
  }

  getStatusClass(status: string): string {
    return status;
  }

  formatStatus(status: string): string {
    return status.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  }

  getParallelProgress(): string {
    const step = this.currentStep();
    const inst = this.instance();
    if (!step || !inst || step.node.type !== 'parallel') return '';

    const formData = inst.formData as Record<string, any>;
    const parallelApprovals = formData?.['parallelApprovals'];
    const nodeState = parallelApprovals?.[step.node.id];

    const required = (step.node.data['approvers'] as string[]) || [];
    const approvals = nodeState?.approvals || [];

    return `${approvals.length} of ${required.length} approvers have approved`;
  }

  canApproveParallel(): boolean {
    const step = this.currentStep();
    const inst = this.instance();
    const currentUser = this.auth.user();
    if (!step || !inst || !currentUser || step.node.type !== 'parallel') return false;

    const formData = inst.formData as Record<string, any>;
    const parallelApprovals = formData?.['parallelApprovals'];
    const nodeState = parallelApprovals?.[step.node.id];

    const approvals = nodeState?.approvals || [];
    return !approvals.includes(currentUser.id) && !approvals.includes(currentUser.name || '');
  }

  approve() {
    const inst = this.instance();
    const step = this.currentStep();
    if (!inst || !step) return;

    const currentUser = this.auth.user();
    const node = step.node;

    // Check if this is a parallel node - use parallel approval API
    if (node.type === 'parallel') {
      this.handleParallelApproval(inst, node, currentUser);
      return;
    }

    // Regular approval - advance directly
    inst.history.push({
      nodeId: step.node.id,
      action: `Approved by ${currentUser?.name || 'User'}`,
      timestamp: new Date()
    });

    // Advance to next step
    const wf = this.workflow();
    if (wf) {
      const currentIdx = wf.nodes.findIndex(n => n.id === inst.currentNodeId);
      if (currentIdx >= 0 && currentIdx < wf.nodes.length - 1) {
        const nextNode = wf.nodes[currentIdx + 1];
        inst.currentNodeId = nextNode.id;
        if (nextNode.type === 'end') {
          inst.status = 'completed';
        }
      }
    }

    this.workflowService.advanceInstance(inst.id, inst.currentNodeId!, inst.history).subscribe({
      next: (updated: any) => this.instance.set({ ...updated }),
      error: () => this.instance.set({ ...inst })
    });
  }

  private handleParallelApproval(inst: WorkflowInstance, node: WorkflowNode, currentUser: { id: string; name?: string } | null) {
    const approvers = (node.data['approvers'] as string[]) || [];
    const currentNodeId = node.id;

    // Get current parallel approval state from formData
    const formData = inst.formData as Record<string, any>;
    const parallelApprovals = formData?.['parallelApprovals'];
    const existingState = parallelApprovals?.[currentNodeId];

    if (!existingState) {
      // Initialize parallel approval first
      this.workflowService.initParallelApproval(inst.id, currentNodeId, approvers).subscribe({
        next: (updated) => {
          this.instance.set(updated);
          // Now record this user's approval
          if (currentUser) {
            this.doParallelApprove(updated, currentNodeId, currentUser.id);
          }
        },
        error: () => {
          // Fallback to local handling
          this.handleParallelApprovalLocally(inst, node, currentUser, approvers);
        }
      });
    } else if (currentUser && !existingState.approvals.includes(currentUser.id)) {
      // Already initialized, record this approval
      this.doParallelApprove(inst, currentNodeId, currentUser.id);
    }
  }

  private doParallelApprove(inst: WorkflowInstance, nodeId: string, approverId: string) {
    this.workflowService.approveParallel(inst.id, nodeId, approverId).subscribe({
      next: (result) => {
        this.instance.set(result.instance);
        // Note: allApproved is handled by the backend - when true, workflow advances automatically
        // If not all approved, the instance stays at the parallel node
      },
      error: () => {
        // Fallback to local handling
        const wf = this.workflow();
        if (wf) {
          const node = wf.nodes.find(n => n.id === nodeId);
          const approvers = (node?.data['approvers'] as string[]) || [];
          this.handleParallelApprovalLocally(inst, node!, { id: approverId } as any, approvers);
        }
      }
    });
  }

  private handleParallelApprovalLocally(inst: WorkflowInstance, node: WorkflowNode, currentUser: { id: string; name?: string } | null, requiredApprovers: string[]) {
    const currentNodeId = node.id;
    const formData = inst.formData || {};
    const parallelApprovals = formData['parallelApprovals'] || {};
    
    let nodeApproval = parallelApprovals[currentNodeId];
    if (!nodeApproval) {
      nodeApproval = {
        nodeId: currentNodeId,
        requiredApprovers,
        approvals: [],
        status: 'PENDING' as 'PENDING' | 'ALL_APPROVED' | 'REJECTED'
      };
    }

    // Record this approval
    if (currentUser && !nodeApproval.approvals.includes(currentUser.id)) {
      nodeApproval.approvals.push(currentUser.id);
    }

    // Check if all have approved
    const allApproved = requiredApprovers.length === 0 ||
      requiredApprovers.every(a => nodeApproval!.approvals.includes(a));

    const historyEntry = {
      nodeId: currentNodeId,
      action: `Parallel approval: ${nodeApproval.approvals.length}/${requiredApprovers.length} approved`,
      timestamp: new Date()
    };

    if (allApproved) {
      nodeApproval.status = 'ALL_APPROVED';
      // Find next node and advance
      const wf = this.workflow();
      if (wf) {
        const currentIdx = wf.nodes.findIndex(n => n.id === currentNodeId);
        if (currentIdx >= 0 && currentIdx < wf.nodes.length - 1) {
          const nextNode = wf.nodes[currentIdx + 1];
          const newStatus = nextNode.type === 'end' ? 'completed' : inst.status;
          
          this.instance.set({
            ...inst,
            currentNodeId: nextNode.id,
            status: newStatus,
            formData: { ...formData, parallelApprovals: { ...(formData?.['parallelApprovals'] || {}), [currentNodeId]: nodeApproval } },
            history: [...inst.history, historyEntry]
          });
          return;
        }
      }
    }

    // Not all approved - stay at parallel node
    this.instance.set({
      ...inst,
      formData: { ...formData, parallelApprovals: { ...(formData?.['parallelApprovals'] || {}), [currentNodeId]: nodeApproval } },
      history: [...inst.history, historyEntry]
    });
  }

  reject() {
    const inst = this.instance();
    const step = this.currentStep();
    if (!inst || !step) return;

    inst.history.push({
      nodeId: step.node.id,
      action: 'Rejected',
      timestamp: new Date()
    });

    inst.status = 'completed';
    inst.currentNodeId = null;

    this.workflowService.completeInstance(inst.id).subscribe({
      next: (updated: any) => this.instance.set({ ...updated }),
      error: () => this.instance.set({ ...inst })
    });
  }

  requestInfo() {
    const inst = this.instance();
    const step = this.currentStep();
    if (!inst || !step) return;

    inst.history.push({
      nodeId: step.node.id,
      action: 'Additional information requested',
      timestamp: new Date()
    });

    this.instance.set({ ...inst });
    // TODO: Implement request info flow
  }
}
