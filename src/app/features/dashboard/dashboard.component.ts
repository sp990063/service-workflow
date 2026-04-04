import { Component, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormService } from '../../core/services/form.service';
import { WorkflowService } from '../../core/services/workflow.service';
import { Form, Workflow, DashboardStats } from '../../core/models';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="dashboard">
      <header>
        <h1>Dashboard</h1>
        <p>Welcome back! Here's your workflow overview.</p>
      </header>
      
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-icon forms">📋</div>
          <div class="stat-info">
            <span class="stat-value">{{ stats().totalForms }}</span>
            <span class="stat-label">Total Forms</span>
          </div>
        </div>
        
        <div class="stat-card">
          <div class="stat-icon workflows">⚡</div>
          <div class="stat-info">
            <span class="stat-value">{{ stats().totalWorkflows }}</span>
            <span class="stat-label">Workflows</span>
          </div>
        </div>
        
        <div class="stat-card">
          <div class="stat-icon pending">⏳</div>
          <div class="stat-info">
            <span class="stat-value">{{ stats().pendingApprovals }}</span>
            <span class="stat-label">Pending Approvals</span>
          </div>
        </div>
        
        <div class="stat-card">
          <div class="stat-icon completed">✅</div>
          <div class="stat-info">
            <span class="stat-value">{{ stats().completedSubmissions }}</span>
            <span class="stat-label">Completed</span>
          </div>
        </div>
      </div>
      
      <div class="quick-actions">
        <h2>Quick Actions</h2>
        <div class="actions-grid">
          <a routerLink="/form-builder" class="action-card">
            <span class="action-icon">+</span>
            <span class="action-label">New Form</span>
          </a>
          <a routerLink="/workflow-designer" class="action-card">
            <span class="action-icon">⚡</span>
            <span class="action-label">New Workflow</span>
          </a>
        </div>
      </div>
      
      <div class="recent-section">
        <h2>Recent Forms</h2>
        @if (loading()) {
          <p class="empty">Loading...</p>
        } @else if (recentForms().length === 0) {
          <p class="empty">No forms yet. Create your first form!</p>
        } @else {
          <div class="list">
            @for (form of recentForms(); track form.id) {
              <div class="list-item">
                <span class="item-name">{{ form.name }}</span>
                <span class="item-date">{{ form.updatedAt | date:'mediumDate' }}</span>
              </div>
            }
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .dashboard header {
      margin-bottom: 2rem;
    }
    .dashboard h1 {
      font-size: 1.75rem;
      font-weight: 600;
      margin-bottom: 0.5rem;
    }
    .dashboard p {
      color: var(--color-text-muted);
    }
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1rem;
      margin-bottom: 2rem;
    }
    .stat-card {
      background: var(--color-surface);
      border-radius: var(--radius-lg);
      padding: 1.5rem;
      display: flex;
      align-items: center;
      gap: 1rem;
      box-shadow: var(--shadow-sm);
    }
    .stat-icon {
      width: 48px;
      height: 48px;
      border-radius: var(--radius-md);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.5rem;
    }
    .stat-icon.forms { background: #dbeafe; }
    .stat-icon.workflows { background: #dcfce7; }
    .stat-icon.pending { background: #fef3c7; }
    .stat-icon.completed { background: #dbeafe; }
    .stat-info {
      display: flex;
      flex-direction: column;
    }
    .stat-value {
      font-size: 1.5rem;
      font-weight: 700;
    }
    .stat-label {
      font-size: 0.875rem;
      color: var(--color-text-muted);
    }
    .quick-actions {
      margin-bottom: 2rem;
    }
    .quick-actions h2 {
      font-size: 1.25rem;
      margin-bottom: 1rem;
    }
    .actions-grid {
      display: flex;
      gap: 1rem;
    }
    .action-card {
      background: var(--color-surface);
      border: 2px dashed var(--color-border);
      border-radius: var(--radius-lg);
      padding: 2rem;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.5rem;
      text-decoration: none;
      color: var(--color-text);
      transition: all var(--transition-fast);
      min-width: 150px;
    }
    .action-card:hover {
      border-color: var(--color-primary);
      background: rgba(37, 99, 235, 0.05);
    }
    .action-icon {
      font-size: 2rem;
      color: var(--color-primary);
    }
    .action-label {
      font-weight: 500;
    }
    .recent-section h2 {
      font-size: 1.25rem;
      margin-bottom: 1rem;
    }
    .list {
      background: var(--color-surface);
      border-radius: var(--radius-lg);
      overflow: hidden;
    }
    .list-item {
      padding: 1rem 1.5rem;
      border-bottom: 1px solid var(--color-border);
      display: flex;
      justify-content: space-between;
    }
    .list-item:last-child {
      border-bottom: none;
    }
    .item-name {
      font-weight: 500;
    }
    .item-date {
      color: var(--color-text-muted);
      font-size: 0.875rem;
    }
    .empty {
      color: var(--color-text-muted);
      padding: 2rem;
      text-align: center;
      background: var(--color-surface);
      border-radius: var(--radius-lg);
    }
  `]
})
export class DashboardComponent implements OnInit {
  stats = signal<DashboardStats>({
    totalForms: 0,
    totalWorkflows: 0,
    pendingApprovals: 0,
    completedSubmissions: 0
  });
  
  recentForms = signal<Form[]>([]);
  loading = signal(true);
  
  constructor(
    private formService: FormService,
    private workflowService: WorkflowService
  ) {}
  
  ngOnInit() {
    this.formService.getAll().subscribe({
      next: (forms) => {
        this.recentForms.set(forms.slice(0, 5));
        this.stats.update(s => ({ ...s, totalForms: forms.length }));
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      }
    });
    
    this.workflowService.getAll().subscribe({
      next: (workflows) => {
        this.stats.update(s => ({ ...s, totalWorkflows: workflows.length }));
      },
      error: () => {}
    });
  }
}
