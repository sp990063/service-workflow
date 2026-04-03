# Multi-User Workflow Scenarios - 5 Enterprise Use Cases

## Overview

This document designs 5 realistic enterprise workflow scenarios with:
- Multi-user interactions (different roles)
- Complex approval chains
- **Sub-workflow patterns** (Workflow A triggers Workflow B, waits for completion, then continues)

---

## Scenario 1: IT Equipment Request with IT Sub-Workflow

### Flow
```
[Employee] → Submit Request → [Manager] → Approve → [IT Sub-Workflow] → Process Order → [Employee] → Confirm Receipt

Users: Employee (initiator), Manager (approver), IT Admin (processor), Employee (confirm)
```

### Steps
1. **Employee** fills equipment request form (laptop, software, peripherals)
2. **Manager** reviews and approves/rejects
3. If approved → **IT Sub-Workflow** triggered automatically:
   - IT Admin receives ticket
   - IT Admin prepares equipment
   - IT Admin marks complete
4. **Employee** confirms equipment receipt
5. Workflow completes

### Sub-Workflow: IT Processing
- IT Admin receives notification
- IT Admin updates status (Preparing, Ready)
- IT Admin marks complete → returns to parent workflow

---

## Scenario 2: Leave Request with HR Compliance Check

### Flow
```
[Employee] → Submit Leave → [Manager] → Approve → [HR Sub-Workflow] → Compliance Check → [Manager] → Final Confirm → [Employee]

Users: Employee, Manager, HR Officer
```

### Steps
1. **Employee** submits leave request with dates and reason
2. **Manager** reviews and approves
3. If approved → **HR Sub-Workflow** triggered:
   - HR Officer runs compliance check (leave balance, policy compliance)
   - HR Officer adds notes
   - HR Officer marks complete
4. **Manager** receives HR report
5. **Manager** gives final approval
6. **Employee** notified of final decision

### Sub-Workflow: HR Compliance Check
- HR Officer verifies leave balance
- HR Officer checks policy compliance
- HR Officer adds internal notes
- Complete → Resume parent workflow

---

## Scenario 3: Purchase Order with Finance Validation

### Flow
```
[Employee] → Create PO → [Manager L1] → Initial Approve → [Finance Sub-Workflow] → Budget Check → [CFO] → Final Approve → [Employee] → Send PO

Users: Employee (requester), Manager L1, Finance Officer, CFO
```

### Steps
1. **Employee** creates Purchase Order with items, cost center, vendor
2. **Manager L1** reviews and gives initial approval
3. **Finance Sub-Workflow** triggered:
   - Finance Officer validates budget availability
   - Finance Officer verifies cost center
   - Finance Officer approves budget allocation
4. **CFO** reviews total and gives final sign-off
5. **Employee** receives approved PO
6. **Employee** sends PO to vendor

### Sub-Workflow: Finance Budget Validation
- Finance Officer checks budget allocation
- Finance Officer validates cost center codes
- Finance Officer reserves budget
- Complete → Resume parent workflow

---

## Scenario 4: New Employee Onboarding (Parallel Sub-Workflows)

### Flow
```
[HR Admin] → Start Onboarding → [IT Sub-Workflow] → Setup Accounts → 
                              → [Facilities Sub-Workflow] → Prepare Workspace → 
                              → [Both Complete] → [Manager] → Final Steps → Complete

Users: HR Admin, IT Admin, Facilities Admin, Department Manager
```

### Steps
1. **HR Admin** initiates onboarding workflow with employee details
2. **IT Sub-Workflow** triggered (parallel):
   - IT Admin creates email account
   - IT Admin creates system accounts
   - IT Admin provisions laptop
3. **Facilities Sub-Workflow** triggered (parallel):
   - Facilities prepares workspace
   - Facilities creates access badge
   - Facilities sets up phone/desk
4. Both sub-workflows complete
5. **Department Manager** completes final onboarding steps
6. Workflow completes

### Sub-Workflow 1: IT Account Setup
- IT Admin creates AD account
- IT Admin creates email account
- IT Admin provisions required software
- Complete → Notify parent

### Sub-Workflow 2: Facilities Preparation
- Facilities assigns workspace
- Facilities creates access badge
- Facilities prepares equipment
- Complete → Notify parent

---

## Scenario 5: Incident Management with Severity-Based Escalation

### Flow
```
[Reporter] → Report Incident → [IT Support] → Triage → 
                                       ↓
                          [If Critical] → [Crisis Sub-Workflow] → Activate Crisis Team
                          [If Normal] → Standard Resolution
                                       ↓
                              [Reporter] → Confirm Resolution → Complete

Users: Reporter, IT Support, Crisis Team Lead, IT Manager
```

### Steps
1. **Reporter** submits incident report (system, description, severity)
2. **IT Support** triages incident:
   - If **Critical**: Triggers **Crisis Management Sub-Workflow**
     - Crisis Team Lead activates response
     - Crisis Team Lead coordinates fix
     - Crisis Team Lead declares resolution
   - If **Normal**: IT Support resolves directly
3. **Reporter** confirms resolution
4. Workflow completes with incident report

### Sub-Workflow: Crisis Management
- Crisis Team Lead assesses impact
- Crisis Team Lead mobilizes resources
- Crisis Team Lead implements fix
- Crisis Team Lead declares crisis resolved
- Complete → Resume parent workflow

---

## Technical Requirements for Sub-Workflow Support

### New Node Type: Sub-Workflow Node
```typescript
interface SubWorkflowNode {
  type: 'sub-workflow';
  data: {
    label: string;
    description?: string;
    childWorkflowId: string;  // ID of workflow to trigger
    waitForCompletion: boolean; // Wait for child to complete
    mapping?: {
      inputFields: { parentField: string, childField: string }[];
      outputFields: { childField: string, parentField: string }[];
    };
  };
}
```

### Parent-Child Workflow State Management
```typescript
interface WorkflowInstance {
  id: string;
  workflowId: string;
  status: 'pending' | 'in-progress' | 'waiting-for-child' | 'completed';
  currentNodeId: string | null;
  childInstanceId?: string;  // If waiting for child workflow
  parentInstanceId?: string; // If this is a child workflow
  formData: Record<string, any>;
  history: HistoryEntry[];
}
```

### Key Behaviors
1. **Trigger**: When parent workflow reaches Sub-Workflow node, create child instance
2. **Wait**: Parent status changes to `waiting-for-child`, UI shows "Waiting for sub-workflow..."
3. **Complete Child**: Child workflow marks complete → check parent, resume if waiting
4. **Resume**: Parent workflow continues to next node after Sub-Workflow node

### Test Scenarios for Sub-Workflow

#### TC-SUB-001: Parent triggers child, waits, resumes
- Create parent workflow (Start → SubWorkflow → End)
- Create child workflow (Start → Task → End)
- Execute parent
- Verify child starts
- Complete child
- Verify parent resumes and completes

#### TC-SUB-002: Parallel sub-workflows
- Create main workflow with 2 parallel sub-workflow nodes
- Execute main
- Verify both sub-workflows start
- Complete both
- Verify main continues

#### TC-SUB-003: Multi-level nesting (A→B→C)
- Create workflow C (leaf)
- Create workflow B (calls C)
- Create workflow A (calls B)
- Execute A
- Verify B starts
- Verify B triggers C
- Complete C → B resumes → B completes
- A resumes and completes

---

## Summary: 5 Scenarios

| # | Scenario | Users | Sub-Workflow | Complexity |
|---|----------|-------|--------------|------------|
| 1 | IT Equipment Request | 4 | IT Processing | ★★☆☆☆ |
| 2 | Leave Request + HR Check | 3 | HR Compliance | ★★☆☆☆ |
| 3 | Purchase Order + Finance | 4 | Budget Validation | ★★★☆☆ |
| 4 | Onboarding (Parallel) | 4 | IT + Facilities (parallel) | ★★★★☆ |
| 5 | Incident + Escalation | 4 | Crisis Management | ★★★☆☆ |

---

## Next Steps

1. **Implement Sub-Workflow node type** in workflow designer
2. **Add child workflow triggering** logic in workflow player
3. **Add waiting/resume state** management
4. **Write E2E tests** for each scenario
5. **Test parallel sub-workflow** scenarios
