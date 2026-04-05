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
  });
});
