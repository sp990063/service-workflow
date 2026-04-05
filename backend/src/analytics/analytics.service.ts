/**
 * Analytics Service
 * 
 * Provides workflow and approval statistics
 */

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Get overview statistics for dashboard
   */
  async getOverview() {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Total workflows
    const totalWorkflows = await this.prisma.workflow.count({
      where: { isActive: true },
    });

    // Active instances (in progress)
    const activeInstances = await this.prisma.workflowInstance.count({
      where: { status: 'IN_PROGRESS' },
    });

    // Completed today
    const completedToday = await this.prisma.workflowInstance.count({
      where: {
        status: 'COMPLETED',
        updatedAt: { gte: todayStart },
      },
    });

    // Calculate average approval time (from instances with history)
    const recentInstances = await this.prisma.workflowInstance.findMany({
      where: {
        status: { in: ['COMPLETED', 'REJECTED'] },
        updatedAt: { gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) }, // Last 30 days
      },
      select: { createdAt: true, updatedAt: true },
    });

    let averageApprovalTime = 0;
    if (recentInstances.length > 0) {
      const totalTime = recentInstances.reduce((acc, inst) => {
        const duration = new Date(inst.updatedAt).getTime() - new Date(inst.createdAt).getTime();
        return acc + duration;
      }, 0);
      averageApprovalTime = Math.round(totalTime / recentInstances.length / (1000 * 60)); // In minutes
    }

    return {
      totalWorkflows,
      activeInstances,
      completedToday,
      averageApprovalTime,
      totalInstances: recentInstances.length,
    };
  }

  /**
   * Get statistics for a specific workflow
   */
  async getWorkflowStats(workflowId: string) {
    const instances = await this.prisma.workflowInstance.findMany({
      where: { workflowId },
      select: { status: true, createdAt: true, updatedAt: true },
    });

    const completed = instances.filter(i => i.status === 'COMPLETED').length;
    const rejected = instances.filter(i => i.status === 'REJECTED').length;

    let averageDuration = 0;
    if (instances.length > 0) {
      const totalDuration = instances.reduce((acc, inst) => {
        if (inst.status !== 'IN_PROGRESS') {
          const duration = new Date(inst.updatedAt).getTime() - new Date(inst.createdAt).getTime();
          return acc + duration;
        }
        return acc;
      }, 0);
      const completedCount = instances.filter(i => i.status !== 'IN_PROGRESS').length;
      if (completedCount > 0) {
        averageDuration = Math.round(totalDuration / completedCount / (1000 * 60)); // In minutes
      }
    }

    return {
      totalInstances: instances.length,
      completed,
      rejected,
      inProgress: instances.length - completed - rejected,
      averageDuration,
      completionRate: instances.length > 0 ? Math.round((completed / instances.length) * 100) : 0,
    };
  }

  /**
   * Get most used workflows
   */
  async getMostUsedWorkflows(limit: number = 10) {
    const workflows = await this.prisma.workflow.findMany({
      where: { isActive: true },
      include: {
        _count: {
          select: { instances: true },
        },
      },
      orderBy: {
        instances: {
          _count: 'desc',
        },
      },
      take: limit,
    });

    return workflows.map(w => ({
      id: w.id,
      name: w.name,
      description: w.description,
      instanceCount: w._count.instances,
    }));
  }

  /**
   * Get approval time trends (daily average for last N days)
   */
  async getApprovalTimeTrends(days: number = 7) {
    const now = new Date();
    const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

    const instances = await this.prisma.workflowInstance.findMany({
      where: {
        status: { in: ['COMPLETED', 'REJECTED'] },
        updatedAt: { gte: startDate },
      },
      select: {
        createdAt: true,
        updatedAt: true,
      },
    });

    // Group by day
    const dailyStats: Record<string, { count: number; totalTime: number }> = {};

    for (const inst of instances) {
      const day = new Date(inst.updatedAt).toISOString().split('T')[0];
      if (!dailyStats[day]) {
        dailyStats[day] = { count: 0, totalTime: 0 };
      }
      const duration = new Date(inst.updatedAt).getTime() - new Date(inst.createdAt).getTime();
      dailyStats[day].count++;
      dailyStats[day].totalTime += duration;
    }

    return Object.entries(dailyStats)
      .map(([date, stats]) => ({
        date,
        count: stats.count,
        averageTimeMinutes: Math.round(stats.totalTime / stats.count / (1000 * 60)),
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  /**
   * Get user-specific statistics
   */
  async getUserStats(userId: string) {
    // Workflows created by user
    const workflowsCreated = await this.prisma.workflow.count({
      where: { userId },
    });

    // Instances where user is the initiator
    const instancesStarted = await this.prisma.workflowInstance.count({
      where: { userId },
    });

    // Approval requests assigned to user
    const pendingApprovals = await this.prisma.approvalRequest.count({
      where: {
        userId,
        decision: null,
      },
    });

    // Approvals completed by user
    const approvalsCompleted = await this.prisma.approvalRequest.count({
      where: {
        userId,
        decision: { not: null },
      },
    });

    return {
      workflowsCreated,
      instancesStarted,
      pendingApprovals,
      approvalsCompleted,
    };
  }
}
