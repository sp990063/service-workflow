import { Test, TestingModule } from '@nestjs/testing';
import { WorkflowsService } from '../workflows.service';
import { PrismaService } from '../../prisma.service';
import { createMockWorkflow, createMockWorkflowInstance } from '../../../tests/factories';

describe('WorkflowsService - Sub-workflow', () => {
  let service: WorkflowsService;
  let mockPrisma: any;

  beforeEach(async () => {
    mockPrisma = {
      workflow: {
        findUnique: jest.fn(),
      },
      workflowInstance: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
        create: jest.fn(),
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

  describe('createChildInstance', () => {
    it('should create a child instance for sub-workflow', async () => {
      const parentWorkflow = createMockWorkflow({
        id: 'wf-parent',
        nodes: [
          { id: 'start-1', type: 'start' },
          { id: 'subworkflow-1', type: 'sub-workflow', data: { childWorkflowId: 'wf-child' } },
          { id: 'end-1', type: 'end' },
        ],
      });
      const childWorkflow = createMockWorkflow({
        id: 'wf-child',
        nodes: [
          { id: 'start-child', type: 'start' },
          { id: 'task-child', type: 'task' },
          { id: 'end-child', type: 'end' },
        ],
      });
      const parentInstance = createMockWorkflowInstance({
        id: 'inst-parent',
        workflowId: 'wf-parent',
        currentNodeId: 'subworkflow-1',
        status: 'WAITING_FOR_CHILD',
        formData: { name: 'Test' },
      });
      const childInstance = createMockWorkflowInstance({
        id: 'inst-child',
        workflowId: 'wf-child',
        currentNodeId: 'task-child',
        status: 'IN_PROGRESS',
        parentInstanceId: 'inst-parent',
      });

      mockPrisma.workflow.findUnique
        .mockResolvedValueOnce(childWorkflow) // For createChildInstance lookup
        .mockResolvedValueOnce(parentWorkflow); // For parent instance lookup
      mockPrisma.workflowInstance.create.mockResolvedValue(childInstance);
      mockPrisma.workflowInstance.update.mockResolvedValue(parentInstance);
      mockPrisma.workflowInstance.findUnique.mockResolvedValue(parentInstance);

      const result = await service.createChildInstance('inst-parent', 'wf-child', 'user-123', { name: 'Test' });

      expect(result.workflowId).toBe('wf-child');
      expect(mockPrisma.workflowInstance.create).toHaveBeenCalled();
    });

    it('should throw error if child workflow not found', async () => {
      mockPrisma.workflow.findUnique.mockResolvedValue(null);

      await expect(service.createChildInstance('inst-parent', 'non-existent', 'user-123', {})).rejects.toThrow('Child workflow not found');
    });

    it('should update parent instance with childInstanceId', async () => {
      const childWorkflow = createMockWorkflow({
        id: 'wf-child',
        nodes: [{ id: 'start-child', type: 'start' }],
      });
      const parentInstance = createMockWorkflowInstance({
        id: 'inst-parent',
        currentNodeId: 'subworkflow-1',
        history: [],
        formData: { name: 'Test' },
      });
      const childInstance = createMockWorkflowInstance({
        id: 'inst-child',
        workflowId: 'wf-child',
      });

      mockPrisma.workflow.findUnique.mockResolvedValueOnce(childWorkflow);
      mockPrisma.workflowInstance.create.mockResolvedValue(childInstance);
      mockPrisma.workflowInstance.findUnique.mockResolvedValueOnce(parentInstance);
      mockPrisma.workflowInstance.update.mockResolvedValue({
        ...parentInstance,
        childInstanceId: 'inst-child',
        status: 'WAITING_FOR_CHILD',
      });

      await service.createChildInstance('inst-parent', 'wf-child', 'user-123', { name: 'Test' });

      expect(mockPrisma.workflowInstance.update).toHaveBeenCalledWith({
        where: { id: 'inst-parent' },
        data: expect.objectContaining({
          childInstanceId: 'inst-child',
          status: 'WAITING_FOR_CHILD',
        }),
      });
    });
  });

  describe('getChildInstances', () => {
    it('should return all child instances for a parent', async () => {
      const childInstances = [
        createMockWorkflowInstance({ id: 'inst-child-1', workflowId: 'wf-child' }),
        createMockWorkflowInstance({ id: 'inst-child-2', workflowId: 'wf-child' }),
      ];

      mockPrisma.workflowInstance.findMany.mockResolvedValue(childInstances);

      const result = await service.getChildInstances('inst-parent');

      expect(result).toHaveLength(2);
      expect(mockPrisma.workflowInstance.findMany).toHaveBeenCalledWith({
        where: { parentInstanceId: 'inst-parent' },
      });
    });
  });
});
