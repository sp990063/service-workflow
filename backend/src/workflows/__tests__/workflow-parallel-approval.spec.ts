import { Test, TestingModule } from '@nestjs/testing';
import { WorkflowsService } from '../workflows.service';
import { PrismaService } from '../../prisma.service';
import { createMockWorkflow, createMockWorkflowInstance } from '../../../tests/factories';

describe('WorkflowsService - Parallel Approval', () => {
  let service: WorkflowsService;
  let mockPrisma: any;

  beforeEach(async () => {
    mockPrisma = {
      workflow: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
      },
      workflowInstance: {
        findUnique: jest.fn(),
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

  describe('initParallelApproval', () => {
    it('should initialize parallel approval with required approvers', async () => {
      const mockInstance = createMockWorkflowInstance({
        id: 'inst-123',
        formData: { name: 'Test' },
      });
      const updatedInstance = {
        ...mockInstance,
        formData: JSON.stringify({
          name: 'Test',
          parallelApprovals: {
            'parallel-1': {
              nodeId: 'parallel-1',
              requiredApprovers: ['user-1', 'user-2'],
              approvals: [],
              status: 'PENDING',
            },
          },
        }),
      };

      mockPrisma.workflowInstance.findUnique.mockResolvedValue(mockInstance);
      mockPrisma.workflowInstance.update.mockResolvedValue(updatedInstance);

      const result = await service.initParallelApproval('inst-123', 'parallel-1', ['user-1', 'user-2']);

      expect(mockPrisma.workflowInstance.update).toHaveBeenCalledWith({
        where: { id: 'inst-123' },
        data: {
          formData: expect.stringContaining('parallelApprovals'),
        },
      });
    });

    it('should throw error if instance not found', async () => {
      mockPrisma.workflowInstance.findUnique.mockResolvedValue(null);

      await expect(service.initParallelApproval('non-existent', 'node-1', ['user-1'])).rejects.toThrow('Instance not found');
    });
  });

  describe('approveParallel', () => {
    it('should add approver to approvals list', async () => {
      const mockInstance = createMockWorkflowInstance({
        id: 'inst-123',
        workflowId: 'wf-123',
        formData: {
          name: 'Test',
          parallelApprovals: {
            'parallel-1': {
              nodeId: 'parallel-1',
              requiredApprovers: ['user-1', 'user-2'],
              approvals: [],
              status: 'PENDING',
            },
          },
        },
      });
      const mockWorkflow = createMockWorkflow({
        id: 'wf-123',
        nodes: [
          { id: 'start-1', type: 'start' },
          { id: 'parallel-1', type: 'parallel', data: { requiredApprovers: ['user-1', 'user-2'] } },
          { id: 'end-1', type: 'end' },
        ],
      });
      const updatedInstance = {
        ...mockInstance,
        formData: JSON.stringify({
          name: 'Test',
          parallelApprovals: {
            'parallel-1': {
              nodeId: 'parallel-1',
              requiredApprovers: ['user-1', 'user-2'],
              approvals: ['user-1'],
              status: 'PENDING',
            },
          },
        }),
      };

      mockPrisma.workflowInstance.findUnique.mockResolvedValue(mockInstance);
      mockPrisma.workflow.findUnique.mockResolvedValue(mockWorkflow);
      mockPrisma.workflowInstance.update.mockResolvedValue(updatedInstance);

      const result = await service.approveParallel('inst-123', 'parallel-1', 'user-1');

      expect(result.allApproved).toBe(false);
      expect(result.instance.formData.parallelApprovals['parallel-1'].approvals).toContain('user-1');
    });

    it('should return allApproved=true when all approvers have approved', async () => {
      const mockInstance = createMockWorkflowInstance({
        id: 'inst-123',
        workflowId: 'wf-123',
        formData: {
          name: 'Test',
          parallelApprovals: {
            'parallel-1': {
              nodeId: 'parallel-1',
              requiredApprovers: ['user-1', 'user-2'],
              approvals: ['user-2'], // user-2 already approved
              status: 'PENDING',
            },
          },
        },
      });
      const mockWorkflow = createMockWorkflow({
        id: 'wf-123',
        nodes: [
          { id: 'start-1', type: 'start' },
          { id: 'parallel-1', type: 'parallel', data: { requiredApprovers: ['user-1', 'user-2'] } },
          { id: 'end-1', type: 'end' },
        ],
      });
      const updatedInstance = {
        ...mockInstance,
        currentNodeId: 'end-1',
        status: 'COMPLETED',
        formData: JSON.stringify({
          name: 'Test',
          parallelApprovals: {
            'parallel-1': {
              nodeId: 'parallel-1',
              requiredApprovers: ['user-1', 'user-2'],
              approvals: ['user-2', 'user-1'],
              status: 'ALL_APPROVED',
            },
          },
        }),
      };

      mockPrisma.workflowInstance.findUnique.mockResolvedValue(mockInstance);
      mockPrisma.workflow.findUnique.mockResolvedValue(mockWorkflow);
      mockPrisma.workflowInstance.update.mockResolvedValue(updatedInstance);

      const result = await service.approveParallel('inst-123', 'parallel-1', 'user-1');

      expect(result.allApproved).toBe(true);
    });

    it('should throw error if parallel approval not initialized', async () => {
      const mockInstance = createMockWorkflowInstance({
        id: 'inst-123',
        workflowId: 'wf-123',
        formData: {}, // No parallelApprovals
      });
      const mockWorkflow = createMockWorkflow({ id: 'wf-123' });
      mockPrisma.workflowInstance.findUnique.mockResolvedValue(mockInstance);
      mockPrisma.workflow.findUnique.mockResolvedValue(mockWorkflow);

      await expect(service.approveParallel('inst-123', 'non-existent', 'user-1')).rejects.toThrow('Parallel approval not initialized');
    });
  });

  describe('rejectParallel', () => {
    it('should mark parallel approval as rejected', async () => {
      const mockInstance = createMockWorkflowInstance({
        id: 'inst-123',
        formData: {
          parallelApprovals: {
            'parallel-1': {
              nodeId: 'parallel-1',
              requiredApprovers: ['user-1', 'user-2'],
              approvals: [],
              status: 'PENDING',
            },
          },
        },
      });
      const updatedInstance = {
        ...mockInstance,
        status: 'COMPLETED',
        formData: JSON.stringify({
          parallelApprovals: {
            'parallel-1': {
              nodeId: 'parallel-1',
              requiredApprovers: ['user-1', 'user-2'],
              approvals: [],
              status: 'REJECTED',
            },
          },
        }),
      };

      mockPrisma.workflowInstance.findUnique.mockResolvedValue(mockInstance);
      mockPrisma.workflowInstance.update.mockResolvedValue(updatedInstance);

      const result = await service.rejectParallel('inst-123', 'parallel-1', 'user-1');

      expect(result.rejected).toBe(true);
      expect(result.instance.status).toBe('COMPLETED');
    });
  });
});
