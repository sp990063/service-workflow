import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormService } from '../../core/services/form.service';

@Component({
  selector: 'app-form-submissions',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="submissions-page">
      <header class="page-header">
        <div>
          <h1>Form Submissions</h1>
          <p>View all submissions for this form</p>
        </div>
        <a routerLink="/forms" class="btn btn-secondary">← Back to Forms</a>
      </header>
      
      @if (loading()) {
        <div class="loading">Loading submissions...</div>
      } @else if (error()) {
        <div class="error">
          <p>{{ error() }}</p>
        </div>
      } @else if (submissions().length === 0) {
        <div class="empty-state">
          <p>No submissions yet.</p>
          <a [routerLink]="['/form-fill', formId]" class="btn btn-primary">Be the first to submit</a>
        </div>
      } @else {
        <div class="submissions-list">
          @for (submission of submissions(); track submission.id) {
            <div class="submission-card">
              <div class="submission-header">
                <span class="submission-id">#{{ submission.id.slice(0, 8) }}</span>
                <span class="submission-date">{{ submission.createdAt | date:'medium' }}</span>
                <span class="submission-status" [class]="submission.status?.toLowerCase()">{{ submission.status }}</span>
              </div>
              <div class="submission-data">
                @for (field of getFields(submission); track field.key) {
                  <div class="field-item">
                    <span class="field-label">{{ field.label }}:</span>
                    <span class="field-value">{{ field.value }}</span>
                  </div>
                }
              </div>
              @if (submission.status === 'PENDING') {
                <div class="submission-actions">
                  <button class="btn btn-primary btn-sm" (click)="updateStatus(submission.id, 'APPROVED')">✓ Approve</button>
                  <button class="btn btn-danger btn-sm" (click)="updateStatus(submission.id, 'REJECTED')">✗ Reject</button>
                </div>
              }
            </div>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .submissions-page {
      padding: 1.5rem;
      max-width: 900px;
      margin: 0 auto;
    }
    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 2rem;
    }
    .page-header h1 {
      margin: 0;
    }
    .page-header p {
      color: var(--color-text-muted);
      margin: 0.25rem 0 0;
    }
    .loading, .empty-state, .error {
      text-align: center;
      padding: 3rem;
      background: var(--color-surface);
      border-radius: var(--radius-lg);
    }
    .error {
      color: var(--color-danger);
    }
    .submissions-list {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }
    .submission-card {
      background: var(--color-surface);
      border-radius: var(--radius-lg);
      padding: 1.5rem;
    }
    .submission-header {
      display: flex;
      align-items: center;
      gap: 1rem;
      margin-bottom: 1rem;
      padding-bottom: 0.75rem;
      border-bottom: 1px solid var(--color-border);
    }
    .submission-id {
      font-family: monospace;
      font-size: 0.875rem;
      color: var(--color-text-muted);
    }
    .submission-date {
      font-size: 0.875rem;
      color: var(--color-text-muted);
    }
    .submission-status {
      margin-left: auto;
      padding: 0.25rem 0.75rem;
      border-radius: var(--radius-sm);
      font-size: 0.75rem;
      font-weight: 600;
    }
    .submission-status.approved {
      background: #dcfce7;
      color: #166534;
    }
    .submission-status.pending {
      background: #fef3c7;
      color: #92400e;
    }
    .submission-status.rejected {
      background: #fee2e2;
      color: #991b1b;
    }
    .submission-data {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }
    .field-item {
      display: flex;
      gap: 0.5rem;
    }
    .field-label {
      font-weight: 500;
      color: var(--color-text-muted);
    }
    .field-value {
      word-break: break-word;
    }
    .submission-actions {
      display: flex;
      gap: 0.5rem;
      margin-top: 1rem;
      padding-top: 1rem;
      border-top: 1px solid var(--color-border);
    }
    .btn-sm {
      padding: 0.375rem 0.75rem;
      font-size: 0.875rem;
    }
  `]
})
export class FormSubmissionsComponent implements OnInit {
  formId!: string;
  formName = signal('');
  submissions = signal<any[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);
  
  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private formService: FormService
  ) {}
  
  ngOnInit() {
    this.formId = this.route.snapshot.paramMap.get('id')!;
    this.loadSubmissions();
  }
  
  loadSubmissions() {
    this.loading.set(true);
    this.error.set(null);
    
    this.formService.getSubmissions(this.formId).subscribe({
      next: (submissions) => {
        this.submissions.set(submissions);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set('Failed to load submissions');
        this.loading.set(false);
      }
    });
  }
  
  getFields(submission: any): { key: string; label: string; value: any }[] {
    if (!submission.formData) return [];
    return Object.entries(submission.formData).map(([key, value]) => ({
      key,
      label: this.formatLabel(key),
      value: Array.isArray(value) ? value.join(', ') : value
    }));
  }
  
  formatLabel(key: string): string {
    return key
      .replace(/_/g, ' ')
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .trim();
  }
  
  updateStatus(id: string, status: 'APPROVED' | 'REJECTED') {
    this.formService.updateSubmissionStatus(id, status).subscribe({
      next: () => {
        this.loadSubmissions();
      },
      error: () => {
        alert('Failed to update status');
      }
    });
  }
}
