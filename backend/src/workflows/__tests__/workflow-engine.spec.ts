/**
 * Workflow Engine Unit Tests
 * 
 * Tests core workflow execution logic
 */

import { WorkflowEngineService } from '../workflow-engine.service';

describe('WorkflowEngineService', () => {
  let service: WorkflowEngineService;

  // Mock PrismaService
  const mockPrisma = {
    workflow: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
    },
    workflowInstance: {
      create: jest.fn(),
      update: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
  };

  beforeEach(() => {
    service = new WorkflowEngineService(mockPrisma as any);
    jest.clearAllMocks();
  });

  describe('evaluateCondition', () => {
    it('should evaluate equals operator', () => {
      const node = {
        id: 'cond-1',
        type: 'condition',
        data: {
          conditions: [{ field: 'status', operator: 'equals', value: 'approved' }],
          operator: 'AND',
        },
      };

      expect(service.evaluateCondition(node, { status: 'approved' })).toBe(true);
      expect(service.evaluateCondition(node, { status: 'pending' })).toBe(false);
    });

    it('should evaluate not_equals operator', () => {
      const node = {
        id: 'cond-1',
        type: 'condition',
        data: {
          conditions: [{ field: 'status', operator: 'not_equals', value: 'rejected' }],
          operator: 'AND',
        },
      };

      expect(service.evaluateCondition(node, { status: 'approved' })).toBe(true);
      expect(service.evaluateCondition(node, { status: 'rejected' })).toBe(false);
    });

    it('should evaluate contains operator', () => {
      const node = {
        id: 'cond-1',
        type: 'condition',
        data: {
          conditions: [{ field: 'name', operator: 'contains', value: 'John' }],
          operator: 'AND',
        },
      };

      expect(service.evaluateCondition(node, { name: 'John Doe' })).toBe(true);
      expect(service.evaluateCondition(node, { name: 'Jane Smith' })).toBe(false);
    });

    it('should evaluate greater_than operator', () => {
      const node = {
        id: 'cond-1',
        type: 'condition',
        data: {
          conditions: [{ field: 'amount', operator: 'greater_than', value: 10000 }],
          operator: 'AND',
        },
      };

      expect(service.evaluateCondition(node, { amount: 15000 })).toBe(true);
      expect(service.evaluateCondition(node, { amount: 5000 })).toBe(false);
    });

    it('should evaluate less_than operator', () => {
      const node = {
        id: 'cond-1',
        type: 'condition',
        data: {
          conditions: [{ field: 'amount', operator: 'less_than', value: 1000 }],
          operator: 'AND',
        },
      };

      expect(service.evaluateCondition(node, { amount: 500 })).toBe(true);
      expect(service.evaluateCondition(node, { amount: 1500 })).toBe(false);
    });

    it('should evaluate AND operator with multiple conditions', () => {
      const node = {
        id: 'cond-1',
        type: 'condition',
        data: {
          conditions: [
            { field: 'status', operator: 'equals', value: 'approved' },
            { field: 'amount', operator: 'greater_than', value: 5000 },
          ],
          operator: 'AND',
        },
      };

      expect(service.evaluateCondition(node, { status: 'approved', amount: 10000 })).toBe(true);
      expect(service.evaluateCondition(node, { status: 'approved', amount: 1000 })).toBe(false);
      expect(service.evaluateCondition(node, { status: 'rejected', amount: 10000 })).toBe(false);
    });

    it('should evaluate OR operator with multiple conditions', () => {
      const node = {
        id: 'cond-1',
        type: 'condition',
        data: {
          conditions: [
            { field: 'isUrgent', operator: 'equals', value: true },
            { field: 'amount', operator: 'greater_than', value: 10000 },
          ],
          operator: 'OR',
        },
      };

      expect(service.evaluateCondition(node, { isUrgent: true, amount: 100 })).toBe(true);
      expect(service.evaluateCondition(node, { isUrgent: false, amount: 20000 })).toBe(true);
      expect(service.evaluateCondition(node, { isUrgent: false, amount: 100 })).toBe(false);
    });

    it('should handle is_empty operator', () => {
      const node = {
        id: 'cond-1',
        type: 'condition',
        data: {
          conditions: [{ field: 'notes', operator: 'is_empty', value: null }],
          operator: 'AND',
        },
      };

      expect(service.evaluateCondition(node, { notes: '' })).toBe(true);
      expect(service.evaluateCondition(node, { notes: null })).toBe(true);
      expect(service.evaluateCondition(node, { notes: 'some text' })).toBe(false);
    });

    it('should handle is_not_empty operator', () => {
      const node = {
        id: 'cond-1',
        type: 'condition',
        data: {
          conditions: [{ field: 'notes', operator: 'is_not_empty', value: null }],
          operator: 'AND',
        },
      };

      expect(service.evaluateCondition(node, { notes: 'some text' })).toBe(true);
      expect(service.evaluateCondition(node, { notes: '' })).toBe(false);
    });

    it('should return true for node without conditions', () => {
      const node = {
        id: 'cond-1',
        type: 'condition',
        data: {},
      };

      expect(service.evaluateCondition(node, { status: 'anything' })).toBe(true);
    });
  });

  describe('getNextNode', () => {
    const connections = [
      { from: 'start', to: 'approval-1' },
      { from: 'approval-1', to: 'condition-1' },
      { from: 'condition-1', to: 'task-1', label: 'true' },
      { from: 'condition-1', to: 'end', label: 'false' },
      { from: 'task-1', to: 'end' },
    ];

    it('should return next node in linear workflow', () => {
      const next = service.getNextNode('start', connections);
      expect(next).toBe('approval-1');
    });

    it('should return null for end node with no outgoing', () => {
      const next = service.getNextNode('end', connections);
      expect(next).toBeNull();
    });

    it('should evaluate condition and return correct branch', () => {
      const conditionNode = {
        id: 'condition-1',
        type: 'condition',
        data: {
          conditions: [{ field: 'approved', operator: 'equals', value: true }],
        },
      };

      // When condition is true (via formData), should return true branch
      const nextTrue = service.getNextNode('condition-1', connections, { approved: true }, conditionNode);
      expect(nextTrue).toBe('task-1');

      // When condition is false, should return false branch
      const nextFalse = service.getNextNode('condition-1', connections, { approved: false }, conditionNode);
      expect(nextFalse).toBe('end');
    });
  });

  describe('executeCurrentNode', () => {
    it('should handle start node by advancing', async () => {
      const mockInstance = {
        id: 'instance-1',
        workflowId: 'workflow-1',
        currentNodeId: 'start',
        status: 'IN_PROGRESS',
        formData: {},
        history: [],
      };

      const mockWorkflow = {
        id: 'workflow-1',
        nodes: [
          { id: 'start', type: 'start', data: { label: 'Start' } },
          { id: 'end', type: 'end', data: { label: 'End' } },
        ],
        connections: [
          { from: 'start', to: 'end' },
        ],
      };

      mockPrisma.workflowInstance.findUnique.mockResolvedValue(mockInstance);
      mockPrisma.workflow.findUnique.mockResolvedValue(mockWorkflow);
      mockPrisma.workflowInstance.update.mockResolvedValue({
        ...mockInstance,
        currentNodeId: 'end',
      });

      const result = await service.executeCurrentNode('instance-1');

      expect(result.success).toBe(true);
      // Start node advances to end node (next call would complete it)
      expect(['end', null]).toContain(result.nextNodeId);
    });

    it('should require action for approval node', async () => {
      const mockInstance = {
        id: 'instance-1',
        workflowId: 'workflow-1',
        currentNodeId: 'approval-1',
        status: 'IN_PROGRESS',
        formData: {},
        history: [],
      };

      const mockWorkflow = {
        id: 'workflow-1',
        nodes: [
          { id: 'start', type: 'start', data: {} },
          { id: 'approval-1', type: 'approval', data: { label: 'Manager Approval' } },
          { id: 'end', type: 'end', data: {} },
        ],
        connections: [
          { from: 'start', to: 'approval-1' },
          { from: 'approval-1', to: 'end' },
        ],
      };

      mockPrisma.workflowInstance.findUnique.mockResolvedValue(mockInstance);
      mockPrisma.workflow.findUnique.mockResolvedValue(mockWorkflow);

      const result = await service.executeCurrentNode('instance-1');

      expect(result.success).toBe(true);
      expect(result.actionRequired?.type).toBe('approval');
      expect(result.actionRequired?.nodeId).toBe('approval-1');
    });

    it('should return error for non-existent instance', async () => {
      mockPrisma.workflowInstance.findUnique.mockResolvedValue(null);

      const result = await service.executeCurrentNode('non-existent');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Instance not found');
    });
  });

  describe('submitApproval', () => {
    it('should approve and advance workflow', async () => {
      const mockInstance = {
        id: 'instance-1',
        workflowId: 'workflow-1',
        currentNodeId: 'approval-1',
        status: 'IN_PROGRESS',
        formData: {},
        history: [],
      };

      const mockWorkflow = {
        id: 'workflow-1',
        nodes: [
          { id: 'start', type: 'start', data: {} },
          { id: 'approval-1', type: 'approval', data: {} },
          { id: 'end', type: 'end', data: {} },
        ],
        connections: [
          { from: 'start', to: 'approval-1' },
          { from: 'approval-1', to: 'end' },
        ],
      };

      mockPrisma.workflowInstance.findUnique.mockResolvedValue(mockInstance);
      mockPrisma.workflow.findUnique.mockResolvedValue(mockWorkflow);
      mockPrisma.workflowInstance.update.mockResolvedValue({
        ...mockInstance,
        currentNodeId: 'end',
        status: 'COMPLETED',
      });

      const result = await service.submitApproval('instance-1', 'approver-1', 'approve', 'Looks good');

      expect(result.success).toBe(true);
      // Approval advances to end node
      expect(['end', null]).toContain(result.nextNodeId);
    });

    it('should reject and end workflow', async () => {
      const mockInstance = {
        id: 'instance-1',
        workflowId: 'workflow-1',
        currentNodeId: 'approval-1',
        status: 'IN_PROGRESS',
        formData: {},
        history: [],
      };

      const mockWorkflow = {
        id: 'workflow-1',
        nodes: [
          { id: 'start', type: 'start', data: {} },
          { id: 'approval-1', type: 'approval', data: {} },
          { id: 'end', type: 'end', data: {} },
        ],
        connections: [
          { from: 'start', to: 'approval-1' },
          { from: 'approval-1', to: 'end' },
        ],
      };

      mockPrisma.workflowInstance.findUnique.mockResolvedValue(mockInstance);
      mockPrisma.workflow.findUnique.mockResolvedValue(mockWorkflow);
      mockPrisma.workflowInstance.update.mockResolvedValue({
        ...mockInstance,
        status: 'REJECTED',
      });

      const result = await service.submitApproval('instance-1', 'approver-1', 'reject', 'Not approved');

      expect(result.success).toBe(true);
      expect(result.nextNodeId).toBeNull();
    });

    it('should error when not on approval node', async () => {
      const mockInstance = {
        id: 'instance-1',
        workflowId: 'workflow-1',
        currentNodeId: 'start',
        status: 'IN_PROGRESS',
        formData: {},
        history: [],
      };

      const mockWorkflow = {
        id: 'workflow-1',
        nodes: [
          { id: 'start', type: 'start', data: {} },
          { id: 'end', type: 'end', data: {} },
        ],
        connections: [{ from: 'start', to: 'end' }],
      };

      mockPrisma.workflowInstance.findUnique.mockResolvedValue(mockInstance);
      mockPrisma.workflow.findUnique.mockResolvedValue(mockWorkflow);

      const result = await service.submitApproval('instance-1', 'approver-1', 'approve');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Current node is not an approval node');
    });
  });

  describe('submitFormData', () => {
    it('should save form data and advance', async () => {
      const mockInstance = {
        id: 'instance-1',
        workflowId: 'workflow-1',
        currentNodeId: 'form-1',
        status: 'IN_PROGRESS',
        formData: { existingField: 'value' },
        history: [],
      };

      const mockWorkflow = {
        id: 'workflow-1',
        nodes: [
          { id: 'start', type: 'start', data: {} },
          { id: 'form-1', type: 'form', data: {} },
          { id: 'end', type: 'end', data: {} },
        ],
        connections: [
          { from: 'start', to: 'form-1' },
          { from: 'form-1', to: 'end' },
        ],
      };

      mockPrisma.workflowInstance.findUnique.mockResolvedValue(mockInstance);
      mockPrisma.workflow.findUnique.mockResolvedValue(mockWorkflow);
      mockPrisma.workflowInstance.update.mockResolvedValue({
        ...mockInstance,
        formData: { existingField: 'value', newField: 'newValue' },
      });

      const result = await service.submitFormData('instance-1', { newField: 'newValue' });

      expect(result.success).toBe(true);
    });

    it('should return error when not on form node', async () => {
      const mockInstance = {
        id: 'instance-1',
        workflowId: 'workflow-1',
        currentNodeId: 'start',
        status: 'IN_PROGRESS',
        formData: {},
        history: [],
      };

      const mockWorkflow = {
        id: 'workflow-1',
        nodes: [
          { id: 'start', type: 'start', data: {} },
          { id: 'end', type: 'end', data: {} },
        ],
        connections: [{ from: 'start', to: 'end' }],
      };

      mockPrisma.workflowInstance.findUnique.mockResolvedValue(mockInstance);
      mockPrisma.workflow.findUnique.mockResolvedValue(mockWorkflow);

      const result = await service.submitFormData('instance-1', { field: 'value' });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Current node is not a form node');
    });

    it('should return error when instance not found', async () => {
      mockPrisma.workflowInstance.findUnique.mockResolvedValue(null);

      const result = await service.submitFormData('non-existent', {});

      expect(result.success).toBe(false);
      expect(result.error).toBe('Instance not found');
    });
  });

  describe('getWorkflowByName', () => {
    it('should return workflow by name', async () => {
      const mockWorkflow = {
        id: 'workflow-1',
        name: 'Test Workflow',
        nodes: '[]',
        connections: '[]',
      };

      mockPrisma.workflow.findFirst.mockResolvedValue(mockWorkflow);

      const result = await service.getWorkflowByName('Test Workflow');

      expect(result).toBeDefined();
      expect(result.name).toBe('Test Workflow');
    });

    it('should return null when workflow not found', async () => {
      mockPrisma.workflow.findFirst.mockResolvedValue(null);

      const result = await service.getWorkflowByName('Non-existent');

      expect(result).toBeNull();
    });
  });

  describe('evaluateCondition - additional operators', () => {
    it('should evaluate greater_than_or_equals operator', () => {
      const node = {
        id: 'cond-1',
        type: 'condition',
        data: {
          conditions: [{ field: 'amount', operator: 'greater_than_or_equals', value: 10000 }],
          operator: 'AND',
        },
      };

      expect(service.evaluateCondition(node, { amount: 10000 })).toBe(true);
      expect(service.evaluateCondition(node, { amount: 15000 })).toBe(true);
      expect(service.evaluateCondition(node, { amount: 5000 })).toBe(false);
    });

    it('should evaluate less_than_or_equals operator', () => {
      const node = {
        id: 'cond-1',
        type: 'condition',
        data: {
          conditions: [{ field: 'amount', operator: 'less_than_or_equals', value: 10000 }],
          operator: 'AND',
        },
      };

      expect(service.evaluateCondition(node, { amount: 10000 })).toBe(true);
      expect(service.evaluateCondition(node, { amount: 5000 })).toBe(true);
      expect(service.evaluateCondition(node, { amount: 15000 })).toBe(false);
    });

    it('should handle unknown operator by returning true', () => {
      const node = {
        id: 'cond-1',
        type: 'condition',
        data: {
          conditions: [{ field: 'status', operator: 'unknown_op', value: 'x' }],
          operator: 'AND',
        },
      };

      expect(service.evaluateCondition(node, { status: 'anything' })).toBe(true);
    });
  });

  describe('getNextNode - fallback', () => {
    it('should return first connection when no condition branches defined', () => {
      const connections = [
        { from: 'node-1', to: 'node-2' },
        { from: 'node-1', to: 'node-3' },
      ];
      const node = {
        id: 'node-1',
        type: 'condition',
        data: { conditions: [] },
      };

      const next = service.getNextNode('node-1', connections, {}, node);
      expect(next).toBe('node-2');
    });

    it('should return null when current node has no outgoing connections', () => {
      const connections = [
        { from: 'other-node', to: 'node-2' },
      ];

      const next = service.getNextNode('isolated-node', connections);
      expect(next).toBeNull();
    });
  });

  describe('getAvailableActions', () => {
    it('should return actions for approval node', async () => {
      const mockInstance = {
        id: 'instance-1',
        workflowId: 'workflow-1',
        currentNodeId: 'approval-1',
        status: 'IN_PROGRESS',
        formData: {},
        history: [],
      };

      const mockWorkflow = {
        id: 'workflow-1',
        nodes: [
          { id: 'start', type: 'start', data: {} },
          { id: 'approval-1', type: 'approval', data: { label: 'Manager Approval' } },
          { id: 'end', type: 'end', data: {} },
        ],
        connections: [
          { from: 'start', to: 'approval-1' },
          { from: 'approval-1', to: 'end' },
        ],
      };

      mockPrisma.workflowInstance.findUnique.mockResolvedValue(mockInstance);
      mockPrisma.workflow.findUnique.mockResolvedValue(mockWorkflow);

      const actions = await service.getAvailableActions('instance-1');

      expect(actions).toContainEqual({ action: 'approve', label: 'Approve' });
      expect(actions).toContainEqual({ action: 'reject', label: 'Reject' });
    });

    it('should return actions for form node', async () => {
      const mockInstance = {
        id: 'instance-1',
        workflowId: 'workflow-1',
        currentNodeId: 'form-1',
        status: 'IN_PROGRESS',
        formData: {},
        history: [],
      };

      const mockWorkflow = {
        id: 'workflow-1',
        nodes: [
          { id: 'start', type: 'start', data: {} },
          { id: 'form-1', type: 'form', data: {} },
          { id: 'end', type: 'end', data: {} },
        ],
        connections: [
          { from: 'start', to: 'form-1' },
          { from: 'form-1', to: 'end' },
        ],
      };

      mockPrisma.workflowInstance.findUnique.mockResolvedValue(mockInstance);
      mockPrisma.workflow.findUnique.mockResolvedValue(mockWorkflow);

      const actions = await service.getAvailableActions('instance-1');

      expect(actions).toContainEqual({ action: 'submit_form', label: 'Submit Form' });
    });

    it('should return actions for task node', async () => {
      const mockInstance = {
        id: 'instance-1',
        workflowId: 'workflow-1',
        currentNodeId: 'task-1',
        status: 'IN_PROGRESS',
        formData: {},
        history: [],
      };

      const mockWorkflow = {
        id: 'workflow-1',
        nodes: [
          { id: 'start', type: 'start', data: {} },
          { id: 'task-1', type: 'task', data: {} },
          { id: 'end', type: 'end', data: {} },
        ],
        connections: [
          { from: 'start', to: 'task-1' },
          { from: 'task-1', to: 'end' },
        ],
      };

      mockPrisma.workflowInstance.findUnique.mockResolvedValue(mockInstance);
      mockPrisma.workflow.findUnique.mockResolvedValue(mockWorkflow);

      const actions = await service.getAvailableActions('instance-1');

      expect(actions).toContainEqual({ action: 'complete_task', label: 'Complete Task' });
    });

    it('should return empty array for completed instance', async () => {
      const mockInstance = {
        id: 'instance-1',
        workflowId: 'workflow-1',
        currentNodeId: 'end',
        status: 'COMPLETED',
        formData: {},
        history: [],
      };

      mockPrisma.workflowInstance.findUnique.mockResolvedValue(mockInstance);

      const actions = await service.getAvailableActions('instance-1');

      expect(actions).toEqual([]);
    });

    it('should return empty array when instance not found', async () => {
      mockPrisma.workflowInstance.findUnique.mockResolvedValue(null);

      const actions = await service.getAvailableActions('non-existent');

      expect(actions).toEqual([]);
    });
  });

  describe('executeCurrentNode - task node', () => {
    it('should handle task node by advancing', async () => {
      const mockInstance = {
        id: 'instance-1',
        workflowId: 'workflow-1',
        currentNodeId: 'task-1',
        status: 'IN_PROGRESS',
        formData: {},
        history: [],
      };

      const mockWorkflow = {
        id: 'workflow-1',
        nodes: [
          { id: 'start', type: 'start', data: {} },
          { id: 'task-1', type: 'task', data: {} },
          { id: 'end', type: 'end', data: {} },
        ],
        connections: [
          { from: 'start', to: 'task-1' },
          { from: 'task-1', to: 'end' },
        ],
      };

      mockPrisma.workflowInstance.findUnique.mockResolvedValue(mockInstance);
      mockPrisma.workflow.findUnique.mockResolvedValue(mockWorkflow);
      mockPrisma.workflowInstance.update.mockResolvedValue({
        ...mockInstance,
        currentNodeId: 'end',
      });

      const result = await service.executeCurrentNode('instance-1');

      expect(result.success).toBe(true);
      expect(['end', null]).toContain(result.nextNodeId);
    });
  });

  describe('executeCurrentNode - condition node', () => {
    it('should evaluate condition and branch', async () => {
      const mockInstance = {
        id: 'instance-1',
        workflowId: 'workflow-1',
        currentNodeId: 'condition-1',
        status: 'IN_PROGRESS',
        formData: { approved: true },
        history: [],
      };

      const mockWorkflow = {
        id: 'workflow-1',
        nodes: [
          { id: 'start', type: 'start', data: {} },
          { id: 'condition-1', type: 'condition', data: { conditions: [{ field: 'approved', operator: 'equals', value: true }] } },
          { id: 'task-1', type: 'task', data: {} },
          { id: 'end', type: 'end', data: {} },
        ],
        connections: [
          { from: 'start', to: 'condition-1' },
          { from: 'condition-1', to: 'task-1', label: 'true' },
          { from: 'condition-1', to: 'end', label: 'false' },
        ],
      };

      mockPrisma.workflowInstance.findUnique.mockResolvedValue(mockInstance);
      mockPrisma.workflow.findUnique.mockResolvedValue(mockWorkflow);
      mockPrisma.workflowInstance.update.mockResolvedValue({
        ...mockInstance,
        currentNodeId: 'task-1',
      });

      const result = await service.executeCurrentNode('instance-1');

      expect(result.success).toBe(true);
      expect(result.nextNodeId).toBe('task-1');
    });
  });

  describe('executeCurrentNode - workflow not found', () => {
    it('should return error when workflow not found', async () => {
      const mockInstance = {
        id: 'instance-1',
        workflowId: 'non-existent-workflow',
        currentNodeId: 'start',
        status: 'IN_PROGRESS',
        formData: {},
        history: [],
      };

      mockPrisma.workflowInstance.findUnique.mockResolvedValue(mockInstance);
      mockPrisma.workflow.findUnique.mockResolvedValue(null);

      const result = await service.executeCurrentNode('instance-1');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Workflow not found');
    });
  });

  describe('executeCurrentNode - current node not found', () => {
    it('should return error when current node not found', async () => {
      const mockInstance = {
        id: 'instance-1',
        workflowId: 'workflow-1',
        currentNodeId: 'non-existent-node',
        status: 'IN_PROGRESS',
        formData: {},
        history: [],
      };

      const mockWorkflow = {
        id: 'workflow-1',
        nodes: [
          { id: 'start', type: 'start', data: {} },
          { id: 'end', type: 'end', data: {} },
        ],
        connections: [
          { from: 'start', to: 'end' },
        ],
      };

      mockPrisma.workflowInstance.findUnique.mockResolvedValue(mockInstance);
      mockPrisma.workflow.findUnique.mockResolvedValue(mockWorkflow);

      const result = await service.executeCurrentNode('instance-1');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Current node not found');
    });
  });

  describe('executeParallelNode', () => {
    it('should execute parallel node with AND join', async () => {
      const mockInstance = {
        id: 'instance-1',
        workflowId: 'workflow-1',
        currentNodeId: 'parallel-1',
        status: 'IN_PROGRESS',
        formData: {},
        history: [],
      };

      const mockWorkflow = {
        id: 'workflow-1',
        nodes: [
          { id: 'start', type: 'start', data: {} },
          { id: 'parallel-1', type: 'parallel', data: { branches: ['branch-1', 'branch-2'], joinType: 'AND' } },
          { id: 'join-1', type: 'join', data: {} },
          { id: 'end', type: 'end', data: {} },
        ],
        connections: [
          { from: 'start', to: 'parallel-1' },
          { from: 'parallel-1', to: 'join-1' },
          { from: 'join-1', to: 'end' },
        ],
      };

      mockPrisma.workflowInstance.findUnique.mockResolvedValue(mockInstance);
      mockPrisma.workflow.findUnique.mockResolvedValue(mockWorkflow);
      mockPrisma.workflowInstance.update.mockResolvedValue({
        ...mockInstance,
        currentNodeId: 'join-1',
      });

      const result = await service.executeCurrentNode('instance-1');

      expect(result.success).toBe(true);
      expect(result.parallelBranches).toEqual(['branch-1', 'branch-2']);
    });

    it('should execute parallel node with OR join', async () => {
      const mockInstance = {
        id: 'instance-1',
        workflowId: 'workflow-1',
        currentNodeId: 'parallel-1',
        status: 'IN_PROGRESS',
        formData: {},
        history: [],
      };

      const mockWorkflow = {
        id: 'workflow-1',
        nodes: [
          { id: 'start', type: 'start', data: {} },
          { id: 'parallel-1', type: 'parallel', data: { branches: ['branch-1', 'branch-2'], joinType: 'OR' } },
          { id: 'task-1', type: 'task', data: {} },
          { id: 'end', type: 'end', data: {} },
        ],
        connections: [
          { from: 'start', to: 'parallel-1' },
          { from: 'parallel-1', to: 'task-1' },
          { from: 'task-1', to: 'end' },
        ],
      };

      mockPrisma.workflowInstance.findUnique.mockResolvedValue(mockInstance);
      mockPrisma.workflow.findUnique.mockResolvedValue(mockWorkflow);
      mockPrisma.workflowInstance.update.mockResolvedValue({
        ...mockInstance,
        currentNodeId: 'task-1',
      });

      const result = await service.executeCurrentNode('instance-1');

      expect(result.success).toBe(true);
      expect(result.parallelBranches).toEqual(['branch-1', 'branch-2']);
    });

    it('should return error when parallel node has no outgoing connections', async () => {
      const mockInstance = {
        id: 'instance-1',
        workflowId: 'workflow-1',
        currentNodeId: 'parallel-1',
        status: 'IN_PROGRESS',
        formData: {},
        history: [],
      };

      const mockWorkflow = {
        id: 'workflow-1',
        nodes: [
          { id: 'start', type: 'start', data: {} },
          { id: 'parallel-1', type: 'parallel', data: { branches: ['branch-1'], joinType: 'AND' } },
          { id: 'end', type: 'end', data: {} },
        ],
        connections: [
          { from: 'start', to: 'parallel-1' },
          // parallel-1 has no outgoing connections
        ],
      };

      mockPrisma.workflowInstance.findUnique.mockResolvedValue(mockInstance);
      mockPrisma.workflow.findUnique.mockResolvedValue(mockWorkflow);

      const result = await service.executeCurrentNode('instance-1');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Parallel node has no outgoing connections');
    });
  });

  describe('executeJoinNode', () => {
    it('should execute join node with OR join type', async () => {
      const mockInstance = {
        id: 'instance-1',
        workflowId: 'workflow-1',
        currentNodeId: 'join-1',
        status: 'IN_PROGRESS',
        formData: {},
        history: [
          { nodeId: 'parallel-1', nodeType: 'parallel', action: 'started' },
        ],
        workflow: {
          connections: [
            { from: 'join-1', to: 'end' },
          ],
        },
      };

      const mockWorkflow = {
        id: 'workflow-1',
        nodes: [
          { id: 'start', type: 'start', data: {} },
          { id: 'parallel-1', type: 'parallel', data: { joinType: 'OR' } },
          { id: 'join-1', type: 'join', data: { joinType: 'OR' } },
          { id: 'end', type: 'end', data: {} },
        ],
        connections: [
          { from: 'start', to: 'parallel-1' },
          { from: 'parallel-1', to: 'join-1' },
          { from: 'join-1', to: 'end' },
        ],
      };

      mockPrisma.workflowInstance.findUnique.mockResolvedValue(mockInstance);
      mockPrisma.workflow.findUnique.mockResolvedValue(mockWorkflow);
      mockPrisma.workflowInstance.update.mockResolvedValue({
        ...mockInstance,
        currentNodeId: 'end',
      });

      const result = await service.executeCurrentNode('instance-1');

      expect(result.success).toBe(true);
    });

    it('should execute join node with AND join type', async () => {
      const mockInstance = {
        id: 'instance-1',
        workflowId: 'workflow-1',
        currentNodeId: 'join-1',
        status: 'IN_PROGRESS',
        formData: {},
        history: [
          { nodeId: 'parallel-1', nodeType: 'parallel', action: 'started' },
        ],
        workflow: {
          connections: [
            { from: 'join-1', to: 'end' },
          ],
        },
      };

      const mockWorkflow = {
        id: 'workflow-1',
        nodes: [
          { id: 'start', type: 'start', data: {} },
          { id: 'parallel-1', type: 'parallel', data: { joinType: 'AND' } },
          { id: 'join-1', type: 'join', data: { joinType: 'AND' } },
          { id: 'end', type: 'end', data: {} },
        ],
        connections: [
          { from: 'start', to: 'parallel-1' },
          { from: 'parallel-1', to: 'join-1' },
          { from: 'join-1', to: 'end' },
        ],
      };

      mockPrisma.workflowInstance.findUnique.mockResolvedValue(mockInstance);
      mockPrisma.workflow.findUnique.mockResolvedValue(mockWorkflow);
      mockPrisma.workflowInstance.update.mockResolvedValue({
        ...mockInstance,
        currentNodeId: 'end',
      });

      const result = await service.executeCurrentNode('instance-1');

      expect(result.success).toBe(true);
    });
  });

  describe('executeSubWorkflow', () => {
    it('should return error when sub-workflow not found by ID', async () => {
      const mockInstance = {
        id: 'instance-1',
        workflowId: 'workflow-1',
        currentNodeId: 'subworkflow-1',
        status: 'IN_PROGRESS',
        formData: {},
        history: [],
      };

      const mockWorkflow = {
        id: 'workflow-1',
        nodes: [
          { id: 'start', type: 'start', data: {} },
          { id: 'subworkflow-1', type: 'sub-workflow', data: { subWorkflowId: 'non-existent' } },
          { id: 'end', type: 'end', data: {} },
        ],
        connections: [
          { from: 'start', to: 'subworkflow-1' },
          { from: 'subworkflow-1', to: 'end' },
        ],
      };

      // First call: getInstance (workflowInstance.findUnique)
      // Second call: getWorkflow for instance.workflowId (workflow.findUnique)
      // Third call: getWorkflow for subWorkflowId (workflow.findUnique)
      mockPrisma.workflowInstance.findUnique.mockResolvedValue(mockInstance);
      mockPrisma.workflow.findUnique
        .mockResolvedValueOnce(mockWorkflow)  // First: parent workflow found
        .mockResolvedValueOnce(null);        // Second: sub-workflow not found

      const result = await service.executeCurrentNode('instance-1');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Sub-workflow not found');
    });
  });

  describe('startInstance', () => {
    it('should start a workflow instance', async () => {
      const mockWorkflow = {
        id: 'workflow-1',
        name: 'Test Workflow',
        nodes: [
          { id: 'start', type: 'start', data: {} },
          { id: 'end', type: 'end', data: {} },
        ],
        connections: [
          { from: 'start', to: 'end' },
        ],
      };

      const createdInstance = {
        id: 'instance-1',
        workflowId: 'workflow-1',
        userId: 'user-1',
        currentNodeId: 'start',
        status: 'IN_PROGRESS',
        formData: '{}',
        history: '[]',
      };

      mockPrisma.workflow.findUnique.mockResolvedValue(mockWorkflow);
      mockPrisma.workflowInstance.create.mockResolvedValue(createdInstance);
      mockPrisma.workflowInstance.findUnique.mockResolvedValue(createdInstance);
      mockPrisma.workflowInstance.update.mockResolvedValue({
        ...createdInstance,
        currentNodeId: 'end',
        status: 'COMPLETED',
      });

      const result = await service.startInstance('workflow-1', 'user-1', { field: 'value' });

      expect(result).toBeDefined();
      expect(result.workflowId).toBe('workflow-1');
    });

    it('should throw error when workflow not found', async () => {
      mockPrisma.workflow.findUnique.mockResolvedValue(null);

      await expect(service.startInstance('non-existent', 'user-1')).rejects.toThrow('Workflow not found');
    });
  });
});
