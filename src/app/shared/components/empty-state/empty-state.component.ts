import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-empty-state',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="empty-state">
      <div class="empty-icon">{{ icon }}</div>
      <h3 class="empty-title">{{ title }}</h3>
      @if (message) {
        <p class="empty-message">{{ message }}</p>
      }
      @if (actionLabel && actionLink) {
        <a [routerLink]="actionLink" class="btn btn-primary empty-action">
          {{ actionLabel }}
        </a>
      } @else if (actionLabel && actionHandler) {
        <button class="btn btn-primary empty-action" (click)="actionHandler()">
          {{ actionLabel }}
        </button>
      }
    </div>
  `,
  styles: [`
    .empty-state {
      text-align: center;
      padding: 4rem 2rem;
      background: var(--color-surface);
      border-radius: var(--radius-lg);
    }
    .empty-icon {
      font-size: 3rem;
      margin-bottom: 1rem;
    }
    .empty-title {
      font-size: 1.125rem;
      font-weight: 600;
      margin-bottom: 0.5rem;
      color: var(--color-text);
    }
    .empty-message {
      color: var(--color-text-muted);
      font-size: 0.875rem;
      margin-bottom: 1.5rem;
      max-width: 300px;
      margin-left: auto;
      margin-right: auto;
    }
    .empty-action {
      display: inline-flex;
    }
  `]
})
export class EmptyStateComponent {
  @Input() icon = '📋';
  @Input() title = 'Nothing here yet';
  @Input() message = '';
  @Input() actionLabel?: string;
  @Input() actionLink?: string;
  @Input() actionHandler?: () => void;
}
