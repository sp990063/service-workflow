import { Test, TestingModule } from '@nestjs/testing';
import { ApprovalsService } from './approvals.service';
import { PrismaService } from '../prisma.service';

describe('ApprovalsService', () => {
  let service: ApprovalsService;
  let mockPrisma: any;

  const mockApprovalRequest = {
    id: 'approval-123',
    instanceId: 'instance-123',
    nodeId: 'node-123',
    userId: 'user-123',
    decision: null,
    comment: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    user: { id: 'user-123', name: 'Test User', email: 'test@example.com' },
    instance: {
      id: 'instance-123',
      workflow: { id: 'wf-123', name: 'Test Workflow' },
      user: { id: 'user-123', name: 'Test User', email: 'test@example.com' },
    },
  };

  beforeEach(async () => {
    mockPrisma = {
      approvalRequest: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ApprovalsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<ApprovalsService>(ApprovalsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createApprovalRequest', () => {
    it('should create an approval request', async () => {
      const mockCreated = { ...mockApprovalRequest };
      mockPrisma.approvalRequest.create.mockResolvedValue(mockCreated);

      const result = await service.createApprovalRequest('instance-123', 'node-123', 'user-123');

      expect(result).toEqual(mockCreated);
      expect(mockPrisma.approvalRequest.create).toHaveBeenCalledWith({
        data: {
          instanceId: 'instance-123',
          nodeId: 'node-123',
          userId: 'user-123',
        },
        include: { user: { select: { id: true, name: true, email: true } } },
      });
    });
  });

  describe('getPendingApprovals', () => {
    it('should return pending approvals for a user', async () => {
      mockPrisma.approvalRequest.findMany.mockResolvedValue([mockApprovalRequest]);

      const result = await service.getPendingApprovals('user-123');

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(mockApprovalRequest);
      expect(mockPrisma.approvalRequest.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-123', decision: null },
        include: {
          instance: {
            include: {
              workflow: { select: { id: true, name: true } },
              user: { select: { id: true, name: true, email: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should return empty array when no pending approvals', async () => {
      mockPrisma.approvalRequest.findMany.mockResolvedValue([]);

      const result = await service.getPendingApprovals('user-123');

      expect(result).toEqual([]);
    });
  });

  describe('getAllPendingApprovals', () => {
    it('should return all pending approvals', async () => {
      mockPrisma.approvalRequest.findMany.mockResolvedValue([mockApprovalRequest]);

      const result = await service.getAllPendingApprovals();

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(mockApprovalRequest);
      expect(mockPrisma.approvalRequest.findMany).toHaveBeenCalledWith({
        where: { decision: null },
        include: {
          user: { select: { id: true, name: true, email: true } },
          instance: {
            include: {
              workflow: { select: { id: true, name: true } },
              user: { select: { id: true, name: true, email: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('approve', () => {
    it('should approve an approval request', async () => {
      const approvedRequest = {
        ...mockApprovalRequest,
        decision: 'APPROVED',
        comment: 'Looks good',
        user: { id: 'user-123', name: 'Test User', email: 'test@example.com' },
      };
      mockPrisma.approvalRequest.update.mockResolvedValue(approvedRequest);

      const result = await service.approve('approval-123', 'Looks good');

      expect(result.decision).toBe('APPROVED');
      expect(result.comment).toBe('Looks good');
      expect(mockPrisma.approvalRequest.update).toHaveBeenCalledWith({
        where: { id: 'approval-123' },
        data: { decision: 'APPROVED', comment: 'Looks good' },
        include: { user: { select: { id: true, name: true, email: true } } },
      });
    });

    it('should approve without comment', async () => {
      const approvedRequest = {
        ...mockApprovalRequest,
        decision: 'APPROVED',
        user: { id: 'user-123', name: 'Test User', email: 'test@example.com' },
      };
      mockPrisma.approvalRequest.update.mockResolvedValue(approvedRequest);

      const result = await service.approve('approval-123');

      expect(result.decision).toBe('APPROVED');
      expect(mockPrisma.approvalRequest.update).toHaveBeenCalledWith({
        where: { id: 'approval-123' },
        data: { decision: 'APPROVED', comment: undefined },
        include: { user: { select: { id: true, name: true, email: true } } },
      });
    });
  });

  describe('reject', () => {
    it('should reject an approval request', async () => {
      const rejectedRequest = {
        ...mockApprovalRequest,
        decision: 'REJECTED',
        comment: 'Needs revision',
        user: { id: 'user-123', name: 'Test User', email: 'test@example.com' },
      };
      mockPrisma.approvalRequest.update.mockResolvedValue(rejectedRequest);

      const result = await service.reject('approval-123', 'Needs revision');

      expect(result.decision).toBe('REJECTED');
      expect(result.comment).toBe('Needs revision');
      expect(mockPrisma.approvalRequest.update).toHaveBeenCalledWith({
        where: { id: 'approval-123' },
        data: { decision: 'REJECTED', comment: 'Needs revision' },
        include: { user: { select: { id: true, name: true, email: true } } },
      });
    });

    it('should reject without comment', async () => {
      const rejectedRequest = {
        ...mockApprovalRequest,
        decision: 'REJECTED',
        user: { id: 'user-123', name: 'Test User', email: 'test@example.com' },
      };
      mockPrisma.approvalRequest.update.mockResolvedValue(rejectedRequest);

      const result = await service.reject('approval-123');

      expect(result.decision).toBe('REJECTED');
    });
  });

  describe('getApprovalHistory', () => {
    it('should return approval history for an instance', async () => {
      const historyItems = [
        { ...mockApprovalRequest, decision: 'APPROVED' },
        { ...mockApprovalRequest, id: 'approval-456', decision: 'REJECTED' },
      ];
      mockPrisma.approvalRequest.findMany.mockResolvedValue(historyItems);

      const result = await service.getApprovalHistory('instance-123');

      expect(result).toHaveLength(2);
      expect(mockPrisma.approvalRequest.findMany).toHaveBeenCalledWith({
        where: { instanceId: 'instance-123' },
        include: { user: { select: { id: true, name: true, email: true } } },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should return empty array when no history', async () => {
      mockPrisma.approvalRequest.findMany.mockResolvedValue([]);

      const result = await service.getApprovalHistory('instance-123');

      expect(result).toEqual([]);
    });
  });

  describe('getApprovalRequest', () => {
    it('should return a single approval request by id', async () => {
      mockPrisma.approvalRequest.findUnique.mockResolvedValue(mockApprovalRequest);

      const result = await service.getApprovalRequest('approval-123');

      expect(result).toEqual(mockApprovalRequest);
      expect(mockPrisma.approvalRequest.findUnique).toHaveBeenCalledWith({
        where: { id: 'approval-123' },
        include: {
          user: { select: { id: true, name: true, email: true } },
          instance: {
            include: {
              workflow: { select: { id: true, name: true } },
              user: { select: { id: true, name: true, email: true } },
            },
          },
        },
      });
    });

    it('should return null for non-existent approval request', async () => {
      mockPrisma.approvalRequest.findUnique.mockResolvedValue(null);

      const result = await service.getApprovalRequest('non-existent');

      expect(result).toBeNull();
    });
  });
});