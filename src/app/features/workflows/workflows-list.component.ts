import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { WorkflowService } from '../../core/services/workflow.service';
import { Workflow } from '../../core/models';

@Component({
  selector: 'app-workflows-list',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="workflows-list-page">
      <header class="page-header">
        <div>
          <h1>Workflows</h1>
          <p>Manage your service workflows</p>
        </div>
        <a routerLink="/workflow-designer" class="btn btn-primary">+ New Workflow</a>
      </header>
      
      @if (loading()) {
        <div class="empty-state">
          <p>Loading workflows...</p>
        </div>
      } @else if (workflows().length === 0) {
        <div class="empty-state">
          <p>No workflows yet.</p>
          <a routerLink="/workflow-designer" class="btn btn-secondary">Create your first workflow</a>
        </div>
      } @else {
        <div class="workflows-grid">
          @for (workflow of workflows(); track workflow.id) {
            <div class="workflow-card">
              <div class="workflow-card-header">
                <h3>{{ workflow.name }}</h3>
                <span class="node-count">{{ workflow.nodes?.length || 0 }} nodes</span>
              </div>
              <div class="workflow-card-meta">
                <span>Created: {{ workflow.createdAt | date:'mediumDate' }}</span>
              </div>
              <div class="workflow-card-actions">
                <a [routerLink]="['/workflow-player', workflow.id]" class="btn btn-primary btn-sm">Start Workflow</a>
                <a [routerLink]="['/workflow-designer']" [queryParams]="{id: workflow.id}" class="btn btn-secondary btn-sm">Edit</a>
              </div>
            </div>
          }
        </div>
      }
      
      <!-- Workflow Instances Section -->
      @if (instances().length > 0) {
        <div class="instances-section">
          <h2>Active Workflow Instances</h2>
          <div class="instances-list">
            @for (instance of instances(); track instance.id) {
              <div class="instance-card">
                <div class="instance-info">
                  <h4>{{ instance.workflowName || 'Workflow' }}</h4>
                  <p>Current Step: {{ instance.currentNodeId || 'Not started' }}</p>
                  <p>Status: <span class="status-badge" [class]="instance.status?.toLowerCase()">{{ instance.status }}</span></p>
                </div>
                <div class="instance-actions">
                  <a [routerLink]="['/workflow-player', instance.workflowId]" class="btn btn-sm btn-secondary">Continue</a>
                </div>
              </div>
            }
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .workflows-list-page {
      padding: 1.5rem;
    }
    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 2rem;
    }
    .page-header h1 {
      font-size: 1.5rem;
      margin-bottom: 0.25rem;
    }
    .page-header p {
      color: var(--color-text-muted);
      font-size: 0.875rem;
    }
    .empty-state {
      text-align: center;
      padding: 4rem 2rem;
      background: var(--color-surface);
      border-radius: var(--radius-lg);
    }
    .empty-state p {
      color: var(--color-text-muted);
      margin-bottom: 1rem;
    }
    .workflows-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 1rem;
    }
    .workflow-card {
      background: var(--color-surface);
      border-radius: var(--radius-lg);
      padding: 1.5rem;
      box-shadow: var(--shadow-sm);
    }
    .workflow-card-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 1rem;
    }
    .workflow-card-header h3 {
      font-size: 1.125rem;
    }
    .node-count {
      font-size: 0.75rem;
      background: var(--color-background);
      padding: 0.25rem 0.5rem;
      border-radius: var(--radius-sm);
      color: var(--color-text-muted);
    }
    .workflow-card-meta {
      font-size: 0.75rem;
      color: var(--color-text-muted);
      margin-bottom: 1rem;
    }
    .workflow-card-actions {
      display: flex;
      gap: 0.5rem;
    }
    .btn-sm {
      padding: 0.375rem 0.75rem;
      font-size: 0.75rem;
    }
    .instances-section {
      margin-top: 3rem;
    }
    .instances-section h2 {
      font-size: 1.25rem;
      margin-bottom: 1rem;
    }
    .instances-list {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }
    .instance-card {
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: var(--color-surface);
      border-radius: var(--radius-lg);
      padding: 1rem 1.5rem;
      border-left: 4px solid var(--color-primary);
    }
    .instance-info h4 {
      margin-bottom: 0.25rem;
    }
    .instance-info p {
      font-size: 0.875rem;
      color: var(--color-text-muted);
    }
    .status-badge {
      padding: 0.125rem 0.5rem;
      border-radius: var(--radius-sm);
      font-size: 0.75rem;
      font-weight: 500;
    }
    .status-badge.pending {
      background: #fef3c7;
      color: #92400e;
    }
    .status-badge.in-progress {
      background: #dbeafe;
      color: #1e40af;
    }
    .status-badge.completed {
      background: #dcfce7;
      color: #166534;
    }
  `]
})
export class WorkflowsListComponent implements OnInit {
  workflows = signal<Workflow[]>([]);
  instances = signal<any[]>([]);
  loading = signal(true);
  
  constructor(private workflowService: WorkflowService) {}
  
  ngOnInit() {
    this.loadData();
  }
  
  loadData() {
    this.loading.set(true);
    this.workflowService.getAll().subscribe({
      next: (workflows) => {
        this.workflows.set(workflows);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      }
    });
    
    this.workflowService.getAllInstances().subscribe({
      next: (instances) => {
        this.instances.set(instances);
      },
      error: () => {}
    });
  }
}
