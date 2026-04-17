import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastService, Toast } from './toast.service';

@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="toast-container">
      @for (toast of toasts(); track toast.id) {
        <div class="toast" [class]="'toast-' + toast.type">
          <div class="toast-icon">
            @switch (toast.type) {
              @case ('success') { ✓ }
              @case ('error') { ✗ }
              @case ('warning') { ⚠ }
              @case ('info') { ℹ }
            }
          </div>
          <div class="toast-content">
            <span class="toast-message">{{ toast.message }}</span>
            @if (toast.actions?.length) {
              <div class="toast-actions">
                @for (action of toast.actions; track action.label) {
                  <button class="toast-action-btn" (click)="action.handler(); dismiss(toast.id)">
                    {{ action.label }}
                  </button>
                }
              </div>
            }
          </div>
          <button class="toast-close" (click)="dismiss(toast.id)">×</button>
        </div>
      }
    </div>
  `,
  styles: [`
    .toast-container {
      position: fixed;
      bottom: 1.5rem;
      right: 1.5rem;
      z-index: 9999;
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      max-width: 400px;
    }
    .toast {
      display: flex;
      align-items: flex-start;
      gap: 0.75rem;
      padding: 1rem;
      background: var(--color-surface);
      border-radius: var(--radius-md);
      box-shadow: var(--shadow-lg);
      animation: slideIn 0.3s ease;
    }
    @keyframes slideIn {
      from {
        transform: translateX(100%);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }
    .toast-success {
      border-left: 4px solid var(--color-success);
    }
    .toast-error {
      border-left: 4px solid var(--color-danger);
    }
    .toast-warning {
      border-left: 4px solid var(--color-warning);
    }
    .toast-info {
      border-left: 4px solid var(--color-primary);
    }
    .toast-icon {
      width: 24px;
      height: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
      font-size: 0.875rem;
      font-weight: 700;
      flex-shrink: 0;
    }
    .toast-success .toast-icon {
      background: #d1fae5;
      color: var(--color-success);
    }
    .toast-error .toast-icon {
      background: #fee2e2;
      color: var(--color-danger);
    }
    .toast-warning .toast-icon {
      background: #fef3c7;
      color: var(--color-warning);
    }
    .toast-info .toast-icon {
      background: #dbeafe;
      color: var(--color-primary);
    }
    .toast-content {
      flex: 1;
      min-width: 0;
    }
    .toast-message {
      font-size: 0.875rem;
      line-height: 1.4;
    }
    .toast-actions {
      display: flex;
      gap: 0.5rem;
      margin-top: 0.5rem;
    }
    .toast-action-btn {
      padding: 0.25rem 0.5rem;
      background: var(--color-background);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-sm);
      font-size: 0.75rem;
      cursor: pointer;
      transition: all var(--transition-fast);
    }
    .toast-action-btn:hover {
      background: var(--color-border);
    }
    .toast-close {
      background: none;
      border: none;
      font-size: 1.25rem;
      color: var(--color-text-muted);
      cursor: pointer;
      padding: 0;
      line-height: 1;
    }
    .toast-close:hover {
      color: var(--color-text);
    }
  `]
})
export class ToastComponent {
  toasts = this.toastService.getToasts();

  constructor(private toastService: ToastService) {}

  dismiss(id: string) {
    this.toastService.dismiss(id);
  }
}
