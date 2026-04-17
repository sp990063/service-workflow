import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { FormService } from '../../core/services/form.service';
import { AuthService } from '../../core/services/auth.service';
import { Form, FormElement, FormSection } from '../../core/models';

@Component({
  selector: 'app-form-fill',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="form-fill-page">
      @if (loading()) {
        <div class="loading">Loading form...</div>
      } @else if (!form()) {
        <div class="not-found">
          <h2>Form Not Found</h2>
          <p>The form you're looking for doesn't exist.</p>
          <a routerLink="/forms" class="btn btn-secondary">Back to Forms</a>
        </div>
      } @else {
        <header class="form-header">
          <h1>{{ form()!.name }}</h1>
          <p>Please fill out the form below and submit.</p>
        </header>
        
        <form class="form-content" (ngSubmit)="submitForm()">
          @if (hasSections()) {
            <!-- Section Progress Indicator -->
            <div class="form-progress">
              <div class="progress-bar">
                <div class="progress-fill" [style.width.%]="getProgressPercent()"></div>
              </div>
              <div class="progress-info">
                <span class="progress-text">Section {{ getCurrentSectionIndex() + 1 }} of {{ getSections().length }}</span>
                <span class="section-name">{{ getSections()[getCurrentSectionIndex()]?.title }}</span>
              </div>
            </div>
            <div class="section-navigation">
              <button type="button" class="btn btn-secondary" (click)="previousSection()" [disabled]="getCurrentSectionIndex() === 0">
                ← Previous
              </button>
              <span class="section-indicator">
                @for (s of getSections(); track s.id; let i = $index) {
                  <span class="dot" [class.active]="i === getCurrentSectionIndex()" [class.completed]="i < getCurrentSectionIndex()"></span>
                }
              </span>
              <button type="button" class="btn btn-secondary" (click)="nextSection()" [disabled]="getCurrentSectionIndex() >= getSections().length - 1">
                Next →
              </button>
            </div>

            <!-- Render current section only -->
            @if (getSections()[getCurrentSectionIndex()]; as section) {
              <div class="form-section">
                <div class="section-header">
                  <h3>{{ section.title }}</h3>
                  @if (section.description) {
                    <p>{{ section.description }}</p>
                  }
                </div>
                <div class="section-body" [class.cols-1]="section.columns === 1" [class.cols-2]="section.columns === 2" [class.cols-3]="section.columns === 3" [class.cols-4]="section.columns === 4">
                  @for (element of getElementsForSection(section.id); track element.id; let i = $index) {
                    <div class="form-field" [class.has-error]="fieldErrors()[element.id]">
                      <label [for]="'field-' + section.id + '-' + i">
                        {{ element.label }}
                        @if (element.required) {
                          <span class="required">*</span>
                        }
                      </label>
                      
                      @switch (element.type) {
                        @case ('text') {
                          <input type="text" [id]="'field-' + section.id + '-' + i" [(ngModel)]="formData[element.id]" [name]="'field-' + element.id" [placeholder]="element.placeholder" [required]="element.required">
                        }
                        @case ('textarea') {
                          <textarea [id]="'field-' + section.id + '-' + i" [(ngModel)]="formData[element.id]" [name]="'field-' + element.id" [placeholder]="element.placeholder" [required]="element.required" rows="4"></textarea>
                        }
                        @case ('number') {
                          <input type="number" [id]="'field-' + section.id + '-' + i" [(ngModel)]="formData[element.id]" [name]="'field-' + element.id" [placeholder]="element.placeholder" [required]="element.required">
                        }
                        @case ('email') {
                          <input type="email" [id]="'field-' + section.id + '-' + i" [(ngModel)]="formData[element.id]" [name]="'field-' + element.id" [placeholder]="element.placeholder || 'email@example.com'" [required]="element.required">
                        }
                        @case ('phone') {
                          <input type="tel" [id]="'field-' + section.id + '-' + i" [(ngModel)]="formData[element.id]" [name]="'field-' + element.id" [placeholder]="element.placeholder || '(555) 555-5555'" [required]="element.required">
                        }
                        @case ('date') {
                          <input type="date" [id]="'field-' + section.id + '-' + i" [(ngModel)]="formData[element.id]" [name]="'field-' + element.id" [required]="element.required">
                        }
                        @case ('dropdown') {
                          <select [id]="'field-' + section.id + '-' + i" [(ngModel)]="formData[element.id]" [name]="'field-' + element.id" [required]="element.required">
                            <option value="">Select an option...</option>
                            @for (option of element.options; track option) {
                              <option [value]="option">{{ option }}</option>
                            }
                          </select>
                        }
                        @case ('radio') {
                          <div class="radio-group">
                            @for (option of element.options; track option) {
                              <label class="radio-label">
                                <input type="radio" [name]="'field-' + element.id" [value]="option" [(ngModel)]="formData[element.id]">
                                {{ option }}
                              </label>
                            }
                          </div>
                        }
                        @case ('checkbox') {
                          <div class="checkbox-group">
                            @for (option of element.options; track option) {
                              <label class="checkbox-label">
                                <input type="checkbox" [value]="option" (change)="toggleCheckbox(element.id, option, $event)">
                                {{ option }}
                              </label>
                            }
                          </div>
                        }
                        @case ('yesno') {
                          <div class="yesno-group">
                            <label class="radio-label"><input type="radio" [name]="'field-' + element.id" value="Yes" [(ngModel)]="formData[element.id]"> Yes</label>
                            <label class="radio-label"><input type="radio" [name]="'field-' + element.id" value="No" [(ngModel)]="formData[element.id]"> No</label>
                          </div>
                        }
                        @default {
                          <input type="text" [id]="'field-' + section.id + '-' + i" [(ngModel)]="formData[element.id]" [name]="'field-' + element.id" [placeholder]="element.placeholder" [required]="element.required">
                        }
                      }
                      
                      @if (fieldErrors()[element.id]) {
                        <span class="error-message">{{ fieldErrors()[element.id] }}</span>
                      }
                    </div>
                  }
                </div>
              </div>
            }
            
            <!-- Elements without section (backward compatibility) -->
            @if (getElementsForSection(null).length > 0) {
              <div class="form-section default-section">
                <div class="section-body cols-1">
                  @for (element of getElementsForSection(null); track element.id; let i = $index) {
                    <div class="form-field" [class.has-error]="fieldErrors()[element.id]">
                      <label [for]="'field-none-' + i">{{ element.label }} @if (element.required) { <span class="required">*</span> }</label>
                      @switch (element.type) {
                        @case ('text') {
                          <input type="text" [id]="'field-none-' + i" [(ngModel)]="formData[element.id]" [name]="'field-' + element.id" [placeholder]="element.placeholder" [required]="element.required">
                        }
                        @case ('textarea') {
                          <textarea [id]="'field-none-' + i" [(ngModel)]="formData[element.id]" [name]="'field-' + element.id" [placeholder]="element.placeholder" [required]="element.required" rows="4"></textarea>
                        }
                        @case ('number') {
                          <input type="number" [id]="'field-none-' + i" [(ngModel)]="formData[element.id]" [name]="'field-' + element.id" [placeholder]="element.placeholder" [required]="element.required">
                        }
                        @case ('email') {
                          <input type="email" [id]="'field-none-' + i" [(ngModel)]="formData[element.id]" [name]="'field-' + element.id" [placeholder]="element.placeholder || 'email@example.com'" [required]="element.required">
                        }
                        @case ('dropdown') {
                          <select [id]="'field-none-' + i" [(ngModel)]="formData[element.id]" [name]="'field-' + element.id" [required]="element.required">
                            <option value="">Select an option...</option>
                            @for (option of element.options; track option) {
                              <option [value]="option">{{ option }}</option>
                            }
                          </select>
                        }
                        @default {
                          <input type="text" [id]="'field-none-' + i" [(ngModel)]="formData[element.id]" [name]="'field-' + element.id" [placeholder]="element.placeholder" [required]="element.required">
                        }
                      }
                      @if (fieldErrors()[element.id]) {
                        <span class="error-message">{{ fieldErrors()[element.id] }}</span>
                      }
                    </div>
                  }
                </div>
              </div>
            }
          } @else {
            <!-- Original rendering without sections -->
            @for (element of form()!.elements; track element.id; let i = $index) {
              <div class="form-field" [class.has-error]="fieldErrors()[element.id]">
                <label [for]="'field-' + i">{{ element.label }} @if (element.required) { <span class="required">*</span> }</label>
                @switch (element.type) {
                  @case ('text') { <input type="text" [id]="'field-' + i" [(ngModel)]="formData[element.id]" [name]="'field-' + element.id" [placeholder]="element.placeholder" [required]="element.required"> }
                  @case ('textarea') { <textarea [id]="'field-' + i" [(ngModel)]="formData[element.id]" [name]="'field-' + element.id" [placeholder]="element.placeholder" [required]="element.required" rows="4"></textarea> }
                  @case ('number') { <input type="number" [id]="'field-' + i" [(ngModel)]="formData[element.id]" [name]="'field-' + element.id" [placeholder]="element.placeholder" [required]="element.required"> }
                  @case ('email') { <input type="email" [id]="'field-' + i" [(ngModel)]="formData[element.id]" [name]="'field-' + element.id" [placeholder]="element.placeholder || 'email@example.com'" [required]="element.required"> }
                  @case ('phone') { <input type="tel" [id]="'field-' + i" [(ngModel)]="formData[element.id]" [name]="'field-' + element.id" [placeholder]="element.placeholder || '(555) 555-5555'" [required]="element.required"> }
                  @case ('date') { <input type="date" [id]="'field-' + i" [(ngModel)]="formData[element.id]" [name]="'field-' + element.id" [required]="element.required"> }
                  @case ('dropdown') {
                    <select [id]="'field-' + i" [(ngModel)]="formData[element.id]" [name]="'field-' + element.id" [required]="element.required">
                      <option value="">Select an option...</option>
                      @for (option of element.options; track option) { <option [value]="option">{{ option }}</option> }
                    </select>
                  }
                  @case ('radio') {
                    <div class="radio-group">
                      @for (option of element.options; track option) {
                        <label class="radio-label"><input type="radio" [name]="'field-' + element.id" [value]="option" [(ngModel)]="formData[element.id]"> {{ option }}</label>
                      }
                    </div>
                  }
                  @case ('checkbox') {
                    <div class="checkbox-group">
                      @for (option of element.options; track option) {
                        <label class="checkbox-label"><input type="checkbox" [value]="option" (change)="toggleCheckbox(element.id, option, $event)"> {{ option }}</label>
                      }
                    </div>
                  }
                  @case ('yesno') {
                    <div class="yesno-group">
                      <label class="radio-label"><input type="radio" [name]="'field-' + element.id" value="Yes" [(ngModel)]="formData[element.id]"> Yes</label>
                      <label class="radio-label"><input type="radio" [name]="'field-' + element.id" value="No" [(ngModel)]="formData[element.id]"> No</label>
                    </div>
                  }
                  @default { <input type="text" [id]="'field-' + i" [(ngModel)]="formData[element.id]" [name]="'field-' + element.id" [placeholder]="element.placeholder" [required]="element.required"> }
                }
                @if (fieldErrors()[element.id]) { <span class="error-message">{{ fieldErrors()[element.id] }}</span> }
              </div>
            }
          }
          
          @if (form()!.elements.length === 0) {
            <div class="no-elements">
              <p>This form has no elements yet.</p>
            </div>
          }
          
          <div class="form-actions">
            <button type="button" class="btn btn-secondary" (click)="cancel()">Cancel</button>
            <button type="submit" class="btn btn-primary" [disabled]="submitting()">
              {{ submitting() ? 'Submitting...' : 'Submit Form' }}
            </button>
          </div>
        </form>
        
        @if (submitted()) {
          <div class="success-message">
            <div class="success-icon">✓</div>
            <h3>Form Submitted Successfully!</h3>
            <p>Thank you for your submission.</p>
            <button class="btn btn-primary" (click)="backToForms()">Back to Forms</button>
          </div>
        }
      }
    </div>
  `,
  styles: [`
    .form-fill-page {
      max-width: 700px;
      margin: 0 auto;
      padding: 2rem;
    }
    .form-header {
      margin-bottom: 2rem;
      text-align: center;
    }
    .form-header h1 {
      font-size: 1.75rem;
      margin-bottom: 0.5rem;
    }
    .form-header p {
      color: var(--color-text-muted);
    }
    .form-content {
      background: var(--color-surface);
      border-radius: var(--radius-lg);
      padding: 2rem;
    }
    .form-field {
      margin-bottom: 1.5rem;
    }
    .form-field label {
      display: block;
      font-weight: 500;
      margin-bottom: 0.5rem;
    }
    .required {
      color: var(--color-danger);
    }
    .form-field input[type="text"],
    .form-field input[type="email"],
    .form-field input[type="tel"],
    .form-field input[type="number"],
    .form-field input[type="date"],
    .form-field select,
    .form-field textarea {
      width: 100%;
      padding: 0.75rem;
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      font-size: 1rem;
    }
    .form-field input:focus,
    .form-field select:focus,
    .form-field textarea:focus {
      outline: none;
      border-color: var(--color-primary);
      box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
    }
    .radio-group, .checkbox-group, .yesno-group {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }
    .radio-label, .checkbox-label {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      cursor: pointer;
    }
    .radio-label input, .checkbox-label input {
      width: auto;
    }
    .has-error input,
    .has-error select,
    .has-error textarea {
      border-color: var(--color-danger);
    }
    .error-message {
      color: var(--color-danger);
      font-size: 0.75rem;
      margin-top: 0.25rem;
    }
    .form-actions {
      display: flex;
      justify-content: flex-end;
      gap: 1rem;
      margin-top: 2rem;
      padding-top: 1rem;
      border-top: 1px solid var(--color-border);
    }
    .no-elements {
      text-align: center;
      padding: 2rem;
      color: var(--color-text-muted);
    }
    
    /* Section layout styles */
    .form-section {
      margin-bottom: 2rem;
    }
    .form-progress {
      display: flex;
      align-items: center;
      gap: 1rem;
      margin-bottom: 1rem;
      padding: 1rem;
      background: var(--color-background);
      border-radius: var(--radius-md);
    }
    .progress-bar {
      flex: 1;
      height: 8px;
      background: var(--color-border);
      border-radius: 4px;
      overflow: hidden;
    }
    .progress-fill {
      height: 100%;
      background: var(--color-primary);
      transition: width 0.3s ease;
    }
    .progress-info {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 0.125rem;
      min-width: 120px;
    }
    .progress-text {
      font-size: 0.75rem;
      color: var(--color-text-muted);
    }
    .section-name {
      font-size: 0.875rem;
      font-weight: 500;
    }
    .section-navigation {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1.5rem;
    }
    .section-indicator {
      display: flex;
      gap: 0.5rem;
    }
    .dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background: var(--color-border);
      transition: all 0.2s ease;
    }
    .dot.active {
      background: var(--color-primary);
      transform: scale(1.2);
    }
    .dot.completed {
      background: var(--color-success);
    }
    .section-header {
      margin-bottom: 1rem;
      padding-bottom: 0.75rem;
      border-bottom: 1px solid var(--color-border);
    }
    .section-header h3 {
      font-size: 1rem;
      font-weight: 600;
      margin-bottom: 0.25rem;
    }
    .section-header p {
      font-size: 0.875rem;
      color: var(--color-text-muted);
    }
    .section-body {
      display: grid;
      gap: 1rem;
    }
    .section-body.cols-1 { grid-template-columns: 1fr; }
    .section-body.cols-2 { grid-template-columns: 1fr 1fr; }
    .section-body.cols-3 { grid-template-columns: 1fr 1fr 1fr; }
    .section-body.cols-4 { grid-template-columns: 1fr 1fr 1fr 1fr; }
    .default-section {
      margin-top: 1rem;
    }
    .loading, .not-found {
      text-align: center;
      padding: 4rem 2rem;
    }
    .not-found h2 {
      margin-bottom: 0.5rem;
    }
    .not-found p {
      color: var(--color-text-muted);
      margin-bottom: 1rem;
    }
    .success-message {
      text-align: center;
      padding: 3rem;
      background: var(--color-surface);
      border-radius: var(--radius-lg);
    }
    .success-icon {
      width: 64px;
      height: 64px;
      background: var(--color-success);
      color: white;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 2rem;
      margin: 0 auto 1rem;
    }
    .success-message h3 {
      margin-bottom: 0.5rem;
    }
    .success-message p {
      color: var(--color-text-muted);
      margin-bottom: 1.5rem;
    }
  `]
})
export class FormFillComponent implements OnInit {
  form = signal<Form | null>(null);
  loading = signal(true);
  submitting = signal(false);
  submitted = signal(false);
  formData: Record<string, any> = {};
  fieldErrors = signal<Record<string, string>>({});
  currentSectionIndex = signal(0);
  
  
  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private formService: FormService,
    private auth: AuthService
  ) {}
  
  ngOnInit() {
    const formId = this.route.snapshot.paramMap.get('id');
    if (formId) {
      this.loadForm(formId);
    } else {
      this.loading.set(false);
    }
  }
  
  loadForm(formId: string) {
    this.currentSectionIndex.set(0); // Reset to first section
    this.formService.getById(formId).subscribe({
      next: (form) => {
        this.form.set(form);
        // Initialize form data
        form.elements.forEach((el: any) => {
          if (el.type === 'checkbox') {
            this.formData[el.id] = [];
          } else {
            this.formData[el.id] = '';
          }
        });
        this.loading.set(false);
      },
      error: () => {
        this.form.set(null);
        this.loading.set(false);
      }
    });
  }
  
  // Get elements for a specific section
  getElementsForSection(sectionId: string | null): FormElement[] {
    const currentForm = this.form();
    if (!currentForm) return [];
    return currentForm.elements.filter(e => {
      if (sectionId === null) {
        return e.sectionId === null || e.sectionId === undefined;
      }
      return e.sectionId === sectionId;
    });
  }
  
  // Get all sections sorted by order
  getSections(): FormSection[] {
    const currentForm = this.form();
    if (!currentForm?.sections) return [];
    return currentForm.sections.sort((a, b) => a.order - b.order);
  }
  
  // Check if form has sections
  hasSections(): boolean {
    const currentForm = this.form();
    return (currentForm?.sections?.length ?? 0) > 0;
  }

  getCurrentSectionIndex(): number {
    return this.currentSectionIndex();
  }

  getProgressPercent(): number {
    const sections = this.getSections();
    if (sections.length === 0) return 0;
    return Math.round(((this.currentSectionIndex() + 1) / sections.length) * 100);
  }

  previousSection(): void {
    const current = this.currentSectionIndex();
    if (current > 0) {
      this.currentSectionIndex.set(current - 1);
    }
  }

  nextSection(): void {
    const sections = this.getSections();
    const current = this.currentSectionIndex();
    if (current < sections.length - 1) {
      this.currentSectionIndex.set(current + 1);
    }
  }

  toggleCheckbox(elementId: string, option: string, event: Event) {
    const checked = (event.target as HTMLInputElement).checked;
    if (!this.formData[elementId]) {
      this.formData[elementId] = [];
    }
    if (checked) {
      this.formData[elementId].push(option);
    } else {
      this.formData[elementId] = this.formData[elementId].filter((o: string) => o !== option);
    }
  }
  
  validateForm(): boolean {
    this.fieldErrors.set({});
    const formData = this.form();
    if (!formData) return false;
    
    for (const element of formData.elements) {
      if (element.required) {
        const value = this.formData[element.id];
        if (!value || (Array.isArray(value) && value.length === 0)) {
          this.fieldErrors.update(errors => ({ ...errors, [element.id]: 'This field is required' }));
        }
      }
    }
    
    return Object.keys(this.fieldErrors()).length === 0;
  }
  
  submitForm() {
    if (!this.validateForm()) {
      return;
    }
    
    this.submitting.set(true);
    const user = this.auth.user();
    const userId = user?.id || 'anonymous';
    
    this.formService.submit(this.form()!.id, userId, { ...this.formData }).subscribe({
      next: () => {
        this.submitting.set(false);
        this.submitted.set(true);
      },
      error: () => {
        this.submitting.set(false);
      }
    });
  }
  
  cancel() {
    this.router.navigate(['/forms']);
  }
  
  backToForms() {
    this.router.navigate(['/forms']);
  }
}
