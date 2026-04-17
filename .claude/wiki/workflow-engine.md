# Workflow Engine Specification

## Overview

The Workflow Engine (`backend/src/workflows/workflow-engine.service.ts`) is the core execution runtime for ServiceFlow. It interprets workflow definitions, manages instance state, and drives workflows from start to completion.

## Workflow Definition Structure

A workflow consists of **nodes** (steps) and **connections** (transitions between steps). Both are stored as JSON in the database.

```typescript
interface WorkflowDefinition {
  id: string;
  name: string;
  description?: string;
  nodes: WorkflowNode[];
  connections: Connection[];
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

interface WorkflowNode {
  id: string;
  type: NodeType;
  label: string;
  position: { x: number; y: number };
  config: NodeConfig;
}

interface Connection {
  id: string;
  sourceNodeId: string;
  targetNodeId: string;
  sourceHandle?: string;
  condition?: string;
}
```

## Node Types

| Node Type | Description | Config Properties |
|-----------|-------------|-------------------|
| **Start** | Entry point of workflow (required, exactly one) | - |
| **End** | Exit point of workflow (required, at least one) | - |
| **Task** | Simple manual task step | `assignee`, `instructions` |
| **Form** | Collect data via form | `formId`, `assignee` |
| **Approval** | Request approval from user(s) | `approvers`, `approvalType` (sequential/parallel) |
| **Condition** | Branch based on data | `conditions[]`, `expressions[]` |
| **Parallel** | Start parallel branches | `branches[]` |
| **Join** | Wait for parallel branches (AND/OR) | `joinType`, `branches[]` |
| **Sub-workflow** | Invoke nested workflow | `subWorkflowId` |
| **Script** | Execute JavaScript expression | `script`, `outputField` |
| **Set Value** | Assign value to field | `field`, `value` |
| **Transform** | Transform data format | `mapping` |

## Execution Model

### Execution Flow

1. **Start:** User or API starts a workflow instance with initial data
2. **Initialize:** Engine creates `WorkflowInstance` and sets current node to Start
3. **Advance:** Engine moves to next node based on connections
4. **Process Node:** Engine processes current node based on type:
   - **Task/Form/Approval:** Pause and wait for human action
   - **Condition:** Evaluate and branch
   - **Parallel:** Spawn multiple branches
   - **Script/Set Value/Transform:** Execute immediately
   - **Sub-workflow:** Invoke nested workflow
5. **Complete:** When End node is reached, instance is marked complete

### Execution Result

```typescript
interface ExecutionResult {
  success: boolean;
  nextNodeId: string | null;
  actionRequired?: {
    type: 'approval' | 'form_fill' | 'subworkflow';
    nodeId: string;
    message: string;
  };
  parallelBranches?: string[];
  error?: string;
}
```

### Instance State

```typescript
interface WorkflowInstance {
  id: string;
  workflowId: string;
  status: 'active' | 'completed' | 'rejected' | 'cancelled';
  currentNodeId: string;
  data: Record<string, any>;
  history: WorkflowInstanceNode[];
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
}
```

## Parallel Execution

### Parallel Node

When a Parallel node is reached, the engine:
1. Creates a branch context for each output connection
2. Executes nodes in each branch concurrently
3. Tracks completion of all branches

### Join Node

Join nodes wait for all (AND) or any (OR) parallel branches to complete:
- **AND Join:** Waits for all input branches
- **OR Join:** Proceeds when first branch completes

### Approval Types

| Type | Behavior |
|------|----------|
| **Sequential** | Approvers are contacted one at a time in order |
| **Parallel** | All approvers are contacted simultaneously |

## Condition Evaluation

Conditions use JavaScript-like expressions:

```javascript
// Example conditions
formData.amount > 1000
formData.department === 'IT'
formData.priority === 'urgent' && formData.approved
```

Expressions are evaluated against the instance data context.

## Sub-workflow Invocation

Sub-workflows create parent-child instance relationships:
1. Parent instance pauses at Sub-workflow node
2. Child instance is created and executed
3. Child result (approved/rejected/completed) determines parent continuation
4. Data can be passed between parent and child via `inputMapping`/`outputMapping`

## Error Handling

- **Node errors:** Logged to EscalationLog, can trigger escalation
- **Validation errors:** Block workflow advancement
- **Timeout:** Triggers escalation based on EscalationRule configuration

## Related Pages

- [[Overview]] — Project overview
- [[Technical Architecture]] — System design
- [[Workflow Execution Workflow]] — End-to-end workflow lifecycle
- [[Approval System]] — Approval node behavior
