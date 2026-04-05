/**
 * Escalations Service
 * 
 * Handles approval escalation when timeout is reached
 */

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

export interface CreateEscalationRuleDto {
  workflowId?: string;
  nodeType: string;
  timeoutMinutes: number;
  level1ApproverId?: string;
  level2ApproverId?: string;
  level3ApproverId?: string;
}

export interface UpdateEscalationRuleDto {
  nodeType?: string;
  timeoutMinutes?: number;
  level1ApproverId?: string;
  level2ApproverId?: string;
  level3ApproverId?: string;
  isActive?: boolean;
}

export interface EscalationResult {
  escalated: boolean;
  newApproverId?: string;
  level?: number;
  reason?: string;
}

@Injectable()
export class EscalationsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Create an escalation rule
   */
  async createRule(data: CreateEscalationRuleDto) {
    return this.prisma.escalationRule.create({
      data: {
        workflowId: data.workflowId,
        nodeType: data.nodeType,
        timeoutMinutes: data.timeoutMinutes,
        level1ApproverId: data.level1ApproverId,
        level2ApproverId: data.level2ApproverId,
        level3ApproverId: data.level3ApproverId,
        isActive: true,
      },
    });
  }

  /**
   * Get all escalation rules
   */
  async getRules() {
    return this.prisma.escalationRule.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get escalation rules for a specific workflow
   */
  async getRulesForWorkflow(workflowId: string) {
    return this.prisma.escalationRule.findMany({
      where: { workflowId, isActive: true },
    });
  }

  /**
   * Get rule by ID
   */
  async getRule(id: string) {
    return this.prisma.escalationRule.findUnique({ where: { id } });
  }

  /**
   * Update an escalation rule
   */
  async updateRule(id: string, data: UpdateEscalationRuleDto) {
    return this.prisma.escalationRule.update({
      where: { id },
      data,
    });
  }

  /**
   * Delete an escalation rule
   */
  async deleteRule(id: string) {
    return this.prisma.escalationRule.delete({ where: { id } });
  }

  /**
   * Check if approval request should be escalated and escalate if needed
   */
  async checkAndEscalate(approvalRequestId: string): Promise<EscalationResult> {
    // Get the approval request
    const request = await this.prisma.approvalRequest.findUnique({
      where: { id: approvalRequestId },
      include: {
        instance: {
          include: { workflow: true },
        },
      },
    });

    if (!request) {
      return { escalated: false, reason: 'Approval request not found' };
    }

    if (request.decision) {
      return { escalated: false, reason: 'Already decided' };
    }

    // Get applicable escalation rule
    const rule = await this.prisma.escalationRule.findFirst({
      where: {
        OR: [
          { workflowId: request.instance.workflowId },
          { workflowId: null }, // Global rules
        ],
        nodeType: 'approval',
        isActive: true,
      },
      orderBy: { createdAt: 'desc' }, // Prefer workflow-specific over global
    });

    if (!rule) {
      return { escalated: false, reason: 'No escalation rule configured' };
    }

    // Calculate time since creation
    const now = new Date();
    const createdAt = new Date(request.createdAt);
    const minutesElapsed = (now.getTime() - createdAt.getTime()) / (1000 * 60);

    if (minutesElapsed < rule.timeoutMinutes) {
      return { escalated: false, reason: 'Timeout not reached' };
    }

    // Get current escalation level
    const currentLevel = await this.getCurrentLevel(approvalRequestId);

    // Determine next approver based on level
    const nextApproverId = this.getNextApprover(rule, currentLevel);
    if (!nextApproverId) {
      return { escalated: false, reason: 'No more escalation levels' };
    }

    // Log the escalation
    await this.prisma.escalationLog.create({
      data: {
        instanceId: request.instanceId,
        approvalRequestId,
        level: currentLevel + 1,
        reason: `Timeout after ${rule.timeoutMinutes} minutes`,
        previousApproverId: request.userId,
        newApproverId: nextApproverId,
      },
    });

    // Update approval request to new approver
    await this.prisma.approvalRequest.update({
      where: { id: approvalRequestId },
      data: { userId: nextApproverId },
    });

    // Create notification for new approver
    await this.prisma.notification.create({
      data: {
        userId: nextApproverId,
        type: 'ESCALATION',
        title: 'Escalated Approval',
        message: `An approval has been escalated to you. Original approver: ${request.userId}`,
        data: JSON.stringify({
          approvalRequestId,
          instanceId: request.instanceId,
          previousLevel: currentLevel,
          newLevel: currentLevel + 1,
        }),
      },
    });

    return {
      escalated: true,
      newApproverId: nextApproverId,
      level: currentLevel + 1,
      reason: `Escalated after ${rule.timeoutMinutes} minutes`,
    };
  }

  /**
   * Get current escalation level for an approval request
   */
  async getCurrentLevel(approvalRequestId: string): Promise<number> {
    const logs = await this.prisma.escalationLog.findMany({
      where: { approvalRequestId },
      orderBy: { level: 'desc' },
    });

    if (logs.length === 0) {
      return 0; // Original, not escalated
    }

    return logs[0].level;
  }

  /**
   * Get escalation history for a workflow instance
   */
  async getEscalationHistory(instanceId: string) {
    return this.prisma.escalationLog.findMany({
      where: { instanceId },
      orderBy: { escalatedAt: 'asc' },
    });
  }

  /**
   * Get next approver based on current level and rule
   */
  private getNextApprover(rule: any, currentLevel: number): string | null {
    switch (currentLevel) {
      case 0:
        return rule.level1ApproverId;
      case 1:
        return rule.level2ApproverId;
      case 2:
        return rule.level3ApproverId;
      default:
        return null;
    }
  }

  /**
   * Find all pending approvals that need escalation
   * This would be called by a cron job
   */
  async findPendingEscalations() {
    const rules = await this.prisma.escalationRule.findMany({
      where: { isActive: true },
    });

    const pendingRequests = await this.prisma.approvalRequest.findMany({
      where: {
        decision: null, // Not yet decided
      },
      include: {
        instance: true,
      },
    });

    const now = new Date();
    const escalationsNeeded: string[] = [];

    for (const request of pendingRequests) {
      const rule = rules.find(
        r => r.workflowId === request.instance.workflowId || r.workflowId === null
      );

      if (!rule) continue;

      const createdAt = new Date(request.createdAt);
      const minutesElapsed = (now.getTime() - createdAt.getTime()) / (1000 * 60);

      if (minutesElapsed >= rule.timeoutMinutes) {
        const currentLevel = await this.getCurrentLevel(request.id);
        const nextApprover = this.getNextApprover(rule, currentLevel);

        if (nextApprover) {
          escalationsNeeded.push(request.id);
        }
      }
    }

    return escalationsNeeded;
  }
}
