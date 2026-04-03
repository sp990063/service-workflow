import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { StorageService } from '../../core/services/storage.service';
import { Workflow, WorkflowNode } from '../../core/models';

interface WorkflowInstance {
  id: string;
  workflowId: string;
  workflowName: string;
  currentNodeId: string | null;
  status: 'pending' | 'in-progress' | 'waiting-for-child' | 'completed';
  formData: Record<string, any>;
  history: Array<{ nodeId: string; action: string; timestamp: Date }>;
  childInstanceId?: string;  // Child workflow instance if waiting
  parentInstanceId?: string; // Parent instance if this is a child
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
            @if (instance()?.status === 'completed') {
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
                      <p>Value: <strong>{{ currentNode()!.data['value'] || 'N/A' }}</strong></p>
                      <p class="condition-note">Based on the form data, the workflow will proceed to the appropriate path.</p>
                      <button class="btn btn-primary" (click)="proceedFromCondition()">Proceed</button>
                    </div>
                  }
                  
                  <!-- Parallel: Multiple tasks -->
                  @if (currentNode()!.type === 'parallel') {
                    <div class="parallel-section">
                      <h4>Parallel Tasks</h4>
                      <p>Multiple tasks are running concurrently. Complete all to proceed.</p>
                      <button class="btn btn-primary" (click)="completeParallel()">Complete All</button>
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
    .task-form, .approval-section, .parallel-section, .condition-section, .end-section {
      background: var(--color-background);
      border-radius: var(--radius-lg);
      padding: 1.5rem;
      margin-bottom: 1.5rem;
    }
    .task-form h4, .approval-section h4, .parallel-section h4, .condition-section h4, .end-section h4 {
      font-size: 1rem;
      margin-bottom: 0.75rem;
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
  
  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private storage: StorageService
  ) {}
  
  ngOnInit() {
    const workflowId = this.route.snapshot.paramMap.get('id');
    if (workflowId) {
      this.loadWorkflow(workflowId);
      this.loadOrCreateInstance(workflowId);
    } else {
      this.loading.set(false);
    }
  }
  
  loadWorkflow(workflowId: string) {
    const workflows = this.storage.get<Workflow[]>('workflows') || [];
    const workflow = workflows.find(w => w.id === workflowId);
    this.workflow.set(workflow || null);
    this.loading.set(false);
  }
  
  loadOrCreateInstance(workflowId: string) {
    const instances = this.storage.get<WorkflowInstance[]>('workflowInstances') || [];
    let instance = instances.find(i => i.workflowId === workflowId && i.status !== 'completed');
    
    if (!instance) {
      const workflow = this.workflow();
      if (workflow) {
        // Find start node - keep currentNodeId null initially to show Start Workflow button
        const startNode = workflow.nodes.find(n => n.type === 'start');
        instance = {
          id: crypto.randomUUID(),
          workflowId,
          workflowName: workflow.name,
          currentNodeId: null, // Start as null to show Start Workflow button
          status: 'pending',
          formData: {},
          history: []
        };
        instances.push(instance);
        this.storage.set('workflowInstances', instances);
      }
    }
    
    this.instance.set(instance || null);
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
      'task': 'Task',
      'condition': 'Condition',
      'approval': 'Approval',
      'parallel': 'Parallel',
      'join': 'Join'
    };
    return labels[type] || type;
  }
  
  getNodeColor(type: string): string {
    const colors: Record<string, string> = {
      'start': '#10b981',
      'end': '#ef4444',
      'task': '#6366f1',
      'condition': '#f59e0b',
      'approval': '#8b5cf6',
      'parallel': '#06b6d4',
      'join': '#06b6d4'
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
      return inst.status === 'in-progress' || inst.status === 'completed';
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
    if (inst && wf) {
      const startNode = wf.nodes.find(n => n.type === 'start');
      const startIdx = wf.nodes.findIndex(n => n.type === 'start');
      
      if (startNode) {
        // Add start node to history as completed
        inst.history.push({
          nodeId: startNode.id,
          action: `Started: ${startNode.data['label'] || startNode.type}`,
          timestamp: new Date()
        });
        
        // Find the next node after start (typically the task node)
        if (startIdx >= 0 && startIdx < wf.nodes.length - 1) {
          const nextNode = wf.nodes[startIdx + 1];
          inst.currentNodeId = nextNode.id;
        } else {
          inst.currentNodeId = startNode.id;
        }
        
        inst.status = 'in-progress';
        this.updateInstance(inst);
      }
    }
  }
  
  advanceWorkflow() {
    const inst = this.instance();
    const wf = this.workflow();
    if (!inst || !wf) return;
    
    // Find current node index
    const currentIdx = wf.nodes.findIndex(n => n.id === inst.currentNodeId);
    if (currentIdx < 0) return;
    
    // If at last node, finish workflow
    if (currentIdx >= wf.nodes.length - 1) {
      this.finishWorkflow();
      return;
    }
    
    const currentNode = wf.nodes[currentIdx];
    
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
    inst.currentNodeId = nextNode.id;
    
    if (nextNode.type === 'end') {
      inst.status = 'completed';
    }
    
    this.updateInstance(inst);
  }
  
  approve() {
    const inst = this.instance();
    if (!inst) return;
    
    const currentNode = this.currentNode();
    inst.history.push({
      nodeId: currentNode?.id || '',
      action: 'Approved',
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
    inst.status = 'completed';
    this.updateInstance(inst);
  }
  
  proceedFromCondition() {
    // For demo, just advance
    this.advanceWorkflow();
  }
  
  completeParallel() {
    this.advanceWorkflow();
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
    
    inst.status = 'completed';
    inst.currentNodeId = null;
    this.updateInstance(inst);
  }
  
  updateInstance(updated: WorkflowInstance) {
    const instances = this.storage.get<WorkflowInstance[]>('workflowInstances') || [];
    const idx = instances.findIndex(i => i.id === updated.id);
    if (idx >= 0) {
      instances[idx] = updated;
    }
    this.storage.set('workflowInstances', instances);
    this.instance.set({ ...updated });
  }
}
