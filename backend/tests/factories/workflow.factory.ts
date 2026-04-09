import { randomUUID } from 'crypto';

export interface MockWorkflow {
  id: string;
  name: string;
  description: string | null;
  nodes: any[];
  connections: any[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface MockWorkflowInstance {
  id: string;
  workflowId: string;
  workflowName: string;
  currentNodeId: string | null;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'REJECTED';
  formData: Record<string, any>;
  history: any[];
  createdAt: Date;
  updatedAt: Date;
  completedAt: Date | null;
  rejectedAt: Date | null;
}

export function createMockWorkflow(overrides: Partial<MockWorkflow> = {}): MockWorkflow {
  const now = new Date();
  return {
    id: randomUUID(),
    name: 'Test Workflow',
    description: null,
    nodes: [
      { id: 'start-1', type: 'start', position: { x: 0, y: 0 }, data: {} },
      { id: 'task-1', type: 'task', position: { x: 100, y: 0 }, data: { formId: 'form-1', description: 'Complete this task' } },
      { id: 'end-1', type: 'end', position: { x: 200, y: 0 }, data: {} },
    ],
    connections: [
      { id: 'conn-1', source: 'start-1', target: 'task-1' },
      { id: 'conn-2', source: 'task-1', target: 'end-1' },
    ],
    isActive: true,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

export function createMockWorkflowInstance(overrides: Partial<MockWorkflowInstance> = {}): MockWorkflowInstance {
  const now = new Date();
  return {
    id: randomUUID(),
    workflowId: 'workflow-123',
    workflowName: 'Test Workflow',
    currentNodeId: 'task-1',
    status: 'IN_PROGRESS',
    formData: { name: 'John', email: 'john@example.com' },
    history: [{ nodeId: 'start-1', completedAt: now }],
    createdAt: now,
    updatedAt: now,
    completedAt: null,
    rejectedAt: null,
    ...overrides,
  };
}
