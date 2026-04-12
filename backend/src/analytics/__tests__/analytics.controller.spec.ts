import { Test, TestingModule } from '@nestjs/testing';
import { AnalyticsController } from '../analytics.controller';
import { AnalyticsService } from '../analytics.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';

describe('AnalyticsController', () => {
  let controller: AnalyticsController;
  let mockAnalyticsService: any;

  const mockOverview = {
    totalWorkflows: 10,
    activeInstances: 25,
    pendingApprovals: 5,
    completedToday: 3,
  };

  const mockWorkflowStats = {
    workflowId: 'wf-123',
    totalInstances: 50,
    completedInstances: 45,
    pendingInstances: 5,
    averageCompletionTime: 120,
  };

  const mockMostUsed = [
    { id: 'wf-1', name: 'Workflow 1', instanceCount: 10 },
    { id: 'wf-2', name: 'Workflow 2', instanceCount: 5 },
  ];

  const mockApprovalTrends = [
    { date: '2026-04-01', count: 10, averageTimeMinutes: 30 },
    { date: '2026-04-02', count: 15, averageTimeMinutes: 45 },
  ];

  const mockUserStats = {
    userId: 'user-123',
    workflowsCreated: 5,
    approvalsGiven: 20,
    approvalsReceived: 10,
  };

  beforeEach(async () => {
    mockAnalyticsService = {
      getOverview: jest.fn().mockResolvedValue(mockOverview),
      getWorkflowStats: jest.fn().mockResolvedValue(mockWorkflowStats),
      getMostUsedWorkflows: jest.fn().mockResolvedValue(mockMostUsed),
      getApprovalTimeTrends: jest.fn().mockResolvedValue(mockApprovalTrends),
      getUserStats: jest.fn().mockResolvedValue(mockUserStats),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AnalyticsController],
      providers: [
        { provide: AnalyticsService, useValue: mockAnalyticsService },
      ],
    })
      .overrideGuard(JwtAuthGuard).useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard).useValue({ canActivate: () => true })
      .compile();

    controller = module.get<AnalyticsController>(AnalyticsController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getOverview', () => {
    it('should return overview statistics', async () => {
      const result = await controller.getOverview();

      expect(result).toEqual(mockOverview);
      expect(mockAnalyticsService.getOverview).toHaveBeenCalled();
    });
  });

  describe('getWorkflowStats', () => {
    it('should return workflow-specific statistics', async () => {
      const result = await controller.getWorkflowStats('wf-123');

      expect(result).toEqual(mockWorkflowStats);
      expect(mockAnalyticsService.getWorkflowStats).toHaveBeenCalledWith('wf-123');
    });
  });

  describe('getMostUsedWorkflows', () => {
    it('should return most used workflows with default limit', async () => {
      const result = await controller.getMostUsedWorkflows(undefined);

      expect(result).toEqual(mockMostUsed);
      expect(mockAnalyticsService.getMostUsedWorkflows).toHaveBeenCalledWith(10);
    });

    it('should return most used workflows with custom limit', async () => {
      const result = await controller.getMostUsedWorkflows('5');

      expect(result).toEqual(mockMostUsed);
      expect(mockAnalyticsService.getMostUsedWorkflows).toHaveBeenCalledWith(5);
    });
  });

  describe('getApprovalTimes', () => {
    it('should return approval time trends with default days', async () => {
      const result = await controller.getApprovalTimes(undefined);

      expect(result).toEqual(mockApprovalTrends);
      expect(mockAnalyticsService.getApprovalTimeTrends).toHaveBeenCalledWith(7);
    });

    it('should return approval time trends with custom days', async () => {
      const result = await controller.getApprovalTimes('30');

      expect(result).toEqual(mockApprovalTrends);
      expect(mockAnalyticsService.getApprovalTimeTrends).toHaveBeenCalledWith(30);
    });
  });

  describe('getUserStats', () => {
    it('should return user statistics', async () => {
      const result = await controller.getUserStats('user-123');

      expect(result).toEqual(mockUserStats);
      expect(mockAnalyticsService.getUserStats).toHaveBeenCalledWith('user-123');
    });
  });
});
