# Form Builder

## Overview

The Form Builder (`src/app/features/form-builder/`) enables users to create custom forms via drag-and-drop. Forms are stored as JSON definitions and rendered dynamically at runtime.

## Element Types

The form builder supports **22 element types**:

| Type | Description | Validation |
|------|-------------|------------|
| **Text** | Single-line text input | min/max length, pattern |
| **Textarea** | Multi-line text | min/max length |
| **Number** | Numeric input | min/max, step |
| **Email** | Email address | RFC 5322 format |
| **Phone** | Phone number | pattern |
| **Date** | Date picker | min/max date |
| **DateRange** | Date range picker | start/end bounds |
| **Time** | Time picker | - |
| **Dropdown** | Single select | options[] |
| **Radio** | Radio button group | options[] |
| **Checkbox** | Single checkbox | - |
| **Multiselect** | Multi-select dropdown | options[], min/max |
| **YesNo** | Boolean toggle | - |
| **File** | File upload | allowed types, max size |
| **Image** | Image upload | allowed types, max size |
| **Signature** | Signature pad capture | - |
| **UserPicker** | Select user from directory | - |
| **DeptPicker** | Select department | - |
| **RichText** | Rich text editor (WYSIWYG) | - |
| **Table** | Tabular data grid | columns[], rows |
| **Calculated** | Auto-calculated value | expression |
| **Address** | Structured address fields | - |
| **URL** | Web URL | URL format |

## Form Definition Schema

```typescript
interface FormDefinition {
  id: string;
  name: string;
  description?: string;
  elements: FormElement[];
  settings: FormSettings;
  version: number;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

interface FormElement {
  id: string;
  type: ElementType;
  label: string;
  placeholder?: string;
  required: boolean;
  validation?: ValidationRule[];
  options?: Option[];        // dropdown, radio, multiselect
  config?: ElementConfig;    // type-specific settings
  defaultValue?: any;
  conditional?: ConditionalRule;
}

interface FormSettings {
  allowSave: boolean;
  allowDraft: boolean;
  submitButtonText: string;
  showProgressBar: boolean;
}
```

## Version Control

Forms support **versioning**:
- Each save creates a new `FormVersion` entry
- Version history is retrievable via `GET /api/forms/:id/versions`
- Rollback to previous version via `POST /api/forms/:id/rollback/:version`

```typescript
interface FormVersion {
  id: string;
  formId: string;
  version: number;
  elements: FormElement[];
  createdBy: string;
  createdAt: Date;
}
```

## Submission Flow

1. User opens form via `FormFillComponent`
2. Form definition is fetched from `GET /api/forms/:id`
3. Form is rendered with all elements
4. User fills and submits via `POST /api/forms/:id/submit`
5. Server validates and creates `FormSubmission`
6. Workflow instance is created or advanced with submitted data

## Form Templates

Pre-built templates (`FormTemplate`) provide starting points for common use cases:
- IT Service Request
- Leave Approval
- Expense Report
- Equipment Request

## Related Pages

- [[Overview]] — Project overview
- [[Form Entity]] — Form database model
- [[Form Creation Workflow]] — How forms are created
