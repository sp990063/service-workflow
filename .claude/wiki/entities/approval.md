# Approval Entity

## Database Model

```prisma
model ApprovalRequest {
  id              String    @id @default(cuid())
  workflowInstanceId String
  workflowInstance WorkflowInstance @relation(fields: [workflowInstanceId], references: [id])
  nodeId          String
  type            String    @default("sequential")
  status          String    @default("pending")
  approvers       Json      @default("[]")
  currentApproverIndex Int  @default(0)
  decision        Json?
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  completedAt     DateTime?
}

model Delegation {
  id          String    @id @default(cuid())
  delegatorId String
  delegateId   String
  formId      String?
  workflowId  String?
  startDate   DateTime
  endDate     DateTime
  reason      String?
  isActive    Boolean   @default(true)
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  delegator   User      @relation("Delegator", fields: [delegatorId], references: [id])
  delegate    User      @relation("Delegate", fields: [delegateId], references: [id])
}

model EscalationRule {
  id              String    @id @default(cuid())
  workflowNodeId  String
  timeoutMinutes  Int
  action          String
  targetUserId    String?
  targetRoleId    String?
  notifyUserIds   Json?
  workflowId      String?
  workflow        Workflow? @relation(fields: [workflowId], references: [id])
  createdById     String?
  createdBy       User?     @relation(fields: [createdById], references: [id])
  isActive        Boolean   @default(true)
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
}

model EscalationLog {
  id                String    @id @default(cuid())
  approvalRequestId String
  escalationRuleId  String
  action            String
  previousApproverId String?
  newApproverId     String?
  notes             String?
  triggeredAt       DateTime  @default(now())
}
```

## ApprovalRequest Fields

| Field | Type | Description |
|-------|------|-------------|
| id | String (cuid) | Primary key |
| workflowInstanceId | String | FK to WorkflowInstance |
| nodeId | String | Which node created this approval |
| type | String | "sequential" or "parallel" |
| status | String | "pending", "approved", "rejected" |
| approvers | JSON | Array of approver user IDs |
| currentApproverIndex | Int | Current position in sequential flow |
| decision | JSON? | Decision details (who approved/rejected, when) |
| createdAt | DateTime | Creation timestamp |
| updatedAt | DateTime | Last update timestamp |
| completedAt | DateTime? | Completion timestamp |

## Delegation Fields

| Field | Type | Description |
|-------|------|-------------|
| id | String (cuid) | Primary key |
| delegatorId | String | FK to User (original approver) |
| delegateId | String | FK to User (proxy approver) |
| formId | String? | Optional: limit to specific form |
| workflowId | String? | Optional: limit to specific workflow |
| startDate | DateTime | When delegation becomes active |
| endDate | DateTime | When delegation expires |
| reason | String? | Reason for delegation |
| isActive | Boolean | Whether currently active |
| createdAt | DateTime | Creation timestamp |
| updatedAt | DateTime | Last update timestamp |

## EscalationRule Fields

| Field | Type | Description |
|-------|------|-------------|
| id | String (cuid) | Primary key |
| workflowNodeId | String | Node this rule applies to |
| timeoutMinutes | Int | Minutes before escalation triggers |
| action | String | "reassign", "notify", "auto_approve", "auto_reject" |
| targetUserId | String? | User to reassign to (if action=reassign) |
| targetRoleId | String? | Role to reassign to (if action=reassign) |
| notifyUserIds | JSON? | Users to notify (if action=notify) |
| workflowId | String? | Optional: limit to specific workflow |
| isActive | Boolean | Whether rule is enabled |
| createdAt | DateTime | Creation timestamp |
| updatedAt | DateTime | Last update timestamp |

## EscalationLog Fields

| Field | Type | Description |
|-------|------|-------------|
| id | String (cuid) | Primary key |
| approvalRequestId | String | FK to ApprovalRequest |
| escalationRuleId | String | FK to EscalationRule that triggered |
| action | String | Action taken |
| previousApproverId | String? | Previous approver before escalation |
| newApproverId | String? | New approver after escalation |
| notes | String? | Additional notes |
| triggeredAt | DateTime | When escalation triggered |

## Related Pages

- [[Overview]] — Project overview
- [[Approval System]] — Approval system specification
- [[Workflow Engine]] — How approval nodes execute
