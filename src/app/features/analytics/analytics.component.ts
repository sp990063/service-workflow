/**
 * Analytics Component
 * 
 * Dashboard showing workflow statistics and analytics
 */

import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../core/services/api.service';

@Component({
  selector: 'app-analytics',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="analytics-page">
      <h1>Analytics Dashboard</h1>

      @if (loading()) {
        <div class="loading">Loading analytics...</div>
      } @else {
        <!-- Overview Stats -->
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-value">{{ overview().totalWorkflows || 0 }}</div>
            <div class="stat-label">Total Workflows</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">{{ overview().activeInstances || 0 }}</div>
            <div class="stat-label">Active Instances</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">{{ overview().completedToday || 0 }}</div>
            <div class="stat-label">Completed Today</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">{{ formatDuration(overview().averageApprovalTime) }}</div>
            <div class="stat-label">Avg Approval Time</div>
          </div>
        </div>

        <!-- Most Used Workflows -->
        <div class="section">
          <h2>Most Used Workflows</h2>
          
          @if (mostUsed().length === 0) {
            <div class="empty-state">
              <p>No workflow data yet</p>
            </div>
          } @else {
            <div class="workflows-table">
              <table>
                <thead>
                  <tr>
                    <th>Workflow</th>
                    <th>Description</th>
                    <th>Total Instances</th>
                  </tr>
                </thead>
                <tbody>
                  @for (wf of mostUsed(); track wf.id) {
                    <tr>
                      <td class="workflow-name">{{ wf.name }}</td>
                      <td class="workflow-desc">{{ wf.description || '-' }}</td>
                      <td class="instance-count">{{ wf.instanceCount }}</td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          }
        </div>

        <!-- Approval Time Trends -->
        <div class="section">
          <h2>Approval Time Trends (Last 7 Days)</h2>
          
          @if (trends().length === 0) {
            <div class="empty-state">
              <p>No trend data available</p>
            </div>
          } @else {
            <div class="trends-chart">
              <div class="chart-container">
                @for (day of trends(); track day.date) {
                  <div class="chart-bar">
                    <div 
                      class="bar" 
                      [style.height.%]="getBarHeight(day.averageTimeMinutes)"
                      [title]="day.averageTimeMinutes + ' min avg'"
                    >
                      <span class="bar-value">{{ day.averageTimeMinutes }}m</span>
                    </div>
                    <div class="bar-label">{{ formatDate(day.date) }}</div>
                  </div>
                }
              </div>
              <div class="chart-legend">
                <span class="legend-item">Average approval time per day (minutes)</span>
              </div>
            </div>
          }
        </div>

        <!-- Refresh Button -->
        <div class="actions">
          <button class="btn btn-secondary" (click)="refresh()">
            Refresh
          </button>
        </div>
      }
    </div>
  `,
  styles: [`
    .analytics-page {
      padding: 2rem;
      max-width: 1200px;
      margin: 0 auto;
    }
    .analytics-page h1 {
      margin: 0 0 2rem 0;
    }
    .loading {
      text-align: center;
      padding: 3rem;
      color: var(--color-text-muted);
    }
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 1.5rem;
      margin-bottom: 2rem;
    }
    .stat-card {
      background: var(--color-surface);
      border-radius: var(--radius-lg);
      padding: 1.5rem;
      text-align: center;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    .stat-value {
      font-size: 2.5rem;
      font-weight: 700;
      color: var(--color-primary);
    }
    .stat-label {
      font-size: 0.875rem;
      color: var(--color-text-muted);
      margin-top: 0.5rem;
    }
    .section {
      background: var(--color-surface);
      border-radius: var(--radius-lg);
      padding: 1.5rem;
      margin-bottom: 1.5rem;
    }
    .section h2 {
      margin: 0 0 1rem 0;
      font-size: 1.25rem;
    }
    .empty-state {
      text-align: center;
      padding: 2rem;
      color: var(--color-text-muted);
    }
    .workflows-table {
      overflow-x: auto;
    }
    table {
      width: 100%;
      border-collapse: collapse;
    }
    th, td {
      text-align: left;
      padding: 0.75rem;
      border-bottom: 1px solid var(--color-border);
    }
    th {
      font-weight: 600;
      color: var(--color-text-muted);
      font-size: 0.875rem;
    }
    .workflow-name {
      font-weight: 500;
    }
    .workflow-desc {
      color: var(--color-text-secondary);
      font-size: 0.875rem;
    }
    .instance-count {
      font-weight: 600;
      color: var(--color-primary);
    }
    .trends-chart {
      padding: 1rem 0;
    }
    .chart-container {
      display: flex;
      align-items: flex-end;
      justify-content: space-around;
      height: 200px;
      gap: 0.5rem;
      padding: 0 1rem;
    }
    .chart-bar {
      display: flex;
      flex-direction: column;
      align-items: center;
      flex: 1;
      max-width: 80px;
    }
    .bar {
      width: 100%;
      background: var(--color-primary);
      border-radius: var(--radius-sm) var(--radius-sm) 0 0;
      min-height: 4px;
      position: relative;
      transition: height 0.3s ease;
      display: flex;
      align-items: flex-start;
      justify-content: center;
    }
    .bar-value {
      font-size: 0.625rem;
      color: white;
      padding-top: 2px;
      white-space: nowrap;
    }
    .bar-label {
      font-size: 0.625rem;
      color: var(--color-text-muted);
      margin-top: 0.5rem;
      text-align: center;
    }
    .chart-legend {
      text-align: center;
      margin-top: 1rem;
      font-size: 0.75rem;
      color: var(--color-text-muted);
    }
    .actions {
      display: flex;
      justify-content: flex-end;
    }
    @media (max-width: 768px) {
      .stats-grid {
        grid-template-columns: repeat(2, 1fr);
      }
    }
  `]
})
export class AnalyticsComponent implements OnInit {
  loading = signal(true);
  overview = signal<any>({});
  mostUsed = signal<any[]>([]);
  trends = signal<any[]>([]);

  constructor(private api: ApiService) {}

  ngOnInit() {
    this.loadAnalytics();
  }

  loadAnalytics() {
    this.loading.set(true);

    // Load overview
    this.api.get<any>('/analytics/overview').subscribe({
      next: (data) => {
        this.overview.set(data);
      }
    });

    // Load most used workflows
    this.api.get<any[]>('/analytics/most-used').subscribe({
      next: (data) => {
        this.mostUsed.set(data);
      }
    });

    // Load trends
    this.api.get<any[]>('/analytics/approval-times').subscribe({
      next: (data) => {
        this.trends.set(data);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      }
    });
  }

  refresh() {
    this.loadAnalytics();
  }

  formatDuration(minutes: number): string {
    if (!minutes) return '0m';
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  }

  formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  }

  getBarHeight(minutes: number): number {
    if (!minutes || minutes === 0) return 5; // Minimum height
    const max = Math.max(...this.trends().map(t => t.averageTimeMinutes || 0), 1);
    return Math.max((minutes / max) * 100, 5);
  }
}
