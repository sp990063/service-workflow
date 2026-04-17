# User Entity

## Database Model

```prisma
model User {
  id            String    @id @default(cuid())
  email         String    @unique
  password      String?
  name          String
  role          Role      @default(USER)
  department    String?
  ldapDn        String?   @unique
  managerId     String?
  manager       User?     @relation("ManagerReports", fields: [managerId], references: [id])
  reports       User[]    @relation("ManagerReports")
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  lastLoginAt   DateTime?

  // Relations
  createdForms           Form[]
  createdWorkflows       Workflow[]
  formSubmissions       FormSubmission[]
  workflowInstances     WorkflowInstance[]
  approvalRequests      ApprovalRequest[]
  delegations           Delegation[]
  notifications         Notification[]
  comments              Comment[]
  members               Member[]
  assignedTasks         WorkflowInstanceNode[]
  escalationRules      EscalationRule[]
}
```

## Role Enum

```typescript
enum Role {
  ADMIN
  MANAGER
  USER
}
```

## Fields

| Field | Type | Description |
|-------|------|-------------|
| id | String (cuid) | Primary key |
| email | String | Unique email address |
| password | String? | Hashed password (null for LDAP users) |
| name | String | Display name |
| role | Role | User role (ADMIN, MANAGER, USER) |
| department | String? | Department name |
| ldapDn | String? | LDAP Distinguished Name (for LDAP-synced users) |
| managerId | String? | FK to User (org hierarchy) |
| createdAt | DateTime | Creation timestamp |
| updatedAt | DateTime | Last update timestamp |
| lastLoginAt | DateTime? | Last login timestamp |

## Relationships

- **Manager → Reports:** Self-referential one-to-many (org hierarchy)
- **Form:** Forms created by user
- **Workflow:** Workflows created by user
- **FormSubmission:** Submissions created by user
- **WorkflowInstance:** Instances started by user
- **ApprovalRequest:** Approvals assigned to user
- **Delegation:** Delegations where user is delegator or delegate
- **Notification:** Notifications for user
- **Member:** RBAC memberships

## LDAP Integration

Users sourced from LDAP have:
- `ldapDn` set (unique identifier in LDAP)
- `password` null (auth handled by LDAP)
- Auto-synced via Admin → LDAP Sync

## Related Pages

- [[Overview]] — Project overview
- [[RBAC System]] — Role-based access control
- [[Approval System]] — How users approve
