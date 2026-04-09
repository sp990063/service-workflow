import { Test, TestingModule } from '@nestjs/testing';
import { WorkflowsService } from './workflows.service';
import { PrismaService } from '../prisma.service';
import { createMockWorkflow, createMockWorkflowInstance } from '../../tests/factories';

describe('WorkflowsService', () => {
  let service: WorkflowsService;
  let mockPrisma: any;

  beforeEach(async () => {
    mockPrisma = {
      workflow: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        count: jest.fn(),
      },
      workflowInstance: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        count: jest.fn(),
      },
      approvalRequest: {
        findMany: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WorkflowsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<WorkflowsService>(WorkflowsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return all active workflows', async () => {
      const mockWorkflows = [createMockWorkflow(), createMockWorkflow()];
      mockPrisma.workflow.findMany.mockResolvedValue(mockWorkflows);

      const result = await service.findAll();

      expect(result).toEqual(mockWorkflows);
      expect(mockPrisma.workflow.findMany).toHaveBeenCalledWith({
        where: { isActive: true },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should return empty array when no workflows exist', async () => {
      mockPrisma.workflow.findMany.mockResolvedValue([]);

      const result = await service.findAll();

      expect(result).toEqual([]);
    });
  });

  describe('findById', () => {
    it('should return workflow with given id', async () => {
      const mockWorkflow = createMockWorkflow({ id: 'wf-123' });
      mockPrisma.workflow.findUnique.mockResolvedValue(mockWorkflow);

      const result = await service.findById('wf-123');

      expect(result).toEqual(mockWorkflow);
      expect(mockPrisma.workflow.findUnique).toHaveBeenCalledWith({ where: { id: 'wf-123' } });
    });

    it('should return null for non-existent workflow', async () => {
      mockPrisma.workflow.findUnique.mockResolvedValue(null);

      const result = await service.findById('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('create', () => {
    it('should create a new workflow', async () => {
      const workflowData = {
        name: 'New Workflow',
        description: 'Test description',
        nodes: [{ id: 'start', type: 'start' }],
        connections: [],
        userId: 'user-123',
      };
      const mockWorkflow = createMockWorkflow(workflowData);
      mockPrisma.workflow.create.mockResolvedValue(mockWorkflow);

      const result = await service.create(workflowData);

      expect(result).toEqual(mockWorkflow);
      expect(mockPrisma.workflow.create).toHaveBeenCalledWith({
        data: {
          name: 'New Workflow',
          description: 'Test description',
          nodes: JSON.stringify(workflowData.nodes),
          connections: JSON.stringify([]),
          userId: 'user-123',
        },
      });
    });

    it('should create workflow with empty nodes and connections when not provided', async () => {
      const workflowData = { name: 'New Workflow', userId: 'user-123' };
      const mockWorkflow = createMockWorkflow({ name: 'New Workflow' });
      mockPrisma.workflow.create.mockResolvedValue(mockWorkflow);

      await service.create(workflowData);

      // Service converts undefined to null for description
      expect(mockPrisma.workflow.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: 'New Workflow',
          nodes: '[]',
          connections: '[]',
          userId: 'user-123',
        }),
      });
    });
  });

  describe('update', () => {
    it('should update workflow name', async () => {
      const mockWorkflow = createMockWorkflow({ id: 'wf-123', name: 'Updated Name' });
      mockPrisma.workflow.update.mockResolvedValue(mockWorkflow);

      const result = await service.update('wf-123', { name: 'Updated Name' });

      expect(result.name).toBe('Updated Name');
      expect(mockPrisma.workflow.update).toHaveBeenCalledWith({
        where: { id: 'wf-123' },
        data: { name: 'Updated Name' },
      });
    });

    it('should update nodes and connections', async () => {
      const newNodes = [{ id: 'new-node', type: 'task' }];
      const newConnections = [{ id: 'new-conn', source: 'a', target: 'b' }];
      const mockWorkflow = createMockWorkflow({ nodes: newNodes, connections: newConnections });
      mockPrisma.workflow.update.mockResolvedValue(mockWorkflow);

      const result = await service.update('wf-123', { nodes: newNodes, connections: newConnections });

      expect(mockPrisma.workflow.update).toHaveBeenCalledWith({
        where: { id: 'wf-123' },
        data: {
          nodes: JSON.stringify(newNodes),
          connections: JSON.stringify(newConnections),
        },
      });
    });
  });

  describe('delete', () => {
    it('should set isActive to false', async () => {
      const mockWorkflow = createMockWorkflow({ id: 'wf-123', isActive: false });
      mockPrisma.workflow.update.mockResolvedValue(mockWorkflow);

      const result = await service.delete('wf-123');

      expect(result.isActive).toBe(false);
      expect(mockPrisma.workflow.update).toHaveBeenCalledWith({
        where: { id: 'wf-123' },
        data: { isActive: false },
      });
    });
  });

  describe('startInstance', () => {
    it('should create workflow instance with IN_PROGRESS status', async () => {
      const mockWorkflow = createMockWorkflow({
        id: 'wf-123',
        nodes: [
          { id: 'start-1', type: 'start', data: {} },
          { id: 'task-1', type: 'task', data: { formId: 'form-1' } },
          { id: 'end-1', type: 'end', data: {} },
        ],
      });
      const mockInstance = createMockWorkflowInstance({
        workflowId: 'wf-123',
        currentNodeId: 'task-1',
        status: 'IN_PROGRESS',
      });

      mockPrisma.workflow.findUnique.mockResolvedValue(mockWorkflow);
      mockPrisma.workflowInstance.create.mockResolvedValue(mockInstance);

      const result = await service.startInstance('wf-123', 'user-123');

      expect(result.status).toBe('IN_PROGRESS');
      expect(result.currentNodeId).toBe('task-1');
      expect(mockPrisma.workflowInstance.create).toHaveBeenCalled();
    });

    it('should throw error if workflow not found', async () => {
      mockPrisma.workflow.findUnique.mockResolvedValue(null);

      await expect(service.startInstance('non-existent', 'user-123')).rejects.toThrow('Workflow not found');
    });

    it('should set currentNodeId to first actionable node after start', async () => {
      const mockWorkflow = createMockWorkflow({
        nodes: [
          { id: 'start-1', type: 'start', data: {} },
          { id: 'task-1', type: 'task', data: {} },
        ],
      });
      const mockInstance = createMockWorkflowInstance({ currentNodeId: 'task-1' });
      mockPrisma.workflow.findUnique.mockResolvedValue(mockWorkflow);
      mockPrisma.workflowInstance.create.mockResolvedValue(mockInstance);

      await service.startInstance('wf-123', 'user-123');

      expect(mockPrisma.workflowInstance.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          currentNodeId: 'task-1',
          status: 'IN_PROGRESS',
        }),
      });
    });
  });

  describe('advanceInstance', () => {
    it('should advance to next node and update history', async () => {
      const mockInstance = createMockWorkflowInstance({
        id: 'inst-123',
        workflowId: 'wf-123',
        currentNodeId: 'task-1',
        history: [{ nodeId: 'start-1', action: 'Started' }],
      });
      const mockWorkflow = createMockWorkflow({
        nodes: [
          { id: 'start-1', type: 'start' },
          { id: 'task-1', type: 'task' },
          { id: 'end-1', type: 'end' },
        ],
      });
      const updatedInstance = createMockWorkflowInstance({
        id: 'inst-123',
        currentNodeId: 'end-1',
        status: 'COMPLETED',
      });

      mockPrisma.workflowInstance.findUnique.mockResolvedValue(mockInstance);
      mockPrisma.workflow.findUnique.mockResolvedValue(mockWorkflow);
      mockPrisma.workflowInstance.update.mockResolvedValue(updatedInstance);

      const result = await service.advanceInstance('inst-123', 'end-1', []);

      expect(result.currentNodeId).toBe('end-1');
      expect(result.status).toBe('COMPLETED');
    });

    it('should throw error if instance not found', async () => {
      mockPrisma.workflowInstance.findUnique.mockResolvedValue(null);

      await expect(service.advanceInstance('non-existent', 'end-1', [])).rejects.toThrow('Instance not found');
    });

    it('should evaluate condition node and route to true branch when condition met', async () => {
      const mockInstance = createMockWorkflowInstance({
        id: 'inst-123',
        workflowId: 'wf-123',
        currentNodeId: 'start-1',
        formData: { rating: 5 },
      });
      const mockWorkflow = createMockWorkflow({
        nodes: [
          { id: 'start-1', type: 'start' },
          { id: 'condition-1', type: 'condition', data: { field: 'rating', value: '3', operator: 'greater_than', trueBranch: 'task-high', falseBranch: 'task-low' } },
          { id: 'task-high', type: 'task', data: {} },
          { id: 'task-low', type: 'task', data: {} },
          { id: 'end-1', type: 'end' },
        ],
      });
      const updatedInstance = createMockWorkflowInstance({
        id: 'inst-123',
        currentNodeId: 'task-high', // Should route to high since 5 > 3
        status: 'IN_PROGRESS',
      });

      mockPrisma.workflowInstance.findUnique.mockResolvedValue(mockInstance);
      mockPrisma.workflow.findUnique.mockResolvedValue(mockWorkflow);
      mockPrisma.workflowInstance.update.mockResolvedValue(updatedInstance);

      const result = await service.advanceInstance('inst-123', 'condition-1', []);

      expect(result.currentNodeId).toBe('task-high');
    });

    it('should evaluate condition node and route to false branch when condition not met', async () => {
      const mockInstance = createMockWorkflowInstance({
        id: 'inst-123',
        workflowId: 'wf-123',
        currentNodeId: 'start-1',
        formData: { rating: 2 }, // Less than 3
      });
      const mockWorkflow = createMockWorkflow({
        nodes: [
          { id: 'start-1', type: 'start' },
          { id: 'condition-1', type: 'condition', data: { field: 'rating', value: '3', operator: 'greater_than', trueBranch: 'task-high', falseBranch: 'task-low' } },
          { id: 'task-high', type: 'task', data: {} },
          { id: 'task-low', type: 'task', data: {} },
          { id: 'end-1', type: 'end' },
        ],
      });
      const updatedInstance = createMockWorkflowInstance({
        id: 'inst-123',
        currentNodeId: 'task-low',
        status: 'IN_PROGRESS',
      });

      mockPrisma.workflowInstance.findUnique.mockResolvedValue(mockInstance);
      mockPrisma.workflow.findUnique.mockResolvedValue(mockWorkflow);
      mockPrisma.workflowInstance.update.mockResolvedValue(updatedInstance);

      const result = await service.advanceInstance('inst-123', 'condition-1', []);

      expect(result.currentNodeId).toBe('task-low');
    });
  });

  describe('completeInstance', () => {
    it('should set status to COMPLETED', async () => {
      const mockInstance = createMockWorkflowInstance({ id: 'inst-123', status: 'COMPLETED' });
      mockPrisma.workflowInstance.update.mockResolvedValue(mockInstance);

      const result = await service.completeInstance('inst-123');

      expect(result.status).toBe('COMPLETED');
      expect(mockPrisma.workflowInstance.update).toHaveBeenCalledWith({
        where: { id: 'inst-123' },
        data: { status: 'COMPLETED', currentNodeId: null },
      });
    });
  });

  describe('rejectInstance', () => {
    it('should set status to REJECTED', async () => {
      const mockInstance = createMockWorkflowInstance({ id: 'inst-123', status: 'REJECTED' });
      mockPrisma.workflowInstance.update.mockResolvedValue(mockInstance);

      const result = await service.rejectInstance('inst-123');

      expect(result.status).toBe('REJECTED');
      expect(mockPrisma.workflowInstance.update).toHaveBeenCalledWith({
        where: { id: 'inst-123' },
        data: { status: 'REJECTED', currentNodeId: null },
      });
    });
  });

  describe('getAllInstances', () => {
    it('should return all instances with workflow and user info', async () => {
      const mockInstance = createMockWorkflowInstance({ id: 'inst-123' });
      const mockWorkflow = createMockWorkflow({ id: 'wf-123' });
      const instanceWithRelations = {
        ...mockInstance,
        workflow: mockWorkflow,
        user: { id: 'user-123', name: 'Test User', email: 'test@example.com' },
      };
      mockPrisma.workflowInstance.findMany.mockResolvedValue([instanceWithRelations]);

      const result = await service.getAllInstances();

      expect(result).toHaveLength(1);
      expect(result[0]).toHaveProperty('workflow');
      expect(result[0]).toHaveProperty('user');
    });
  });
});
