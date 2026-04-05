/**
 * Escalations Service Unit Tests
 */

import { EscalationsService } from '../escalations.service';

describe('EscalationsService', () => {
  let service: EscalationsService;

  const mockPrisma = {
    escalationRule: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    approvalRequest: {
      findUnique: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
    },
    escalationLog: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
    notification: {
      create: jest.fn(),
    },
    workflowInstance: {
      findMany: jest.fn(),
    },
  };

  beforeEach(() => {
    service = new EscalationsService(mockPrisma as any);
    jest.clearAllMocks();
  });

  describe('createRule', () => {
    it('should create an escalation rule', async () => {
      const mockRule = {
        id: 'rule-1',
        workflowId: null,
        nodeType: 'approval',
        timeoutMinutes: 60,
        level1ApproverId: 'manager-1',
        isActive: true,
      };

      mockPrisma.escalationRule.create.mockResolvedValue(mockRule);

      const result = await service.createRule({
        nodeType: 'approval',
        timeoutMinutes: 60,
        level1ApproverId: 'manager-1',
      });

      expect(result).toEqual(mockRule);
      expect(mockPrisma.escalationRule.create).toHaveBeenCalledWith({
        data: {
          workflowId: undefined,
          nodeType: 'approval',
          timeoutMinutes: 60,
          level1ApproverId: 'manager-1',
          level2ApproverId: undefined,
          level3ApproverId: undefined,
          isActive: true,
        },
      });
    });
  });

  describe('getRules', () => {
    it('should return all active escalation rules', async () => {
      const mockRules = [
        { id: 'rule-1', nodeType: 'approval', timeoutMinutes: 60 },
        { id: 'rule-2', nodeType: 'approval', timeoutMinutes: 120 },
      ];

      mockPrisma.escalationRule.findMany.mockResolvedValue(mockRules);

      const result = await service.getRules();

      expect(result).toEqual(mockRules);
      expect(mockPrisma.escalationRule.findMany).toHaveBeenCalledWith({
        where: { isActive: true },
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('getCurrentLevel', () => {
    it('should return 0 when no escalation logs exist', async () => {
      mockPrisma.escalationLog.findMany.mockResolvedValue([]);

      const result = await service.getCurrentLevel('approval-1');

      expect(result).toBe(0);
    });

    it('should return highest level from logs', async () => {
      // Mock returns in desc order (as if Prisma sorted it)
      mockPrisma.escalationLog.findMany.mockResolvedValue([
        { level: 3 },
        { level: 2 },
        { level: 1 },
      ]);

      const result = await service.getCurrentLevel('approval-1');

      expect(result).toBe(3);
    });
  });

  describe('checkAndEscalate', () => {
    it('should return not escalated when request not found', async () => {
      mockPrisma.approvalRequest.findUnique.mockResolvedValue(null);

      const result = await service.checkAndEscalate('approval-999');

      expect(result.escalated).toBe(false);
      expect(result.reason).toBe('Approval request not found');
    });

    it('should return not escalated when already decided', async () => {
      mockPrisma.approvalRequest.findUnique.mockResolvedValue({
        id: 'approval-1',
        decision: 'approved',
        instance: { workflowId: 'wf-1' },
      });

      const result = await service.checkAndEscalate('approval-1');

      expect(result.escalated).toBe(false);
      expect(result.reason).toBe('Already decided');
    });

    it('should escalate when timeout reached', async () => {
      const oldDate = new Date(Date.now() - 1000 * 60 * 120); // 2 hours ago
      mockPrisma.approvalRequest.findUnique.mockResolvedValue({
        id: 'approval-1',
        decision: null,
        userId: 'original-approver',
        createdAt: oldDate,
        instance: {
          workflowId: 'wf-1',
          workflow: {},
        },
      });

      mockPrisma.escalationRule.findFirst.mockResolvedValue({
        id: 'rule-1',
        nodeType: 'approval',
        timeoutMinutes: 60, // 1 hour
        level1ApproverId: 'manager-1',
        level2ApproverId: null,
        level3ApproverId: null,
      });

      mockPrisma.escalationLog.findMany.mockResolvedValue([]);
      mockPrisma.escalationLog.create.mockResolvedValue({});
      mockPrisma.approvalRequest.update.mockResolvedValue({});
      mockPrisma.notification.create.mockResolvedValue({});

      const result = await service.checkAndEscalate('approval-1');

      expect(result.escalated).toBe(true);
      expect(result.newApproverId).toBe('manager-1');
      expect(result.level).toBe(1);
    });

    it('should return not escalated when timeout not reached', async () => {
      const recentDate = new Date(Date.now() - 1000 * 60 * 30); // 30 minutes ago
      mockPrisma.approvalRequest.findUnique.mockResolvedValue({
        id: 'approval-1',
        decision: null,
        userId: 'original-approver',
        createdAt: recentDate,
        instance: { workflowId: 'wf-1' },
      });

      mockPrisma.escalationRule.findFirst.mockResolvedValue({
        timeoutMinutes: 60, // 1 hour
      });

      mockPrisma.escalationLog.findMany.mockResolvedValue([]);

      const result = await service.checkAndEscalate('approval-1');

      expect(result.escalated).toBe(false);
      expect(result.reason).toBe('Timeout not reached');
    });
  });
});
