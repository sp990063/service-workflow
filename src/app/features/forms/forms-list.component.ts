import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { StorageService } from '../../core/services/storage.service';
import { Form } from '../../core/models';

@Component({
  selector: 'app-forms-list',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="forms-list-page">
      <header class="page-header">
        <div>
          <h1>Forms</h1>
          <p>Manage your service forms</p>
        </div>
        <a routerLink="/form-builder" class="btn btn-primary">+ New Form</a>
      </header>
      
      @if (forms().length === 0) {
        <div class="empty-state">
          <p>No forms yet.</p>
          <a routerLink="/form-builder" class="btn btn-secondary">Create your first form</a>
        </div>
      } @else {
        <div class="forms-grid">
          @for (form of forms(); track form.id) {
            <div class="form-card">
              <div class="form-card-header">
                <h3>{{ form.name }}</h3>
                <span class="element-count">{{ form.elements.length }} elements</span>
              </div>
              <div class="form-card-meta">
                <span>Created: {{ form.createdAt | date:'mediumDate' }}</span>
                <span>Updated: {{ form.updatedAt | date:'mediumDate' }}</span>
              </div>
              <div class="form-card-actions">
                <a [routerLink]="['/form-fill', form.id]" class="btn btn-primary btn-sm">Fill Form</a>
                <a [routerLink]="['/form-builder']" class="btn btn-secondary btn-sm">Edit</a>
              </div>
            </div>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .forms-list-page {
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
    .forms-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 1rem;
    }
    .form-card {
      background: var(--color-surface);
      border-radius: var(--radius-lg);
      padding: 1.5rem;
      box-shadow: var(--shadow-sm);
    }
    .form-card-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 1rem;
    }
    .form-card-header h3 {
      font-size: 1.125rem;
    }
    .element-count {
      font-size: 0.75rem;
      background: var(--color-background);
      padding: 0.25rem 0.5rem;
      border-radius: var(--radius-sm);
      color: var(--color-text-muted);
    }
    .form-card-meta {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
      font-size: 0.75rem;
      color: var(--color-text-muted);
      margin-bottom: 1rem;
    }
    .form-card-actions {
      display: flex;
      gap: 0.5rem;
    }
    .btn-sm {
      padding: 0.375rem 0.75rem;
      font-size: 0.75rem;
    }
  `]
})
export class FormsListComponent implements OnInit {
  forms = signal<Form[]>([]);
  
  constructor(private storage: StorageService) {}
  
  ngOnInit() {
    this.loadForms();
  }
  
  loadForms() {
    const forms = this.storage.get<Form[]>('forms') || [];
    this.forms.set(forms);
  }
}
