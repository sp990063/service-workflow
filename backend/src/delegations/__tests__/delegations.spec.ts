/**
 * Delegations Service Unit Tests
 */

import { DelegationsService } from '../delegations.service';

describe('DelegationsService', () => {
  let service: DelegationsService;

  const mockPrisma = {
    delegation: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    approvalRequest: {
      findMany: jest.fn(),
    },
  };

  beforeEach(() => {
    service = new DelegationsService(mockPrisma as any);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a delegation', async () => {
      const mockDelegation = {
        id: 'delegation-1',
        delegatorId: 'user-1',
        delegateId: 'user-2',
        reason: 'Vacation',
        startDate: new Date('2026-04-01'),
        endDate: new Date('2026-04-15'),
        isActive: true,
      };

      mockPrisma.delegation.create.mockResolvedValue(mockDelegation);

      const result = await service.create('user-1', {
        delegateId: 'user-2',
        reason: 'Vacation',
        startDate: new Date('2026-04-01'),
        endDate: new Date('2026-04-15'),
      });

      expect(result).toEqual(mockDelegation);
      expect(mockPrisma.delegation.create).toHaveBeenCalledWith({
        data: {
          delegatorId: 'user-1',
          delegateId: 'user-2',
          reason: 'Vacation',
          startDate: new Date('2026-04-01'),
          endDate: new Date('2026-04-15'),
          isActive: true,
        },
        include: expect.any(Object),
      });
    });
  });

  describe('canApproveOnBehalf', () => {
    it('should return true if same user', async () => {
      const result = await service.canApproveOnBehalf('user-1', 'user-1');
      expect(result).toBe(true);
      expect(mockPrisma.delegation.findFirst).not.toHaveBeenCalled();
    });

    it('should return true if active delegation exists', async () => {
      mockPrisma.delegation.findFirst.mockResolvedValue({
        id: 'delegation-1',
        isActive: true,
      });

      const result = await service.canApproveOnBehalf('user-2', 'user-1');
      expect(result).toBe(true);
    });

    it('should return false if no delegation exists', async () => {
      mockPrisma.delegation.findFirst.mockResolvedValue(null);

      const result = await service.canApproveOnBehalf('user-2', 'user-1');
      expect(result).toBe(false);
    });
  });

  describe('getMyDelegations', () => {
    it('should return delegations where user is delegator', async () => {
      const mockDelegations = [
        { id: 'delegation-1', delegatorId: 'user-1', delegateId: 'user-2' },
        { id: 'delegation-2', delegatorId: 'user-1', delegateId: 'user-3' },
      ];

      mockPrisma.delegation.findMany.mockResolvedValue(mockDelegations);

      const result = await service.getMyDelegations('user-1');

      expect(result).toEqual(mockDelegations);
      expect(mockPrisma.delegation.findMany).toHaveBeenCalledWith({
        where: { delegatorId: 'user-1' },
        include: expect.any(Object),
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('getDelegationsToMe', () => {
    it('should return active delegations where user is delegate', async () => {
      const mockDelegations = [
        { id: 'delegation-1', delegatorId: 'user-1', delegateId: 'user-2' },
      ];

      mockPrisma.delegation.findMany.mockResolvedValue(mockDelegations);

      const result = await service.getDelegationsToMe('user-2');

      expect(result).toEqual(mockDelegations);
      expect(mockPrisma.delegation.findMany).toHaveBeenCalledWith({
        where: {
          delegateId: 'user-2',
          isActive: true,
          startDate: { lte: expect.any(Date) },
          endDate: { gte: expect.any(Date) },
        },
        include: expect.any(Object),
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('delete', () => {
    it('should delete delegation if user is owner', async () => {
      mockPrisma.delegation.findFirst.mockResolvedValue({ id: 'delegation-1' });
      mockPrisma.delegation.delete.mockResolvedValue({ id: 'delegation-1' });

      await service.delete('delegation-1', 'user-1');

      expect(mockPrisma.delegation.delete).toHaveBeenCalledWith({
        where: { id: 'delegation-1' },
      });
    });

    it('should throw error if delegation not found', async () => {
      mockPrisma.delegation.findFirst.mockResolvedValue(null);

      await expect(service.delete('delegation-999', 'user-1'))
        .rejects.toThrow('Delegation not found or access denied');
    });
  });
});
