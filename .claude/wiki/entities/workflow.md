# Workflow Entity

## Database Model

```prisma
model Workflow {
  id          String    @id @default(cuid())
  name        String
  description String?
  nodes       Json      // WorkflowNode[]
  connections Json      // Connection[]
  isActive    Boolean   @default(true)
  createdById String
  createdBy   User      @relation(fields: [createdById], references: [id])
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  instances   WorkflowInstance[]
  escalationRules EscalationRule[]
}

model WorkflowInstance {
  id              String   @id @default(cuid())
  workflowId      String
  workflow        Workflow @relation(fields: [workflowId], references: [id])
  status          String   @default("active")
  currentNodeId   String?
  data            Json     @default("{}")
  history         Json     @default("[]")
  parentInstanceId String?
  parentNodeId    String?
  createdById     String
  createdBy       User     @relation(fields: [createdById], references: [id])
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  completedAt     DateTime?

  nodes           WorkflowInstanceNode[]
  approvalRequests ApprovalRequest[]
  comments        Comment[]
}

model WorkflowInstanceNode {
  id              String   @id @default(cuid())
  instanceId      String
  instance        WorkflowInstance @relation(fields: [instanceId], references: [id])
  nodeId          String
  nodeType        String
  status          String
  assigneeId      String?
  assignee        User?    @relation(fields: [assigneeId], references: [id])
  startedAt       DateTime?
  completedAt     DateTime?
  result          Json?
  createdAt       DateTime @default(now())
}
```

## Fields

### Workflow

| Field | Type | Description |
|-------|------|-------------|
| id | String (cuid) | Primary key |
| name | String | Workflow display name |
| description | String? | Workflow description |
| nodes | JSON | Array of WorkflowNode definitions |
| connections | JSON | Array of Connection definitions |
| isActive | Boolean | Whether workflow can be started |
| createdById | String | FK to User (designer) |
| createdAt | DateTime | Creation timestamp |
| updatedAt | DateTime | Last update timestamp |

### WorkflowInstance

| Field | Type | Description |
|-------|------|-------------|
| id | String (cuid) | Primary key |
| workflowId | String | FK to Workflow |
| status | String | active, completed, rejected, cancelled |
| currentNodeId | String? | Current node ID in execution |
| data | JSON | Workflow data/context |
| history | JSON | Array of executed nodes and results |
| parentInstanceId | String? | FK to parent WorkflowInstance (sub-workflow) |
| parentNodeId | String? | Node ID in parent that invoked this |
| createdById | String | FK to User (starter) |
| createdAt | DateTime | Start timestamp |
| updatedAt | DateTime | Last update timestamp |
| completedAt | DateTime? | Completion timestamp |

### WorkflowInstanceNode

| Field | Type | Description |
|-------|------|-------------|
| id | String (cuid) | Primary key |
| instanceId | String | FK to WorkflowInstance |
| nodeId | String | Original node ID from Workflow |
| nodeType | String | Node type |
| status | String | pending, in_progress, completed, skipped |
| assigneeId | String? | FK to User |
| startedAt | DateTime? | When node execution started |
| completedAt | DateTime? | When node completed |
| result | JSON? | Node execution result data |
| createdAt | DateTime | Creation timestamp |

## Instance Status Values

| Status | Description |
|--------|-------------|
| active | Instance is currently executing |
| completed | Instance completed successfully (reached End node) |
| rejected | Instance was rejected (approval rejection) |
| cancelled | Instance was cancelled manually |

## Related Pages

- [[Overview]] — Project overview
- [[Workflow Engine]] — Execution engine specification
- [[Workflow Execution Workflow]] — Instance lifecycle
