import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class ApprovalsService {
  constructor(private prisma: PrismaService) {}

  async createApprovalRequest(instanceId: string, nodeId: string, userId: string) {
    return this.prisma.approvalRequest.create({
      data: { instanceId, nodeId, userId },
      include: { user: { select: { id: true, name: true, email: true } } },
    });
  }

  async getPendingApprovals(userId: string) {
    return this.prisma.approvalRequest.findMany({
      where: { userId, decision: null },
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
  }

  async getAllPendingApprovals() {
    return this.prisma.approvalRequest.findMany({
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
  }

  async approve(id: string, comment?: string) {
    return this.prisma.approvalRequest.update({
      where: { id },
      data: { decision: 'APPROVED', comment },
      include: { user: { select: { id: true, name: true, email: true } } },
    });
  }

  async reject(id: string, comment?: string) {
    return this.prisma.approvalRequest.update({
      where: { id },
      data: { decision: 'REJECTED', comment },
      include: { user: { select: { id: true, name: true, email: true } } },
    });
  }

  async getApprovalHistory(instanceId: string) {
    return this.prisma.approvalRequest.findMany({
      where: { instanceId },
      include: { user: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getApprovalRequest(id: string) {
    return this.prisma.approvalRequest.findUnique({
      where: { id },
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
  }
}
