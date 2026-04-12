import { Test, TestingModule } from '@nestjs/testing';
import { ApprovalsController } from '../approvals.controller';
import { ApprovalsService } from '../approvals.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

describe('ApprovalsController', () => {
  let controller: ApprovalsController;
  let mockApprovalsService: any;

  const mockApproval = {
    id: 'approval-123',
    instanceId: 'inst-123',
    nodeId: 'node-1',
    userId: 'user-123',
    status: 'PENDING',
    comment: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    mockApprovalsService = {
      getPendingApprovals: jest.fn().mockResolvedValue([mockApproval]),
      getAllPendingApprovals: jest.fn().mockResolvedValue([mockApproval]),
      getApprovalRequest: jest.fn().mockResolvedValue(mockApproval),
      createApprovalRequest: jest.fn().mockResolvedValue(mockApproval),
      approve: jest.fn().mockResolvedValue(mockApproval),
      reject: jest.fn().mockResolvedValue(mockApproval),
      getApprovalHistory: jest.fn().mockResolvedValue([mockApproval]),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ApprovalsController],
      providers: [
        { provide: ApprovalsService, useValue: mockApprovalsService },
      ],
    })
      .overrideGuard(JwtAuthGuard).useValue({ canActivate: () => true })
      .compile();

    controller = module.get<ApprovalsController>(ApprovalsController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getPending', () => {
    it('should return pending approvals for a specific user', async () => {
      const result = await controller.getPending('user-123');

      expect(result).toEqual([mockApproval]);
      expect(mockApprovalsService.getPendingApprovals).toHaveBeenCalledWith('user-123');
    });

    it('should return all pending approvals when no userId provided', async () => {
      const result = await controller.getPending(undefined);

      expect(result).toEqual([mockApproval]);
      expect(mockApprovalsService.getAllPendingApprovals).toHaveBeenCalled();
    });
  });

  describe('getApproval', () => {
    it('should return an approval by id', async () => {
      const result = await controller.getApproval('approval-123');

      expect(result).toEqual(mockApproval);
      expect(mockApprovalsService.getApprovalRequest).toHaveBeenCalledWith('approval-123');
    });
  });

  describe('create', () => {
    it('should create an approval request', async () => {
      const body = {
        instanceId: 'inst-123',
        nodeId: 'node-1',
        userId: 'user-123',
      };

      const result = await controller.create(body);

      expect(result).toEqual(mockApproval);
      expect(mockApprovalsService.createApprovalRequest).toHaveBeenCalledWith(
        'inst-123',
        'node-1',
        'user-123',
      );
    });
  });

  describe('approve', () => {
    it('should approve a request', async () => {
      const body = { comment: 'Looks good' };

      const result = await controller.approve('approval-123', body);

      expect(result).toEqual(mockApproval);
      expect(mockApprovalsService.approve).toHaveBeenCalledWith('approval-123', 'Looks good');
    });

    it('should approve without comment', async () => {
      const result = await controller.approve('approval-123', {});

      expect(result).toEqual(mockApproval);
      expect(mockApprovalsService.approve).toHaveBeenCalledWith('approval-123', undefined);
    });
  });

  describe('reject', () => {
    it('should reject a request', async () => {
      const body = { comment: 'Not approved' };

      const result = await controller.reject('approval-123', body);

      expect(result).toEqual(mockApproval);
      expect(mockApprovalsService.reject).toHaveBeenCalledWith('approval-123', 'Not approved');
    });
  });

  describe('getHistory', () => {
    it('should return approval history for an instance', async () => {
      const result = await controller.getHistory('inst-123');

      expect(result).toEqual([mockApproval]);
      expect(mockApprovalsService.getApprovalHistory).toHaveBeenCalledWith('inst-123');
    });
  });
});
