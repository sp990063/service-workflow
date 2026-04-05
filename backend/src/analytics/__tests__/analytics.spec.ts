/**
 * Analytics Service Unit Tests
 */

import { AnalyticsService } from '../analytics.service';

describe('AnalyticsService', () => {
  let service: AnalyticsService;

  const mockPrisma = {
    workflow: { count: jest.fn(), findMany: jest.fn() },
    workflowInstance: { count: jest.fn(), findMany: jest.fn() },
    approvalRequest: { count: jest.fn() },
  };

  beforeEach(() => {
    service = new AnalyticsService(mockPrisma as any);
    jest.clearAllMocks();
  });

  describe('getOverview', () => {
    it('should return overview statistics', async () => {
      mockPrisma.workflow.count.mockResolvedValue(10);
      mockPrisma.workflowInstance.count.mockResolvedValue(5);
      mockPrisma.workflowInstance.findMany.mockResolvedValue([
        { createdAt: new Date('2026-04-01'), updatedAt: new Date('2026-04-01T01:00:00') },
        { createdAt: new Date('2026-04-01'), updatedAt: new Date('2026-04-01T02:00:00') },
      ]);

      const result = await service.getOverview();

      expect(result.totalWorkflows).toBe(10);
      expect(result.activeInstances).toBe(5);
      expect(result.completedToday).toBe(5);
    });
  });

  describe('getWorkflowStats', () => {
    it('should return workflow-specific statistics', async () => {
      mockPrisma.workflowInstance.findMany.mockResolvedValue([
        { status: 'COMPLETED', createdAt: new Date(), updatedAt: new Date() },
        { status: 'COMPLETED', createdAt: new Date(), updatedAt: new Date() },
        { status: 'REJECTED', createdAt: new Date(), updatedAt: new Date() },
      ]);

      const result = await service.getWorkflowStats('workflow-1');

      expect(result.totalInstances).toBe(3);
      expect(result.completed).toBe(2);
      expect(result.rejected).toBe(1);
      expect(result.completionRate).toBe(67);
    });
  });

  describe('getMostUsedWorkflows', () => {
    it('should return most used workflows', async () => {
      mockPrisma.workflow.findMany.mockResolvedValue([
        { id: 'wf-1', name: 'Workflow 1', _count: { instances: 10 } },
        { id: 'wf-2', name: 'Workflow 2', _count: { instances: 5 } },
      ]);

      const result = await service.getMostUsedWorkflows(2);

      expect(result).toHaveLength(2);
      expect(result[0].instanceCount).toBe(10);
      expect(result[1].instanceCount).toBe(5);
    });
  });

  describe('getUserStats', () => {
    it('should return user statistics', async () => {
      mockPrisma.workflow.count.mockResolvedValue(5);
      mockPrisma.workflowInstance.count.mockResolvedValue(20);
      mockPrisma.approvalRequest.count.mockResolvedValue(3);

      const result = await service.getUserStats('user-1');

      expect(result.workflowsCreated).toBe(5);
      expect(result.instancesStarted).toBe(20);
      expect(result.pendingApprovals).toBe(3);
    });
  });
});
