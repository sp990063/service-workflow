import { Component, signal, computed, ChangeDetectorRef, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { FormService } from '../../core/services/form.service';
import { Form, FormElement, FormSection } from '../../core/models';
import { FormVersionsComponent } from './form-versions.component';

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
  imports: [CommonModule, FormsModule, FormVersionsComponent],
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
          @if (formId()) {
            <button class="btn btn-secondary" (click)="showVersions.set(true)">Versions</button>
          }
          <button class="btn btn-secondary" (click)="clearForm()">Clear</button>
          <button class="btn btn-primary" (click)="saveForm()">Save Form</button>
        </div>
      </div>
      
      <div class="builder-body">
        <aside class="palette" tabindex="0" role="region" aria-label="Form elements palette">
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
          <div class="canvas-toolbar">
            <button class="btn btn-secondary" (click)="addSection()">+ Add Section</button>
          </div>
          
          @if (sections().length === 0 && elements().length === 0) {
            <div class="empty-canvas">
              <p>Drag elements here to build your form</p>
              <p class="hint">Or click "+ Add Section" to organize elements into groups</p>
            </div>
          }
          
          <!-- Render sections -->
          @for (section of sections(); track section.id) {
            <div class="form-section" [class.selected]="selectedSectionId() === section.id" (click)="selectSection(section.id)">
              <div class="section-header">
                <h3>{{ section.title }}</h3>
                @if (section.description) {
                  <p>{{ section.description }}</p>
                }
              </div>
              <div class="section-body" [class]="'cols-' + section.columns">
                @for (el of getElementsForSection(section.id); track el.id) {
                  <div 
                    class="form-element" 
                    [class.selected]="selectedElementId() === el.id"
                    (click)="selectElement(el.id); $event.stopPropagation()"
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
                        @case ('daterange') {
                          <div class="daterange-preview">
                            <input type="date" disabled> - <input type="date" disabled>
                          </div>
                        }
                        @case ('time') {
                          <input type="time" disabled>
                        }
                        @case ('file') {
                          <div class="file-preview">📎 Choose file...</div>
                        }
                        @case ('image') {
                          <div class="file-preview">🖼 Choose image...</div>
                        }
                        @case ('signature') {
                          <div class="signature-preview">✍ Sign here</div>
                        }
                        @case ('yesno') {
                          <div class="toggle-preview">○ Yes  ○ No</div>
                        }
                        @case ('multiselect') {
                          <div class="multiselect-preview">☐ Option 1 ☐ Option 2 ☐ Option 3</div>
                        }
                        @case ('richtext') {
                          <div class="richtext-preview">Rich text editor...</div>
                        }
                        @case ('userpicker') {
                          <div class="userpicker-preview">👤 Select user...</div>
                        }
                        @case ('deptpicker') {
                          <div class="deptpicker-preview">🏢 Select department...</div>
                        }
                        @case ('table') {
                          <div class="table-preview">⊞ Table/Grid</div>
                        }
                        @case ('calculated') {
                          <div class="calculated-preview">∑ Calculated value</div>
                        }
                        @case ('address') {
                          <div class="address-preview">📍 Address fields</div>
                        }
                        @case ('url') {
                          <input type="url" disabled placeholder="https://example.com">
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
                        @default {
                          <div class="default-preview">{{ el.type }}</div>
                        }
                      }
                    </div>
                    <button class="delete-btn" (click)="deleteElement(el.id, $event)">×</button>
                  </div>
                }
              </div>
            </div>
          }
          
          <!-- Elements without a section (backward compatibility) -->
          @if (getElementsForSection(null).length > 0) {
            <div class="form-section default-section">
              <div class="section-body cols-1">
                @for (el of getElementsForSection(null); track el.id) {
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
                        @default {
                          <div class="default-preview">{{ el.type }}</div>
                        }
                      }
                    </div>
                    <button class="delete-btn" (click)="deleteElement(el.id, $event)">×</button>
                  </div>
                }
              </div>
            </div>
          }
        </main>
        
        <aside class="properties">
          <h3>Properties</h3>
          @if (selectedSection()) {
            <div class="property-form section-properties">
              <div class="form-group">
                <label>Section Title</label>
                <input 
                  type="text" 
                  [ngModel]="selectedSection()!.title"
                  (ngModelChange)="updateSection(selectedSectionId()!, {title: $event})"
                >
              </div>
              <div class="form-group">
                <label>Description</label>
                <input 
                  type="text" 
                  [ngModel]="selectedSection()!.description"
                  (ngModelChange)="updateSection(selectedSectionId()!, {description: $event})"
                  placeholder="Optional description"
                >
              </div>
              <div class="form-group">
                <label>Columns</label>
                <select 
                  [ngModel]="selectedSection()!.columns"
                  (ngModelChange)="updateSectionColumns($event)"
                >
                  <option [value]="1">1 Column</option>
                  <option [value]="2">2 Columns</option>
                  <option [value]="3">3 Columns</option>
                  <option [value]="4">4 Columns</option>
                </select>
              </div>
              <div class="form-group">
                <button class="btn btn-danger" (click)="deleteSection(selectedSectionId()!)">Delete Section</button>
              </div>
            </div>
          } @else if (selectedElement()) {
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
              <div class="form-group">
                <label>Help Text</label>
                <input 
                  type="text" 
                  [(ngModel)]="selectedElement()!.helpText"
                  (ngModelChange)="updateElement()"
                  placeholder="Additional instructions"
                >
              </div>
              <div class="form-group">
                <label>Default Value</label>
                <input 
                  type="text" 
                  [(ngModel)]="selectedElement()!.defaultValue"
                  (ngModelChange)="updateElement()"
                  placeholder="Default value (optional)"
                >
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
              
              <!-- Text/Textarea specific -->
              @if (selectedElement()!.type === 'text' || selectedElement()!.type === 'textarea') {
                <div class="form-group">
                  <label>Min Length</label>
                  <input 
                    type="number" 
                    [(ngModel)]="selectedElement()!.minLength"
                    (ngModelChange)="updateElement()"
                    min="0"
                  >
                </div>
                <div class="form-group">
                  <label>Max Length</label>
                  <input 
                    type="number" 
                    [(ngModel)]="selectedElement()!.maxLength"
                    (ngModelChange)="updateElement()"
                    min="0"
                  >
                </div>
              }
              
              <!-- Textarea specific -->
              @if (selectedElement()!.type === 'textarea') {
                <div class="form-group">
                  <label>Rows</label>
                  <input 
                    type="number" 
                    [(ngModel)]="selectedElement()!.rows"
                    (ngModelChange)="updateElement()"
                    min="2"
                    max="20"
                  >
                </div>
              }
              
              <!-- Number specific -->
              @if (selectedElement()!.type === 'number') {
                <div class="form-group">
                  <label>Min Value</label>
                  <input 
                    type="number" 
                    [(ngModel)]="selectedElement()!.min"
                    (ngModelChange)="updateElement()"
                  >
                </div>
                <div class="form-group">
                  <label>Max Value</label>
                  <input 
                    type="number" 
                    [(ngModel)]="selectedElement()!.max"
                    (ngModelChange)="updateElement()"
                  >
                </div>
                <div class="form-group">
                  <label>Step</label>
                  <input 
                    type="number" 
                    [(ngModel)]="selectedElement()!.step"
                    (ngModelChange)="updateElement()"
                    min="0.01"
                  >
                </div>
              }
              
              <!-- Date specific -->
              @if (selectedElement()!.type === 'date') {
                <div class="form-group">
                  <label>Min Date</label>
                  <input 
                    type="date" 
                    [(ngModel)]="selectedElement()!.minDate"
                    (ngModelChange)="updateElement()"
                  >
                </div>
                <div class="form-group">
                  <label>Max Date</label>
                  <input 
                    type="date" 
                    [(ngModel)]="selectedElement()!.maxDate"
                    (ngModelChange)="updateElement()"
                  >
                </div>
              }
              
              <!-- Date Range specific -->
              @if (selectedElement()!.type === 'daterange') {
                <div class="form-group">
                  <label>Min Days From Today</label>
                  <input 
                    type="number" 
                    [(ngModel)]="selectedElement()!.min"
                    (ngModelChange)="updateElement()"
                    min="0"
                  >
                </div>
                <div class="form-group">
                  <label>Max Days From Today</label>
                  <input 
                    type="number" 
                    [(ngModel)]="selectedElement()!.max"
                    (ngModelChange)="updateElement()"
                    min="0"
                  >
                </div>
              }
              
              <!-- Time specific -->
              @if (selectedElement()!.type === 'time') {
                <div class="form-group">
                  <label>Min Time</label>
                  <input 
                    type="time" 
                    [(ngModel)]="selectedElement()!.minTime"
                    (ngModelChange)="updateElement()"
                  >
                </div>
                <div class="form-group">
                  <label>Max Time</label>
                  <input 
                    type="time" 
                    [(ngModel)]="selectedElement()!.maxTime"
                    (ngModelChange)="updateElement()"
                  >
                </div>
              }
              
              <!-- File/Image specific -->
              @if (selectedElement()!.type === 'file' || selectedElement()!.type === 'image') {
                <div class="form-group">
                  <label>Allowed Types</label>
                  <input 
                    type="text" 
                    [value]="selectedElement()!.allowedTypes?.join(', ')"
                    (input)="updateAllowedTypes($event)"
                    placeholder=".pdf, .doc, .docx"
                  >
                  <small>e.g., .pdf, .doc, .docx</small>
                </div>
                <div class="form-group">
                  <label>Max Size (KB)</label>
                  <input 
                    type="number" 
                    [(ngModel)]="selectedElement()!.maxSize"
                    (ngModelChange)="updateElement()"
                    min="0"
                  >
                </div>
                <div class="form-group">
                  <label>Max Files</label>
                  <input 
                    type="number" 
                    [(ngModel)]="selectedElement()!.maxFiles"
                    (ngModelChange)="updateElement()"
                    min="1"
                  >
                </div>
              }
              
              <!-- Dropdown/Multi-Select specific -->
              @if (selectedElement()!.type === 'dropdown' || selectedElement()!.type === 'multiselect') {
                <div class="form-group checkbox-group">
                  <label>
                    <input 
                      type="checkbox" 
                      [(ngModel)]="selectedElement()!.allowMultiple"
                      (ngModelChange)="updateElement()"
                    >
                    Allow Multiple Selection
                  </label>
                </div>
                <div class="form-group checkbox-group">
                  <label>
                    <input 
                      type="checkbox" 
                      [(ngModel)]="selectedElement()!.allowOther"
                      (ngModelChange)="updateElement()"
                    >
                    Allow "Other" Option
                  </label>
                </div>
              }
              
              <!-- Checkbox specific -->
              @if (selectedElement()!.type === 'checkbox') {
                <div class="form-group">
                  <label>Min Selections</label>
                  <input 
                    type="number" 
                    [(ngModel)]="selectedElement()!.minSelect"
                    (ngModelChange)="updateElement()"
                    min="0"
                  >
                </div>
                <div class="form-group">
                  <label>Max Selections</label>
                  <input 
                    type="number" 
                    [(ngModel)]="selectedElement()!.maxSelect"
                    (ngModelChange)="updateElement()"
                    min="0"
                  >
                </div>
              }
              
              <!-- User Picker specific -->
              @if (selectedElement()!.type === 'userpicker') {
                <div class="form-group">
                  <label>Filter by Role</label>
                  <select 
                    [(ngModel)]="selectedElement()!.filterRole"
                    (ngModelChange)="updateElement()"
                  >
                    <option value="">All Users</option>
                    <option value="admin">Admin</option>
                    <option value="manager">Manager</option>
                    <option value="user">User</option>
                  </select>
                </div>
              }
              
              <!-- Department Picker specific -->
              @if (selectedElement()!.type === 'deptpicker') {
                <div class="form-group checkbox-group">
                  <label>
                    <input 
                      type="checkbox" 
                      [(ngModel)]="selectedElement()!.includeSubDepts"
                      (ngModelChange)="updateElement()"
                    >
                    Include Sub-Departments
                  </label>
                </div>
              }
              
              <!-- Calculated Field specific -->
              @if (selectedElement()!.type === 'calculated') {
                <div class="form-group">
                  <label>Expression</label>
                  <textarea 
                    [(ngModel)]="selectedElement()!.expression"
                    (ngModelChange)="updateElement()"
                    rows="3"
                    placeholder="e.g., field1 + field2 * 0.1"
                  ></textarea>
                  <small>Use field IDs in expression</small>
                </div>
              }
              
              <!-- Address specific -->
              @if (selectedElement()!.type === 'address') {
                <div class="form-group">
                  <label>Address Fields</label>
                  <select 
                    multiple
                    [(ngModel)]="selectedElement()!.addressFields"
                    (ngModelChange)="updateElement()"
                    size="5"
                    class="multi-select"
                  >
                    <option value="street">Street Address</option>
                    <option value="street2">Street Address 2</option>
                    <option value="city">City</option>
                    <option value="state">State/Province</option>
                    <option value="postal">Postal Code</option>
                    <option value="country">Country</option>
                  </select>
                  <small>Hold Ctrl/Cmd to select multiple</small>
                </div>
              }
              
              <!-- URL specific -->
              @if (selectedElement()!.type === 'url') {
                <div class="form-group">
                  <label>Allowed Protocols</label>
                  <select 
                    multiple
                    [(ngModel)]="selectedElement()!.allowedProtocols"
                    (ngModelChange)="updateElement()"
                    size="3"
                    class="multi-select"
                  >
                    <option value="http">http://</option>
                    <option value="https">https://</option>
                    <option value="ftp">ftp://</option>
                  </select>
                  <small>Hold Ctrl/Cmd to select multiple</small>
                </div>
              }
              
              <!-- Rich Text specific -->
              @if (selectedElement()!.type === 'richtext') {
                <div class="form-group">
                  <label>Toolbar Options</label>
                  <select 
                    multiple
                    [(ngModel)]="selectedElement()!.toolbarOptions"
                    (ngModelChange)="updateElement()"
                    size="5"
                    class="multi-select"
                  >
                    <option value="bold">Bold</option>
                    <option value="italic">Italic</option>
                    <option value="underline">Underline</option>
                    <option value="strike">Strikethrough</option>
                    <option value="list">Bullet List</option>
                    <option value="numbered">Numbered List</option>
                    <option value="link">Insert Link</option>
                    <option value="image">Insert Image</option>
                  </select>
                  <small>Hold Ctrl/Cmd to select multiple</small>
                </div>
              }
              
              <!-- Options for select types -->
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
              
              <!-- Custom validation error -->
              <div class="form-group">
                <label>Custom Validation Message</label>
                <input 
                  type="text" 
                  [(ngModel)]="selectedElement()!.validation!.customError"
                  (ngModelChange)="updateElement()"
                  placeholder="Error message when validation fails"
                >
              </div>
              
            </div>
          } @else {
            <p class="no-selection">Select an element to edit properties</p>
          }
        </aside>
      </div>
    </div>
    
    @if (showVersions() && formId()) {
      <app-form-versions
        [formId]="formId()!"
        [currentVersion]="currentVersion()"
        (close)="showVersions.set(false)"
        (restored)="onFormRestored()"
      />
    }
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
    .canvas-toolbar {
      margin-bottom: 1rem;
      padding-bottom: 1rem;
      border-bottom: 1px solid var(--color-border);
    }
    .empty-canvas {
      height: 100%;
      min-height: 200px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      border: 2px dashed var(--color-border);
      border-radius: var(--radius-lg);
      color: var(--color-text-muted);
    }
    .empty-canvas .hint {
      font-size: 0.875rem;
      margin-top: 0.5rem;
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
    .radio-preview, .checkbox-preview, .toggle-preview, .daterange-preview, 
    .file-preview, .signature-preview, .userpicker-preview, .deptpicker-preview, 
    .table-preview, .calculated-preview, .address-preview, .multiselect-preview, .richtext-preview {
      color: var(--color-text-muted);
      font-size: 0.875rem;
      padding: 0.5rem;
      background: var(--color-background);
      border-radius: var(--radius-sm);
      display: inline-block;
    }
    
    /* Section styles */
    .form-section {
      margin-bottom: 1.5rem;
      padding: 1rem;
      border: 2px solid transparent;
      border-radius: var(--radius-md);
      transition: all var(--transition-fast);
    }
    .form-section:hover {
      border-color: var(--color-border);
    }
    .form-section.selected {
      border-color: var(--color-primary);
      background: rgba(67, 97, 238, 0.05);
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
    .multi-select {
      width: 100%;
      padding: 0.5rem;
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      background: var(--color-background);
      font-size: 0.875rem;
    }
    .form-group small {
      display: block;
      margin-top: 0.25rem;
      font-size: 0.7rem;
      color: var(--color-text-muted);
    }
    .no-selection {
      color: var(--color-text-muted);
      font-size: 0.875rem;
      text-align: center;
      padding: 2rem 1rem;
    }
  `]
})
export class FormBuilderComponent implements OnInit {
  elementTypes = ELEMENT_TYPES;
  formName = 'Untitled Form';
  elements = signal<FormElement[]>([]);
  sections = signal<FormSection[]>([]);
  selectedElementId = signal<string | null>(null);
  selectedSectionId = signal<string | null>(null);
  formId = signal<string | null>(null);
  currentVersion = signal<number>(1);
  showVersions = signal<boolean>(false);
  
  selectedSection = computed(() => {
    const id = this.selectedSectionId();
    return id ? this.sections().find(s => s.id === id) || null : null;
  });
  
  // Get elements for a specific section
  getElementsForSection(sectionId: string | null): FormElement[] {
    if (!sectionId) {
      // Elements without a section
      return this.elements().filter(e => !e.sectionId);
    }
    return this.elements().filter(e => e.sectionId === sectionId);
  }
  
  // Generate unique ID
  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }
  
  ngOnInit() {
    // Check if editing existing form via query param
    const params = new URLSearchParams(window.location.search);
    const formIdParam = params.get('id');
    if (formIdParam) {
      this.loadForm(formIdParam);
    }
  }
  
  loadForm(id: string) {
    this.formService.getById(id).subscribe({
      next: (form) => {
        this.formId.set(form.id);
        this.formName = form.name;
        this.elements.set(form.elements || []);
        this.sections.set(form.sections || []);
        this.currentVersion.set(form.version || 1);
      },
      error: () => {
        // Form not found, stay on blank form
      }
    });
  }
  optionsText = '';
  
  selectedElement = computed(() => {
    const id = this.selectedElementId();
    return id ? this.elements().find(e => e.id === id) || null : null;
  });
  
  hasOptions = computed(() => {
    const el = this.selectedElement();
    return el && ['dropdown', 'radio', 'checkbox', 'multiselect'].includes(el.type);
  });
  
  constructor(private formService: FormService, private cdr: ChangeDetectorRef) {}
  
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
        placeholder: '',
        validation: {}
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
  
  updateAllowedTypes(event: Event) {
    const el = this.selectedElement();
    if (el) {
      const value = (event.target as HTMLInputElement).value;
      el.allowedTypes = value.split(',').map(s => s.trim()).filter(s => s);
      this.updateElement();
    }
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
    const data = { name: this.formName, elements: this.elements(), sections: this.sections() };
    
    if (this.formId()) {
      // Update existing form
      this.formService.update(this.formId()!, data).subscribe({
        next: (form) => {
          this.currentVersion.set(form.version ?? 1);
          alert('Form updated!');
        },
        error: () => alert('Failed to update form.')
      });
    } else {
      // Create new form
      this.formService.create(data).subscribe({
        next: (form) => {
          this.formId.set(form.id);
          this.currentVersion.set(form.version ?? 1);
          this.cdr.detectChanges(); // Force Angular to re-render
          alert('Form created!');
        },
        error: () => alert('Failed to create form.')
      });
    }
  }
  
  onFormRestored() {
    // Reload the form after rollback
    if (this.formId()) {
      this.formService.getById(this.formId()!).subscribe({
        next: (form) => {
          this.formName = form.name;
          this.elements.set(form.elements || []);
          this.sections.set(form.sections || []);
          this.currentVersion.set(form.version ?? 1);
          this.cdr.detectChanges(); // Force Angular to re-render
        }
      });
    }
  }
  
  // Section methods
  addSection() {
    const newSection: FormSection = {
      id: this.generateId(),
      title: 'New Section',
      description: '',
      columns: 1,
      order: this.sections().length
    };
    this.sections.update(sections => [...sections, newSection]);
    this.selectedSectionId.set(newSection.id);
    this.selectedElementId.set(null);
  }
  
  selectSection(sectionId: string) {
    this.selectedSectionId.set(sectionId);
    this.selectedElementId.set(null);
  }
  
  updateSectionColumns(columns: string) {
    const sectionId = this.selectedSectionId();
    if (sectionId) {
      this.updateSection(sectionId, { columns: parseInt(columns) as 1|2|3|4 });
    }
  }
  
  updateSection(sectionId: string, updates: Partial<FormSection>) {
    this.sections.update(sections => 
      sections.map(s => s.id === sectionId ? { ...s, ...updates } : s)
    );
  }
  
  deleteSection(sectionId: string) {
    if (!confirm('Delete this section and all its elements?')) return;
    
    // Remove elements in this section
    this.elements.update(els => els.filter(e => e.sectionId !== sectionId));
    
    // Remove the section
    this.sections.update(sections => sections.filter(s => s.id !== sectionId));
    
    if (this.selectedSectionId() === sectionId) {
      this.selectedSectionId.set(null);
    }
  }
}
