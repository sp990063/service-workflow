import { Test, TestingModule } from '@nestjs/testing';
import { DelegationsController } from '../delegations.controller';
import { DelegationsService } from '../delegations.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

describe('DelegationsController', () => {
  let controller: DelegationsController;
  let mockDelegationsService: any;

  const mockDelegation = {
    id: 'deleg-123',
    userId: 'user-123',
    delegateId: 'delegate-456',
    reason: 'On vacation',
    startDate: new Date('2026-04-01'),
    endDate: new Date('2026-04-15'),
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    mockDelegationsService = {
      create: jest.fn().mockResolvedValue(mockDelegation),
      getMyDelegations: jest.fn().mockResolvedValue([mockDelegation]),
      getDelegationsToMe: jest.fn().mockResolvedValue([mockDelegation]),
      getPendingApprovalsForDelegate: jest.fn().mockResolvedValue([]),
      canApproveOnBehalf: jest.fn().mockResolvedValue(true),
      update: jest.fn().mockResolvedValue(mockDelegation),
      delete: jest.fn().mockResolvedValue({ id: 'deleg-123' }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [DelegationsController],
      providers: [
        { provide: DelegationsService, useValue: mockDelegationsService },
      ],
    })
      .overrideGuard(JwtAuthGuard).useValue({
        canActivate: (context) => {
          const request = context.switchToHttp().getRequest();
          request.user = { id: 'user-123', role: 'USER' };
          return true;
        },
      })
      .compile();

    controller = module.get<DelegationsController>(DelegationsController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a delegation', async () => {
      const body = {
        delegateId: 'delegate-456',
        reason: 'On vacation',
        startDate: '2026-04-01',
        endDate: '2026-04-15',
      };

      const result = await controller.create('user-123', body);

      expect(result).toEqual(mockDelegation);
      expect(mockDelegationsService.create).toHaveBeenCalledWith('user-123', {
        delegateId: 'delegate-456',
        reason: 'On vacation',
        startDate: expect.any(Date),
        endDate: expect.any(Date),
      });
    });
  });

  describe('getMyDelegations', () => {
    it('should return delegations created by user', async () => {
      const result = await controller.getMyDelegations('user-123');

      expect(result).toEqual([mockDelegation]);
      expect(mockDelegationsService.getMyDelegations).toHaveBeenCalledWith('user-123');
    });

    it('should return empty array when no delegations exist', async () => {
      mockDelegationsService.getMyDelegations.mockResolvedValue([]);
      const result = await controller.getMyDelegations('user-123');

      expect(result).toEqual([]);
    });
  });

  describe('getDelegationsToMe', () => {
    it('should return delegations to the user', async () => {
      const result = await controller.getDelegationsToMe('user-123');

      expect(result).toEqual([mockDelegation]);
      expect(mockDelegationsService.getDelegationsToMe).toHaveBeenCalledWith('user-123');
    });
  });

  describe('getPendingApprovals', () => {
    it('should return pending approvals for delegate', async () => {
      const result = await controller.getPendingApprovals('user-123');

      expect(result).toEqual([]);
      expect(mockDelegationsService.getPendingApprovalsForDelegate).toHaveBeenCalledWith('user-123');
    });
  });

  describe('canApprove', () => {
    it('should return true when user can approve on behalf', async () => {
      const result = await controller.canApprove('user-123', 'original-approver');

      expect(result).toBe(true);
      expect(mockDelegationsService.canApproveOnBehalf).toHaveBeenCalledWith('user-123', 'original-approver');
    });

    it('should return false when user cannot approve on behalf', async () => {
      mockDelegationsService.canApproveOnBehalf.mockResolvedValue(false);
      const result = await controller.canApprove('user-123', 'original-approver');

      expect(result).toBe(false);
    });
  });

  describe('update', () => {
    it('should update a delegation', async () => {
      const body = { reason: 'Updated reason' };

      const result = await controller.update('deleg-123', 'user-123', body);

      expect(result).toEqual(mockDelegation);
      expect(mockDelegationsService.update).toHaveBeenCalledWith('deleg-123', 'user-123', {
        reason: 'Updated reason',
        startDate: undefined,
        endDate: undefined,
        isActive: undefined,
      });
    });

    it('should throw error when updating non-existent delegation', async () => {
      mockDelegationsService.update.mockRejectedValue(new Error('Delegation not found'));

      await expect(controller.update('non-existent', 'user-123', {}))
        .rejects.toThrow('Delegation not found');
    });
  });

  describe('delete', () => {
    it('should delete a delegation', async () => {
      const result = await controller.delete('deleg-123', 'user-123');

      expect(result).toEqual({ id: 'deleg-123' });
      expect(mockDelegationsService.delete).toHaveBeenCalledWith('deleg-123', 'user-123');
    });

    it('should throw error when deleting non-existent delegation', async () => {
      mockDelegationsService.delete.mockRejectedValue(new Error('Delegation not found'));

      await expect(controller.delete('non-existent', 'user-123'))
        .rejects.toThrow('Delegation not found');
    });
  });
});
