import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, Router } from '@angular/router';
import { WorkflowService } from '../../core/services/workflow.service';
import { AuthService } from '../../core/services/auth.service';
import { WorkflowInstance } from '../../core/models';

type ViewType = 'tasks' | 'applications';

@Component({
  selector: 'app-my-workspace',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="workspace-layout">
      <!-- Sidebar -->
      <aside class="sidebar">
        <div class="sidebar-header">
          <h2>我的工作台</h2>
        </div>
        <nav class="sidebar-nav">
          <button 
            class="nav-item" 
            [class.active]="currentView() === 'tasks'"
            (click)="switchView('tasks')">
            <span class="nav-icon">📋</span>
            <span class="nav-label">我的待辦</span>
            @if (pendingCount() > 0) {
              <span class="badge">{{ pendingCount() }}</span>
            }
          </button>
          <button 
            class="nav-item" 
            [class.active]="currentView() === 'applications'"
            (click)="switchView('applications')">
            <span class="nav-icon">📝</span>
            <span class="nav-label">我的申請</span>
          </button>
        </nav>
        <div class="sidebar-section">
          <h3>其他功能</h3>
          <a routerLink="/forms" class="nav-item-link">
            <span class="nav-icon">📋</span>
            <span>表單</span>
          </a>
          <a routerLink="/workflows" class="nav-item-link">
            <span class="nav-icon">⚙️</span>
            <span>工作流</span>
          </a>
          <a routerLink="/analytics" class="nav-item-link">
            <span class="nav-icon">📊</span>
            <span>統計</span>
          </a>
        </div>
      </aside>

      <!-- Main Content -->
      <main class="main-content">
        <!-- Header -->
        <header class="content-header">
          <div class="welcome">
            <h1>Welcome, {{ authService.user()?.name || 'User' }}</h1>
          </div>
        </header>

        <!-- Stats Cards -->
        <section class="stats-section">
          <div class="stat-card">
            <div class="stat-icon pending">⏳</div>
            <div class="stat-info">
              <span class="stat-value">{{ pendingCount() }}</span>
              <span class="stat-label">待審批</span>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon in-progress">🔄</div>
            <div class="stat-info">
              <span class="stat-value">{{ inProgressCount() }}</span>
              <span class="stat-label">審批中</span>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon completed">✅</div>
            <div class="stat-info">
              <span class="stat-value">{{ completedCount() }}</span>
              <span class="stat-label">已完成</span>
            </div>
          </div>
        </section>

        <!-- Filter/Sort Bar -->
        <section class="filter-bar">
          <div class="filter-group">
            <label>狀態:</label>
            <select [(ngModel)]="statusFilter" (change)="applyFilter()">
              <option value="ALL">全部</option>
              <option value="PENDING">待審批</option>
              <option value="IN_PROGRESS">審批中</option>
              <option value="COMPLETED">已完成</option>
              <option value="REJECTED">已駁回</option>
            </select>
          </div>
          <div class="sort-group">
            <label>排序:</label>
            <select [(ngModel)]="sortBy" (change)="applySort()">
              <option value="date-desc">最新優先</option>
              <option value="date-asc">最舊優先</option>
              <option value="status">按狀態</option>
            </select>
          </div>
        </section>

        <!-- List View -->
        <section class="list-section">
          @if (loading()) {
            <div class="loading">載入中...</div>
          } @else if (currentView() === 'tasks') {
            <div class="list-header">
              <h2>我的待辦</h2>
            </div>
            @if (filteredPending().length === 0) {
              <div class="empty-state">
                <p>暫無待審批的申請</p>
              </div>
            } @else {
              <div class="instance-list">
                @for (instance of filteredPending(); track instance.id) {
                  <div class="instance-card" (click)="viewDetail(instance)">
                    <div class="card-main">
                      <div class="instance-id">{{ instance.displayId }}</div>
                      <div class="instance-name">{{ instance.workflow?.name || 'Unknown Workflow' }}</div>
                      <div class="instance-meta">
                        <span>申請人: {{ instance.user?.name || 'Unknown' }}</span>
                        <span>{{ instance.createdAt | date:'short' }}</span>
                      </div>
                    </div>
                    <div class="card-status">
                      <span class="status-badge" [class]="getStatusClass(instance.status)">
                        {{ formatStatus(instance.status) }}
                      </span>
                    </div>
                  </div>
                }
              </div>
            }
          } @else {
            <div class="list-header">
              <h2>我的申請</h2>
            </div>
            @if (filteredSubmitted().length === 0) {
              <div class="empty-state">
                <p>暫無申請記錄</p>
              </div>
            } @else {
              <div class="instance-list">
                @for (instance of filteredSubmitted(); track instance.id) {
                  <div class="instance-card" (click)="viewDetail(instance)">
                    <div class="card-main">
                      <div class="instance-id">{{ instance.displayId }}</div>
                      <div class="instance-name">{{ instance.workflow?.name || 'Unknown Workflow' }}</div>
                      <div class="instance-meta">
                        <span>申請人: {{ instance.user?.name || 'Unknown' }}</span>
                        <span>{{ instance.createdAt | date:'short' }}</span>
                      </div>
                    </div>
                    <div class="card-status">
                      <span class="status-badge" [class]="getStatusClass(instance.status)">
                        {{ formatStatus(instance.status) }}
                      </span>
                    </div>
                  </div>
                }
              </div>
            }
          }
        </section>
      </main>
    </div>
  `,
  styles: [`
    .workspace-layout {
      display: flex;
      min-height: calc(100vh - 60px);
    }
    
    /* Sidebar */
    .sidebar {
      width: 260px;
      background: var(--color-surface);
      border-right: 1px solid var(--color-border);
      padding: 1.5rem 0;
      flex-shrink: 0;
    }
    .sidebar-header {
      padding: 0 1.5rem 1rem;
      border-bottom: 1px solid var(--color-border);
      margin-bottom: 1rem;
    }
    .sidebar-header h2 {
      font-size: 1.125rem;
      font-weight: 600;
    }
    .sidebar-nav {
      padding: 0 0.75rem;
    }
    .nav-item {
      width: 100%;
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.75rem 1rem;
      border: none;
      background: transparent;
      border-radius: var(--radius-md);
      cursor: pointer;
      font-size: 0.9375rem;
      color: var(--color-text);
      transition: all var(--transition-fast);
      text-align: left;
    }
    .nav-item:hover {
      background: var(--color-background);
    }
    .nav-item.active {
      background: rgba(37, 99, 235, 0.1);
      color: var(--color-primary);
      font-weight: 500;
    }
    .nav-icon {
      font-size: 1.125rem;
    }
    .nav-label {
      flex: 1;
    }
    .badge {
      background: var(--color-danger);
      color: white;
      font-size: 0.75rem;
      padding: 0.125rem 0.5rem;
      border-radius: 9999px;
      font-weight: 600;
    }
    .sidebar-section {
      padding: 1.5rem;
      border-top: 1px solid var(--color-border);
      margin-top: 1rem;
    }
    .sidebar-section h3 {
      font-size: 0.75rem;
      text-transform: uppercase;
      color: var(--color-text-muted);
      margin-bottom: 0.75rem;
    }
    .nav-item-link {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.5rem 0;
      color: var(--color-text);
      text-decoration: none;
      font-size: 0.875rem;
    }
    .nav-item-link:hover {
      color: var(--color-primary);
    }
    
    /* Main Content */
    .main-content {
      flex: 1;
      padding: 2rem;
      background: var(--color-background);
    }
    .content-header {
      margin-bottom: 2rem;
    }
    .welcome h1 {
      font-size: 1.5rem;
      font-weight: 600;
    }
    
    /* Stats */
    .stats-section {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 1rem;
      margin-bottom: 2rem;
    }
    .stat-card {
      background: var(--color-surface);
      border-radius: var(--radius-lg);
      padding: 1.25rem;
      display: flex;
      align-items: center;
      gap: 1rem;
      box-shadow: var(--shadow-sm);
    }
    .stat-icon {
      width: 44px;
      height: 44px;
      border-radius: var(--radius-md);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.25rem;
    }
    .stat-icon.pending { background: #fef3c7; }
    .stat-icon.in-progress { background: #dbeafe; }
    .stat-icon.completed { background: #d1fae5; }
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
    
    /* Filter Bar */
    .filter-bar {
      display: flex;
      gap: 2rem;
      margin-bottom: 1.5rem;
      padding: 1rem 1.5rem;
      background: var(--color-surface);
      border-radius: var(--radius-lg);
    }
    .filter-group, .sort-group {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    .filter-group label, .sort-group label {
      font-size: 0.875rem;
      color: var(--color-text-muted);
    }
    .filter-group select, .sort-group select {
      padding: 0.375rem 0.75rem;
      border: 1px solid var(--color-border);
      border-radius: var(--radius-sm);
      font-size: 0.875rem;
      background: var(--color-background);
    }
    
    /* List Section */
    .list-section {
      background: var(--color-surface);
      border-radius: var(--radius-lg);
      overflow: hidden;
    }
    .list-header {
      padding: 1.25rem 1.5rem;
      border-bottom: 1px solid var(--color-border);
    }
    .list-header h2 {
      font-size: 1rem;
      font-weight: 600;
    }
    .loading, .empty-state {
      padding: 3rem;
      text-align: center;
      color: var(--color-text-muted);
    }
    .instance-list {
      display: flex;
      flex-direction: column;
    }
    .instance-card {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1.25rem 1.5rem;
      border-bottom: 1px solid var(--color-border);
      cursor: pointer;
      transition: background var(--transition-fast);
    }
    .instance-card:last-child {
      border-bottom: none;
    }
    .instance-card:hover {
      background: var(--color-background);
    }
    .card-main {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }
    .instance-id {
      font-family: monospace;
      font-size: 0.875rem;
      font-weight: 600;
      color: var(--color-primary);
    }
    .instance-name {
      font-weight: 500;
    }
    .instance-meta {
      display: flex;
      gap: 1rem;
      font-size: 0.8125rem;
      color: var(--color-text-muted);
    }
    .status-badge {
      padding: 0.25rem 0.75rem;
      border-radius: var(--radius-sm);
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
    }
    .status-badge.pending, .status-badge.PENDING { background: #fef3c7; color: #92400e; }
    .status-badge.in-progress, .status-badge.IN_PROGRESS { background: #dbeafe; color: #1e40af; }
    .status-badge.completed, .status-badge.COMPLETED { background: #d1fae5; color: #065f46; }
    .status-badge.rejected, .status-badge.REJECTED { background: #fee2e2; color: #991b1b; }
  `]
})
export class MyWorkspaceComponent implements OnInit {
  currentView = signal<ViewType>('tasks');
  loading = signal(true);
  pendingInstances = signal<any[]>([]);
  submittedInstances = signal<any[]>([]);
  
  statusFilter = 'ALL';
  sortBy = 'date-desc';
  
  constructor(
    public authService: AuthService,
    private workflowService: WorkflowService,
    private router: Router
  ) {}
  
  ngOnInit() {
    this.loadData();
  }
  
  loadData() {
    this.loading.set(true);
    
    this.workflowService.getMyPending().subscribe({
      next: (instances) => {
        this.pendingInstances.set(instances);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      }
    });
    
    this.workflowService.getMySubmitted().subscribe({
      next: (instances) => {
        this.submittedInstances.set(instances);
      },
      error: () => {}
    });
  }
  
  switchView(view: ViewType) {
    this.currentView.set(view);
    this.statusFilter = 'ALL';
    this.sortBy = 'date-desc';
  }
  
  pendingCount = computed(() => this.pendingInstances().length);
  
  inProgressCount = computed(() => 
    this.submittedInstances().filter(i => i.status === 'IN_PROGRESS').length
  );
  
  completedCount = computed(() => 
    this.submittedInstances().filter(i => i.status === 'COMPLETED').length
  );
  
  filteredPending = computed(() => {
    let result = this.pendingInstances();
    if (this.statusFilter !== 'ALL') {
      result = result.filter(i => i.status === this.statusFilter);
    }
    return this.sortInstances(result);
  });
  
  filteredSubmitted = computed(() => {
    let result = this.submittedInstances();
    if (this.statusFilter !== 'ALL') {
      result = result.filter(i => i.status === this.statusFilter);
    }
    return this.sortInstances(result);
  });
  
  applyFilter() {
    // Computed signals will auto-recalculate
  }
  
  applySort() {
    // Computed signals will auto-recalculate
  }
  
  sortInstances(instances: any[]): any[] {
    const sorted = [...instances];
    switch (this.sortBy) {
      case 'date-desc':
        return sorted.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      case 'date-asc':
        return sorted.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      case 'status':
        return sorted.sort((a, b) => a.status.localeCompare(b.status));
      default:
        return sorted;
    }
  }
  
  viewDetail(instance: any) {
    this.router.navigate(['/workflow-instance', instance.id]);
  }
  
  getStatusClass(status: string): string {
    return status.toLowerCase().replace(/_/g, '-');
  }
  
  formatStatus(status: string): string {
    const statusMap: Record<string, string> = {
      'PENDING': '待審批',
      'IN_PROGRESS': '審批中',
      'COMPLETED': '已完成',
      'REJECTED': '已駁回',
      'WAITING_FOR_CHILD': '等待子流程'
    };
    return statusMap[status] || status;
  }
}
