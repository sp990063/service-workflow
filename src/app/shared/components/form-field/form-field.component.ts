import { Component, Input, Output, EventEmitter, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FormElement } from '../../../core/models';

export type FormFieldType = 'text' | 'number' | 'textarea' | 'email' | 'date' | 'dropdown' | 'checkbox' | 'radio';

@Component({
  selector: 'app-form-field',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="form-field" [class.has-error]="hasError()">
      <label [for]="fieldId">
        {{ element.label }}
        @if (element.required) {
          <span class="required">*</span>
        }
      </label>

      @switch (element.type) {
        @case ('text') {
          <input
            type="text"
            [id]="fieldId"
            [name]="element.label"
            [value]="value"
            (input)="onInputChange($event)"
            [placeholder]="element.placeholder || ''"
            [required]="element.required"
            [attr.minlength]="element.validation?.min"
            [attr.maxlength]="element.validation?.max"
          >
        }

        @case ('number') {
          <input
            type="number"
            [id]="fieldId"
            [name]="element.label"
            [value]="value"
            (input)="onInputChange($event)"
            [placeholder]="element.placeholder || ''"
            [required]="element.required"
            [min]="element.validation?.min"
            [max]="element.validation?.max"
          >
        }

        @case ('textarea') {
          <textarea
            [id]="fieldId"
            [name]="element.label"
            [value]="value"
            (input)="onInputChange($event)"
            [placeholder]="element.placeholder || ''"
            [required]="element.required"
            rows="3"
          ></textarea>
        }

        @case ('email') {
          <input
            type="email"
            [id]="fieldId"
            [name]="element.label"
            [value]="value"
            (input)="onInputChange($event)"
            placeholder="email@example.com"
            [required]="element.required"
          >
        }

        @case ('date') {
          <input
            type="date"
            [id]="fieldId"
            [name]="element.label"
            [value]="value"
            (dateChange)="onInputChange($event)"
            [required]="element.required"
          >
        }

        @case ('dropdown') {
          <select
            [id]="fieldId"
            [name]="element.label"
            [attr.value]="value || ''"
            (change)="onSelectChange($event)"
            [required]="element.required"
          >
            <option value="">Select an option...</option>
            @for (option of element.options; track option) {
              <option [value]="option">{{ option }}</option>
            }
          </select>
        }

        @case ('checkbox') {
          <label class="checkbox-label">
            <input
              type="checkbox"
              [name]="element.label"
              [checked]="value"
              (change)="onCheckboxChange($event)"
            >
            {{ element.label }}
          </label>
        }

        @case ('radio') {
          <div class="radio-group">
            @for (option of element.options; track option) {
              <label class="radio-label">
                <input
                  type="radio"
                  [name]="element.label"
                  [value]="option"
                  [checked]="value === option"
                  (change)="onRadioChange(option)"
                >
                {{ option }}
              </label>
            }
          </div>
        }

        @default {
          <input
            type="text"
            [id]="fieldId"
            [name]="element.label"
            [value]="value"
            (input)="onInputChange($event)"
            [placeholder]="element.placeholder || ''"
            [required]="element.required"
          >
        }
      }

      @if (hasError()) {
        <span class="error-message">{{ errorMessage() }}</span>
      }
    </div>
  `,
  styles: [`
    .form-field {
      margin-bottom: 1rem;
    }

    .form-field label {
      display: block;
      font-size: 0.875rem;
      font-weight: 500;
      margin-bottom: 0.25rem;
    }

    .form-field input,
    .form-field select,
    .form-field textarea {
      width: 100%;
      padding: 0.75rem;
      border: 1px solid var(--color-border, #e5e7eb);
      border-radius: var(--radius-md, 6px);
      font-size: 0.875rem;
      transition: border-color 0.2s, box-shadow 0.2s;
    }

    .form-field input:focus,
    .form-field select:focus,
    .form-field textarea:focus {
      outline: none;
      border-color: var(--color-primary, #3b82f6);
      box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
    }

    .form-field.has-error input,
    .form-field.has-error select,
    .form-field.has-error textarea {
      border-color: var(--color-danger, #ef4444);
    }

    .form-field textarea {
      resize: vertical;
      min-height: 80px;
    }

    .required {
      color: var(--color-danger, #ef4444);
      margin-left: 0.25rem;
    }

    .checkbox-label,
    .radio-label {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      cursor: pointer;
      font-weight: normal;
    }

    .checkbox-label input,
    .radio-label input {
      width: auto;
    }

    .radio-group {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .error-message {
      display: block;
      font-size: 0.75rem;
      color: var(--color-danger, #ef4444);
      margin-top: 0.25rem;
    }
  `]
})
export class FormFieldComponent {
  @Input({ required: true }) element!: FormElement;
  @Input() value: any = null;
  @Input() fieldIndex = 0;
  @Output() valueChange = new EventEmitter<any>();

  private _touched = signal(false);

  get fieldId(): string {
    return `field-${this.fieldIndex}-${this.element.id}`;
  }

  hasError = computed(() => {
    if (!this._touched()) return false;
    if (!this.element.required) return false;
    if (this.element.type === 'checkbox') return false;
    return !this.value;
  });

  errorMessage = computed(() => {
    if (!this.element.required) return '';
    return 'This field is required';
  });

  onInputChange(event: Event): void {
    const target = event.target as HTMLInputElement | HTMLTextAreaElement;
    this._touched.set(true);
    this.valueChange.emit(target.value);
  }

  onSelectChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    this._touched.set(true);
    this.valueChange.emit(target.value);
  }

  onCheckboxChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    this._touched.set(true);
    this.valueChange.emit(target.checked);
  }

  onRadioChange(value: string): void {
    this._touched.set(true);
    this.valueChange.emit(value);
  }

  touch(): void {
    this._touched.set(true);
  }

  validate(): boolean {
    this._touched.set(true);
    return !this.hasError();
  }
}
