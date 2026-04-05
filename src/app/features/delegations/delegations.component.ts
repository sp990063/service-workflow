/**
 * Delegations Component
 * 
 * UI for managing approval delegations
 */

import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-delegations',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="delegations-page">
      <div class="page-header">
        <h1>Delegations</h1>
        <button class="btn btn-primary" (click)="showCreateForm.set(true)">
          + Add Delegation
        </button>
      </div>

      @if (loading()) {
        <div class="loading">Loading...</div>
      } @else {
        <div class="delegations-grid">
          <!-- My Delegations (I delegated to others) -->
          <div class="delegation-section">
            <h2>My Delegations</h2>
            <p class="section-desc">When you're away, someone else can approve on your behalf.</p>
            
            @if (myDelegations().length === 0) {
              <div class="empty-state">
                <p>No delegations set</p>
              </div>
            } @else {
              @for (d of myDelegations(); track d.id) {
                <div class="delegation-card">
                  <div class="delegation-info">
                    <strong>{{ d.delegate?.name || d.delegateId }}</strong>
                    <span class="email">{{ d.delegate?.email || '' }}</span>
                    <span class="period">
                      {{ d.startDate | date:'short' }} - {{ d.endDate | date:'short' }}
                    </span>
                    @if (d.reason) {
                      <span class="reason">{{ d.reason }}</span>
                    }
                  </div>
                  <div class="delegation-status">
                    @if (d.isActive) {
                      <span class="badge active">Active</span>
                    } @else {
                      <span class="badge inactive">Inactive</span>
                    }
                  </div>
                  <div class="delegation-actions">
                    <button class="btn btn-sm btn-secondary" (click)="deleteDelegation(d.id)">
                      Delete
                    </button>
                  </div>
                </div>
              }
            }
          </div>

          <!-- Delegated to Me -->
          <div class="delegation-section">
            <h2>Delegated to Me</h2>
            <p class="section-desc">Approvals that others have delegated to you.</p>
            
            @if (delegatedToMe().length === 0) {
              <div class="empty-state">
                <p>No one has delegated to you</p>
              </div>
            } @else {
              @for (d of delegatedToMe(); track d.id) {
                <div class="delegation-card delegated">
                  <div class="delegation-info">
                    <strong>{{ d.delegator?.name || d.delegatorId }}</strong>
                    <span class="email">{{ d.delegator?.email || '' }}</span>
                    <span class="period">
                      {{ d.startDate | date:'short' }} - {{ d.endDate | date:'short' }}
                    </span>
                    @if (d.reason) {
                      <span class="reason">Reason: {{ d.reason }}</span>
                    }
                  </div>
                </div>
              }
            }
          </div>
        </div>
      }

      <!-- Create Delegation Modal -->
      @if (showCreateForm()) {
        <div class="modal-overlay" (click)="showCreateForm.set(false)">
          <div class="modal" (click)="$event.stopPropagation()">
            <h2>Add Delegation</h2>
            
            <form (submit)="createDelegation($event)">
              <div class="form-group">
                <label>Delegate To (Email)</label>
                <input 
                  type="email" 
                  [(ngModel)]="newDelegation.email" 
                  name="email"
                  placeholder="colleague@company.com"
                  required
                />
              </div>

              <div class="form-group">
                <label>Reason (Optional)</label>
                <input 
                  type="text" 
                  [(ngModel)]="newDelegation.reason" 
                  name="reason"
                  placeholder="Vacation, Business trip, etc."
                />
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label>Start Date</label>
                  <input 
                    type="date" 
                    [(ngModel)]="newDelegation.startDate" 
                    name="startDate"
                    required
                  />
                </div>
                <div class="form-group">
                  <label>End Date</label>
                  <input 
                    type="date" 
                    [(ngModel)]="newDelegation.endDate" 
                    name="endDate"
                    required
                  />
                </div>
              </div>

              <div class="modal-actions">
                <button type="button" class="btn btn-secondary" (click)="showCreateForm.set(false)">
                  Cancel
                </button>
                <button type="submit" class="btn btn-primary" [disabled]="creating()">
                  {{ creating() ? 'Creating...' : 'Create Delegation' }}
                </button>
              </div>
            </form>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .delegations-page {
      padding: 2rem;
      max-width: 1200px;
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
    .loading {
      text-align: center;
      padding: 2rem;
      color: var(--color-text-muted);
    }
    .delegations-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 2rem;
    }
    .delegation-section {
      background: var(--color-surface);
      border-radius: var(--radius-lg);
      padding: 1.5rem;
    }
    .delegation-section h2 {
      margin: 0 0 0.5rem 0;
      font-size: 1.25rem;
    }
    .section-desc {
      color: var(--color-text-muted);
      font-size: 0.875rem;
      margin-bottom: 1rem;
    }
    .empty-state {
      text-align: center;
      padding: 2rem;
      color: var(--color-text-muted);
    }
    .delegation-card {
      background: var(--color-background);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      padding: 1rem;
      margin-bottom: 0.75rem;
    }
    .delegation-card.delegated {
      border-left: 3px solid var(--color-primary);
    }
    .delegation-info {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }
    .delegation-info strong {
      font-size: 1rem;
    }
    .delegation-info .email {
      color: var(--color-text-muted);
      font-size: 0.875rem;
    }
    .delegation-info .period {
      font-size: 0.75rem;
      color: var(--color-text-secondary);
    }
    .delegation-info .reason {
      font-size: 0.75rem;
      font-style: italic;
      color: var(--color-text-secondary);
    }
    .delegation-status {
      margin-top: 0.5rem;
    }
    .badge {
      display: inline-block;
      padding: 0.125rem 0.5rem;
      border-radius: var(--radius-sm);
      font-size: 0.75rem;
      font-weight: 500;
    }
    .badge.active {
      background: #d4edda;
      color: #155724;
    }
    .badge.inactive {
      background: #e2e3e5;
      color: #383d41;
    }
    .delegation-actions {
      margin-top: 0.5rem;
    }
    .btn-sm {
      padding: 0.25rem 0.75rem;
      font-size: 0.75rem;
    }
    .modal-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
    }
    .modal {
      background: var(--color-surface);
      border-radius: var(--radius-lg);
      padding: 2rem;
      width: 100%;
      max-width: 500px;
      max-height: 90vh;
      overflow-y: auto;
    }
    .modal h2 {
      margin: 0 0 1.5rem 0;
    }
    .form-group {
      margin-bottom: 1rem;
    }
    .form-group label {
      display: block;
      margin-bottom: 0.5rem;
      font-weight: 500;
    }
    .form-group input {
      width: 100%;
      padding: 0.5rem;
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      font-size: 1rem;
    }
    .form-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
    }
    .modal-actions {
      display: flex;
      justify-content: flex-end;
      gap: 0.75rem;
      margin-top: 1.5rem;
    }
  `]
})
export class DelegationsComponent implements OnInit {
  loading = signal(true);
  creating = signal(false);
  showCreateForm = signal(false);
  
  myDelegations = signal<any[]>([]);
  delegatedToMe = signal<any[]>([]);
  
  newDelegation = {
    email: '',
    reason: '',
    startDate: '',
    endDate: ''
  };

  constructor(
    private api: ApiService,
    private auth: AuthService
  ) {}

  ngOnInit() {
    this.loadDelegations();
  }

  loadDelegations() {
    this.loading.set(true);
    
    // Load my delegations
    this.api.get<any[]>('/delegations').subscribe({
      next: (delegations) => {
        this.myDelegations.set(delegations);
      }
    });

    // Load delegations to me
    this.api.get<any[]>('/delegations/my-delegate').subscribe({
      next: (delegations) => {
        this.delegatedToMe.set(delegations);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      }
    });
  }

  createDelegation(event: Event) {
    event.preventDefault();
    
    if (!this.newDelegation.email || !this.newDelegation.startDate || !this.newDelegation.endDate) {
      alert('Please fill in all required fields');
      return;
    }

    this.creating.set(true);

    // First get user ID by email
    this.api.post<{id: string}>('/users/lookup', { email: this.newDelegation.email }).subscribe({
      next: (lookup) => {
        const delegateId = lookup.id;
        
        this.api.post<any>('/delegations', {
          delegateId,
          reason: this.newDelegation.reason,
          startDate: new Date(this.newDelegation.startDate).toISOString(),
          endDate: new Date(this.newDelegation.endDate).toISOString()
        }).subscribe({
          next: () => {
            this.showCreateForm.set(false);
            this.newDelegation = { email: '', reason: '', startDate: '', endDate: '' };
            this.creating.set(false);
            this.loadDelegations();
            alert('Delegation created successfully');
          },
          error: (err) => {
            this.creating.set(false);
            alert('Failed to create delegation: ' + err.message);
          }
        });
      },
      error: () => {
        this.creating.set(false);
        alert('User not found. Please check the email address.');
      }
    });
  }

  deleteDelegation(id: string) {
    if (!confirm('Delete this delegation?')) return;

    this.api.delete<void>(`/delegations/${id}`).subscribe({
      next: () => {
        this.loadDelegations();
        alert('Delegation deleted');
      },
      error: (err) => {
        alert('Failed to delete: ' + err.message);
      }
    });
  }
}
