/**
 * Delegation Service
 * 
 * Handles delegation of approval authority
 */

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

export interface CreateDelegationDto {
  delegateId: string;
  reason?: string;
  startDate: Date;
  endDate: Date;
}

export interface UpdateDelegationDto {
  reason?: string;
  startDate?: Date;
  endDate?: Date;
  isActive?: boolean;
}

@Injectable()
export class DelegationsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Create a new delegation
   */
  async create(userId: string, data: CreateDelegationDto) {
    return this.prisma.delegation.create({
      data: {
        delegatorId: userId,
        delegateId: data.delegateId,
        reason: data.reason,
        startDate: data.startDate,
        endDate: data.endDate,
        isActive: true,
      },
      include: {
        delegate: {
          select: { id: true, name: true, email: true },
        },
      },
    });
  }

  /**
   * List delegations where user is the delegator (they delegated to someone)
   */
  async getMyDelegations(userId: string) {
    return this.prisma.delegation.findMany({
      where: { delegatorId: userId },
      include: {
        delegate: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * List delegations where user is the delegate (someone delegated to them)
   */
  async getDelegationsToMe(userId: string) {
    return this.prisma.delegation.findMany({
      where: {
        delegateId: userId,
        isActive: true,
        startDate: { lte: new Date() },
        endDate: { gte: new Date() },
      },
      include: {
        delegator: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Check if user can approve on behalf of another user
   */
  async canApproveOnBehalf(approverId: string, originalApproverId: string): Promise<boolean> {
    // Same user - can always approve their own
    if (approverId === originalApproverId) {
      return true;
    }

    // Check for active delegation
    const delegation = await this.prisma.delegation.findFirst({
      where: {
        delegatorId: originalApproverId,
        delegateId: approverId,
        isActive: true,
        startDate: { lte: new Date() },
        endDate: { gte: new Date() },
      },
    });

    return !!delegation;
  }

  /**
   * Get active delegation from one user to another
   */
  async getActiveDelegation(delegatorId: string, delegateId: string) {
    return this.prisma.delegation.findFirst({
      where: {
        delegatorId,
        delegateId,
        isActive: true,
        startDate: { lte: new Date() },
        endDate: { gte: new Date() },
      },
    });
  }

  /**
   * Update a delegation
   */
  async update(id: string, userId: string, data: UpdateDelegationDto) {
    // Verify ownership
    const delegation = await this.prisma.delegation.findFirst({
      where: { id, delegatorId: userId },
    });

    if (!delegation) {
      throw new Error('Delegation not found or access denied');
    }

    return this.prisma.delegation.update({
      where: { id },
      data,
    });
  }

  /**
   * Delete a delegation
   */
  async delete(id: string, userId: string) {
    // Verify ownership
    const delegation = await this.prisma.delegation.findFirst({
      where: { id, delegatorId: userId },
    });

    if (!delegation) {
      throw new Error('Delegation not found or access denied');
    }

    return this.prisma.delegation.delete({ where: { id } });
  }

  /**
   * Get all pending approvals visible to a delegate
   */
  async getPendingApprovalsForDelegate(delegateId: string) {
    // Get all delegations where this user is the delegate
    const delegations = await this.getDelegationsToMe(delegateId);

    if (delegations.length === 0) {
      return [];
    }

    const delegatorIds = delegations.map(d => d.delegatorId);

    // Get pending approval requests for those delegators
    return this.prisma.approvalRequest.findMany({
      where: {
        userId: { in: delegatorIds },
        decision: null, // Not yet decided
      },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
        instance: {
          select: { id: true, workflowId: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
