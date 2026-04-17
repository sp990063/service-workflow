# Approval System

## Overview

The Approval System handles human approval decisions within workflows. It supports multi-step approvals, delegation, and automatic escalation on timeout.

## Approval Model

```typescript
interface ApprovalRequest {
  id: string;
  workflowInstanceId: string;
  nodeId: string;                    // Which node created this request
  type: 'sequential' | 'parallel';
  status: 'pending' | 'approved' | 'rejected';
  requestedApprovers: string[];       // User IDs
  actualApprovers: string[];          // User IDs who actually approved
  delegatedFrom: string[];            // Original approvers if delegated
  createdAt: Date;
  completedAt?: Date;
  deadline?: Date;
}
```

## Approval Types

### Sequential Approval
- Approvers are contacted one at a time in defined order
- Each approver must approve before the next is contacted
- First rejection rejects the entire request

### Parallel Approval
- All approvers are contacted simultaneously
- **AND mode:** All must approve (unanimous)
- **OR mode:** First approval wins

## Delegation

Users can delegate their approval authority to another user for a defined time period.

```typescript
interface Delegation {
  id: string;
  delegatorId: string;      // Original approver
  delegateId: string;       // Who receives authority
  startDate: Date;
  endDate: Date;
  reason?: string;
  isActive: boolean;
}
```

### Delegation Rules
- Delegation is time-bound (startDate to endDate)
- Only one active delegation per user at a time
- Delegated approvals appear identical to direct approvals
- Original approver can view delegated actions

### Delegation Flow
1. Approver A delegates to Approver B
2. Approval request arrives for Approver A
3. System checks for active delegation
4. Request is routed to Approver B (marked as "delegated from A")
5. Approver B's decision is recorded as if from Approver A

## Escalation

Escalation rules automatically reassign or notify when approvals timeout.

```typescript
interface EscalationRule {
  id: string;
  workflowNodeId: string;
  timeoutMinutes: number;
  action: 'reassign' | 'notify' | 'auto_approve' | 'auto_reject';
  targetUserId?: string;
  targetRoleId?: string;
  notifyUserIds?: string[];
}
```

### Escalation Actions

| Action | Behavior |
|--------|----------|
| **reassign** | Reassigns to specified user or role |
| **notify** | Sends reminder notification to current approvers |
| **auto_approve** | Automatically approves the request |
| **auto_reject** | Automatically rejects the request |

### Escalation Log

All escalation events are logged:

```typescript
interface EscalationLog {
  id: string;
  approvalRequestId: string;
  escalationRuleId: string;
  action: string;
  previousApproverId?: string;
  newApproverId?: string;
  triggeredAt: Date;
  notes?: string;
}
```

## Approval API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/approvals/pending` | List pending approvals for current user |
| POST | `/api/approvals/:id/approve` | Approve a request |
| POST | `/api/approvals/:id/reject` | Reject a request |

## Notification Integration

Approvals trigger notifications via:
- **Email:** Sent immediately on assignment
- **WebSocket:** Real-time updates in UI

Notification content includes:
- Workflow name
- Requester name
- Form summary (key fields)
- Approve/Reject action links
- Deadline if set

## Related Pages

- [[Overview]] — Project overview
- [[Workflow Engine]] — How approval nodes execute
- [[Approval Entity]] — ApprovalRequest database model
- [[Delegation Entity]] — Delegation database model
- [[Escalation Entity]] — EscalationRule database model
