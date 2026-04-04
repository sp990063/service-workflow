import { Component, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FormService } from '../../core/services/form.service';
import { Form, FormElement } from '../../core/models';

const ELEMENT_TYPES = [
  { type: 'text', label: 'Single Line Text', icon: 'Aa' },
  { type: 'textarea', label: 'Multi Line Text', icon: '¶' },
  { type: 'number', label: 'Number', icon: '#' },
  { type: 'email', label: 'Email', icon: '@' },
  { type: 'phone', label: 'Phone', icon: '☎' },
  { type: 'date', label: 'Date', icon: '📅' },
  { type: 'daterange', label: 'Date Range', icon: '📆' },
  { type: 'time', label: 'Time', icon: '🕐' },
  { type: 'dropdown', label: 'Dropdown', icon: '▼' },
  { type: 'radio', label: 'Radio Buttons', icon: '◉' },
  { type: 'checkbox', label: 'Checkboxes', icon: '☑' },
  { type: 'multiselect', label: 'Multi-Select', icon: '☰' },
  { type: 'yesno', label: 'Yes/No', icon: '✓' },
  { type: 'file', label: 'File Upload', icon: '📎' },
  { type: 'image', label: 'Image Upload', icon: '🖼' },
  { type: 'signature', label: 'Signature', icon: '✍' },
  { type: 'userpicker', label: 'User Picker', icon: '👤' },
  { type: 'deptpicker', label: 'Department Picker', icon: '🏢' },
  { type: 'richtext', label: 'Rich Text', icon: '📝' },
  { type: 'table', label: 'Table/Grid', icon: '⊞' },
  { type: 'calculated', label: 'Calculated Field', icon: '∑' },
  { type: 'address', label: 'Address', icon: '📍' },
  { type: 'url', label: 'URL', icon: '🔗' }
];

@Component({
  selector: 'app-form-builder',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="form-builder">
      <div class="builder-header">
        <div class="header-left">
          <input 
            type="text" 
            [(ngModel)]="formName" 
            placeholder="Untitled Form"
            class="form-name-input"
          >
        </div>
        <div class="header-actions">
          <button class="btn btn-secondary" (click)="clearForm()">Clear</button>
          <button class="btn btn-primary" (click)="saveForm()">Save Form</button>
        </div>
      </div>
      
      <div class="builder-body">
        <aside class="palette">
          <h3>Elements</h3>
          <div class="element-list">
            @for (el of elementTypes; track el.type) {
              <div 
                class="element-item" 
                draggable="true"
                (dragstart)="onDragStart($event, el.type)"
              >
                <span class="el-icon">{{ el.icon }}</span>
                <span class="el-label">{{ el.label }}</span>
              </div>
            }
          </div>
        </aside>
        
        <main 
          class="canvas"
          (dragover)="onDragOver($event)"
          (drop)="onDrop($event)"
        >
          @if (elements().length === 0) {
            <div class="empty-canvas">
              <p>Drag elements here to build your form</p>
            </div>
          } @else {
            <div class="form-elements">
              @for (el of elements(); track el.id; let i = $index) {
                <div 
                  class="form-element" 
                  [class.selected]="selectedElementId() === el.id"
                  (click)="selectElement(el.id)"
                >
                  <div class="element-header">
                    <span class="element-label">{{ el.label }}</span>
                    <span class="element-type">{{ el.type }}</span>
                    @if (el.required) {
                      <span class="required-badge">Required</span>
                    }
                  </div>
                  <div class="element-preview">
                    @switch (el.type) {
                      @case ('text') {
                        <input type="text" disabled placeholder="Text input">
                      }
                      @case ('textarea') {
                        <textarea disabled placeholder="Multi-line text"></textarea>
                      }
                      @case ('number') {
                        <input type="number" disabled placeholder="Number">
                      }
                      @case ('email') {
                        <input type="email" disabled placeholder="email@example.com">
                      }
                      @case ('phone') {
                        <input type="tel" disabled placeholder="(555) 555-5555">
                      }
                      @case ('date') {
                        <input type="date" disabled>
                      }
                      @case ('dropdown') {
                        <select disabled><option>Select option...</option></select>
                      }
                      @case ('radio') {
                        <div class="radio-preview">○ Option 1 • Option 2</div>
                      }
                      @case ('checkbox') {
                        <div class="checkbox-preview">☐ Option 1 ☐ Option 2</div>
                      }
                      @case ('yesno') {
                        <div class="toggle-preview">○ Yes  ○ No</div>
                      }
                      @default {
                        <div class="default-preview">{{ el.type }}</div>
                      }
                    }
                  </div>
                  <button class="delete-btn" (click)="deleteElement(el.id, $event)">×</button>
                </div>
              }
            </div>
          }
        </main>
        
        <aside class="properties">
          <h3>Properties</h3>
          @if (selectedElement()) {
            <div class="property-form">
              <div class="form-group">
                <label>Label</label>
                <input 
                  type="text" 
                  [(ngModel)]="selectedElement()!.label"
                  (ngModelChange)="updateElement()"
                >
              </div>
              <div class="form-group">
                <label>Type</label>
                <input type="text" [value]="selectedElement()!.type" disabled>
              </div>
              <div class="form-group checkbox-group">
                <label>
                  <input 
                    type="checkbox" 
                    [(ngModel)]="selectedElement()!.required"
                    (ngModelChange)="updateElement()"
                  >
                  Required
                </label>
              </div>
              <div class="form-group">
                <label>Placeholder</label>
                <input 
                  type="text" 
                  [(ngModel)]="selectedElement()!.placeholder"
                  (ngModelChange)="updateElement()"
                >
              </div>
              @if (hasOptions()) {
                <div class="form-group">
                  <label>Options (one per line)</label>
                  <textarea 
                    [(ngModel)]="optionsText"
                    (ngModelChange)="updateOptions()"
                    rows="5"
                  ></textarea>
                </div>
              }
            </div>
          } @else {
            <p class="no-selection">Select an element to edit properties</p>
          }
        </aside>
      </div>
    </div>
  `,
  styles: [`
    .form-builder {
      display: flex;
      flex-direction: column;
      height: calc(100vh - 4rem);
    }
    .builder-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-bottom: 1rem;
      border-bottom: 1px solid var(--color-border);
      margin-bottom: 1rem;
    }
    .form-name-input {
      font-size: 1.25rem;
      font-weight: 600;
      border: none;
      background: transparent;
      width: 300px;
    }
    .form-name-input:focus {
      outline: none;
      border-bottom: 2px solid var(--color-primary);
    }
    .header-actions {
      display: flex;
      gap: 0.5rem;
    }
    .builder-body {
      display: flex;
      flex: 1;
      gap: 1rem;
      overflow: hidden;
    }
    .palette {
      width: 220px;
      background: var(--color-surface);
      border-radius: var(--radius-lg);
      padding: 1rem;
      overflow-y: auto;
    }
    .palette h3, .properties h3 {
      font-size: 0.875rem;
      font-weight: 600;
      color: var(--color-text-muted);
      text-transform: uppercase;
      margin-bottom: 1rem;
    }
    .element-list {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }
    .element-item {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.5rem 0.75rem;
      border-radius: var(--radius-md);
      cursor: grab;
      transition: background var(--transition-fast);
    }
    .element-item:hover {
      background: var(--color-background);
    }
    .el-icon {
      width: 24px;
      height: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--color-background);
      border-radius: var(--radius-sm);
      font-size: 0.75rem;
    }
    .el-label {
      font-size: 0.875rem;
    }
    .canvas {
      flex: 1;
      background: var(--color-surface);
      border-radius: var(--radius-lg);
      padding: 1.5rem;
      overflow-y: auto;
    }
    .empty-canvas {
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      border: 2px dashed var(--color-border);
      border-radius: var(--radius-lg);
      color: var(--color-text-muted);
    }
    .form-elements {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }
    .form-element {
      position: relative;
      padding: 1rem;
      border: 2px solid var(--color-border);
      border-radius: var(--radius-md);
      cursor: pointer;
      transition: all var(--transition-fast);
    }
    .form-element:hover {
      border-color: var(--color-secondary);
    }
    .form-element.selected {
      border-color: var(--color-primary);
    }
    .element-header {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin-bottom: 0.75rem;
    }
    .element-label {
      font-weight: 500;
    }
    .element-type {
      font-size: 0.75rem;
      color: var(--color-text-muted);
      background: var(--color-background);
      padding: 0.125rem 0.5rem;
      border-radius: var(--radius-sm);
    }
    .required-badge {
      font-size: 0.625rem;
      background: var(--color-danger);
      color: white;
      padding: 0.125rem 0.375rem;
      border-radius: var(--radius-sm);
    }
    .element-preview input,
    .element-preview textarea,
    .element-preview select {
      pointer-events: none;
      opacity: 0.7;
    }
    .radio-preview, .checkbox-preview, .toggle-preview {
      color: var(--color-text-muted);
      font-size: 0.875rem;
    }
    .delete-btn {
      position: absolute;
      top: 0.5rem;
      right: 0.5rem;
      width: 24px;
      height: 24px;
      border: none;
      background: var(--color-danger);
      color: white;
      border-radius: 50%;
      cursor: pointer;
      opacity: 0;
      transition: opacity var(--transition-fast);
    }
    .form-element:hover .delete-btn {
      opacity: 1;
    }
    .properties {
      width: 260px;
      background: var(--color-surface);
      border-radius: var(--radius-lg);
      padding: 1rem;
    }
    .property-form {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }
    .form-group label {
      display: block;
      font-size: 0.75rem;
      font-weight: 500;
      margin-bottom: 0.25rem;
    }
    .checkbox-group label {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    .checkbox-group input {
      width: auto;
    }
    .no-selection {
      color: var(--color-text-muted);
      font-size: 0.875rem;
      text-align: center;
      padding: 2rem 1rem;
    }
  `]
})
export class FormBuilderComponent {
  elementTypes = ELEMENT_TYPES;
  formName = 'Untitled Form';
  elements = signal<FormElement[]>([]);
  selectedElementId = signal<string | null>(null);
  optionsText = '';
  
  selectedElement = computed(() => {
    const id = this.selectedElementId();
    return id ? this.elements().find(e => e.id === id) || null : null;
  });
  
  hasOptions = computed(() => {
    const el = this.selectedElement();
    return el && ['dropdown', 'radio', 'checkbox', 'multiselect'].includes(el.type);
  });
  
  constructor(private formService: FormService) {}
  
  onDragStart(event: DragEvent, type: string) {
    event.dataTransfer?.setData('elementType', type);
  }
  
  onDragOver(event: DragEvent) {
    event.preventDefault();
  }
  
  onDrop(event: DragEvent) {
    event.preventDefault();
    const type = event.dataTransfer?.getData('elementType');
    if (type) {
      const label = this.elementTypes.find(e => e.type === type)?.label || type;
      const newElement: FormElement = {
        id: crypto.randomUUID(),
        type,
        label,
        required: false,
        placeholder: ''
      };
      this.elements.update(els => [...els, newElement]);
    }
  }
  
  selectElement(id: string) {
    this.selectedElementId.set(id);
    const el = this.selectedElement();
    if (el?.options) {
      this.optionsText = el.options.join('\n');
    } else {
      this.optionsText = '';
    }
  }
  
  updateElement() {
    this.elements.update(els => [...els]);
  }
  
  updateOptions() {
    const el = this.selectedElement();
    if (el) {
      el.options = this.optionsText.split('\n').filter(o => o.trim());
      this.updateElement();
    }
  }
  
  deleteElement(id: string, event: Event) {
    event.stopPropagation();
    this.elements.update(els => els.filter(e => e.id !== id));
    if (this.selectedElementId() === id) {
      this.selectedElementId.set(null);
    }
  }
  
  clearForm() {
    this.elements.set([]);
    this.selectedElementId.set(null);
    this.formName = 'Untitled Form';
  }
  
  saveForm() {
    this.formService.create({
      name: this.formName,
      elements: this.elements()
    }).subscribe({
      next: () => {
        alert('Form saved!');
      },
      error: () => {
        alert('Failed to save form.');
      }
    });
  }
}
