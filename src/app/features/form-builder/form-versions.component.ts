/**
 * Form Versions Component
 * 
 * Shows version history and allows rollback
 */

import { Component, Input, Output, EventEmitter, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FormService } from '../../core/services/form.service';

@Component({
  selector: 'app-form-versions',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="versions-panel open">
      <div class="versions-header">
        <h3>Version History</h3>
        <button class="close-btn" (click)="close.emit()">×</button>
      </div>
      
      @if (loading()) {
        <div class="loading">Loading versions...</div>
      } @else if (versions().length === 0) {
        <div class="empty">No version history</div>
      } @else {
        <div class="versions-list">
          @for (v of versions(); track v.id) {
            <div class="version-item" [class.current]="v.version === currentVersion">
              <div class="version-header">
                <span class="version-number">v{{ v.version }}</span>
                @if (v.version === currentVersion) {
                  <span class="current-badge">Current</span>
                }
              </div>
              <div class="version-date">{{ v.createdAt | date:'medium' }}</div>
              @if (v.version !== currentVersion) {
                <div class="version-actions">
                  <button class="btn btn-sm btn-secondary" (click)="viewVersion(v.version)">
                    Preview
                  </button>
                  <button class="btn btn-sm btn-primary" (click)="rollback(v.version)">
                    Restore
                  </button>
                </div>
              }
            </div>
          }
        </div>
      }
      
      @if (selectedVersion()) {
        <div class="version-preview">
          <h4>Preview v{{ selectedVersion()?.version }}</h4>
          <pre>{{ selectedVersion()?.elements | json }}</pre>
        </div>
      }
    </div>
  `,
  styles: [`
    .versions-panel {
      position: fixed;
      right: -400px;
      top: 0;
      width: 400px;
      height: 100vh;
      background: var(--color-surface);
      box-shadow: -2px 0 10px rgba(0,0,0,0.1);
      z-index: 1000;
      transition: right 0.3s ease;
      display: flex;
      flex-direction: column;
    }
    .versions-panel.open {
      right: 0;
    }
    .versions-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1rem;
      border-bottom: 1px solid var(--color-border);
    }
    .versions-header h3 {
      margin: 0;
    }
    .close-btn {
      background: none;
      border: none;
      font-size: 1.5rem;
      cursor: pointer;
      padding: 0.25rem 0.5rem;
    }
    .loading, .empty {
      padding: 2rem;
      text-align: center;
      color: var(--color-text-muted);
    }
    .versions-list {
      flex: 1;
      overflow-y: auto;
      padding: 1rem;
    }
    .version-item {
      padding: 1rem;
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      margin-bottom: 0.75rem;
    }
    .version-item.current {
      border-color: var(--color-primary);
      background: var(--color-primary-light);
    }
    .version-header {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin-bottom: 0.25rem;
    }
    .version-number {
      font-weight: 600;
    }
    .current-badge {
      font-size: 0.75rem;
      background: var(--color-primary);
      color: white;
      padding: 0.125rem 0.5rem;
      border-radius: var(--radius-sm);
    }
    .version-date {
      font-size: 0.75rem;
      color: var(--color-text-muted);
      margin-bottom: 0.5rem;
    }
    .version-actions {
      display: flex;
      gap: 0.5rem;
    }
    .btn-sm {
      padding: 0.25rem 0.75rem;
      font-size: 0.75rem;
    }
    .version-preview {
      padding: 1rem;
      border-top: 1px solid var(--color-border);
      max-height: 40%;
      overflow: auto;
    }
    .version-preview h4 {
      margin: 0 0 0.5rem 0;
    }
    .version-preview pre {
      font-size: 0.75rem;
      background: var(--color-background);
      padding: 0.5rem;
      border-radius: var(--radius-sm);
      overflow: auto;
      max-height: 150px;
    }
  `]
})
export class FormVersionsComponent {
  @Input() formId!: string;
  @Input() currentVersion = 1;
  @Output() close = new EventEmitter<void>();
  @Output() restored = new EventEmitter<void>();

  versions = signal<any[]>([]);
  selectedVersion = signal<any | null>(null);
  loading = signal(false);

  constructor(private formService: FormService) {}

  ngOnInit() {
    this.loadVersions();
  }

  loadVersions() {
    this.loading.set(true);
    this.formService.getVersions(this.formId).subscribe({
      next: (versions) => {
        this.versions.set(versions);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      }
    });
  }

  viewVersion(version: number) {
    this.formService.getVersion(this.formId, version).subscribe({
      next: (v) => {
        this.selectedVersion.set(v);
      }
    });
  }

  rollback(version: number) {
    if (confirm(`Restore to version ${version}? Current version will be saved as a new version.`)) {
      this.formService.rollback(this.formId, version).subscribe({
        next: () => {
          alert('Form restored successfully');
          this.restored.emit();
          this.close.emit();
        },
        error: (err) => {
          alert('Failed to restore: ' + err.message);
        }
      });
    }
  }
}
