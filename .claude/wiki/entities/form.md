# Form Entity

## Database Model

```prisma
model Form {
  id          String    @id @default(cuid())
  name        String
  description String?
  elements    Json      // FormElement[]
  settings    Json?     // FormSettings
  version     Int       @default(1)
  isPublished Boolean   @default(false)
  createdById String
  createdBy   User      @relation(fields: [createdById], references: [id])
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  versions    FormVersion[]
  submissions FormSubmission[]
  usedInWorkflowNodes WorkflowNode[]
}

model FormVersion {
  id        String   @id @default(cuid())
  formId    String
  form      Form     @relation(fields: [formId], references: [id])
  version   Int
  elements  Json
  settings  Json?
  createdById String
  createdAt DateTime @default(now())

  @@unique([formId, version])
}

model FormSubmission {
  id        String   @id @default(cuid())
  formId    String
  form      Form     @relation(fields: [formId], references: [id])
  userId    String
  user      User     @relation(fields: [userId], references: [id])
  data      Json
  status    String   @default("submitted")
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

## Fields

### Form

| Field | Type | Description |
|-------|------|-------------|
| id | String (cuid) | Primary key |
| name | String | Form display name |
| description | String? | Form description |
| elements | JSON | Array of FormElement definitions |
| settings | JSON? | FormSettings (submit button text, etc.) |
| version | Int | Current version number |
| isPublished | Boolean | Whether form is available for use |
| createdById | String | FK to User |
| createdAt | DateTime | Creation timestamp |
| updatedAt | DateTime | Last update timestamp |

### FormVersion

| Field | Type | Description |
|-------|------|-------------|
| id | String (cuid) | Primary key |
| formId | String | FK to Form |
| version | Int | Version number |
| elements | JSON | Snapshot of elements at this version |
| settings | JSON? | Snapshot of settings |
| createdById | String | User who created this version |
| createdAt | DateTime | When version was created |

### FormSubmission

| Field | Type | Description |
|-------|------|-------------|
| id | String (cuid) | Primary key |
| formId | String | FK to Form |
| userId | String | FK to User (submitter) |
| data | JSON | Submitted form field values |
| status | String | Submission status |
| createdAt | DateTime | Submission timestamp |
| updatedAt | DateTime | Last update timestamp |

## Elements Schema

```typescript
interface FormElement {
  id: string;
  type: ElementType;
  label: string;
  placeholder?: string;
  required: boolean;
  validation?: ValidationRule[];
  options?: { label: string; value: string }[];
  config?: Record<string, any>;
  defaultValue?: any;
  conditional?: {
    action: 'show' | 'hide' | 'require';
    fieldId: string;
    operator: 'equals' | 'not_equals' | 'contains';
    value: any;
  };
}
```

## Version Control Flow

1. Form is created → version = 1
2. On edit → new FormVersion created, version incremented
3. Rollback → restores elements/settings from specified FormVersion

## Related Pages

- [[Overview]] — Project overview
- [[Form Builder]] — Form builder component
- [[Form Creation Workflow]] — How forms are created and versioned
