import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class NotificationsService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, type: string, title: string, message: string, data?: any) {
    return this.prisma.notification.create({
      data: { userId, type, title, message, data: data ? JSON.stringify(data) : null },
    });
  }

  async getForUser(userId: string) {
    const notifications = await this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
    return notifications.map(n => ({
      ...n,
      data: n.data ? JSON.parse(n.data as string) : null,
    }));
  }

  async markAsRead(id: string) {
    return this.prisma.notification.update({
      where: { id },
      data: { isRead: true },
    });
  }

  async markAllAsRead(userId: string) {
    return this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
  }

  async getUnreadCount(userId: string) {
    return this.prisma.notification.count({
      where: { userId, isRead: false },
    });
  }

  async delete(id: string) {
    return this.prisma.notification.delete({ where: { id } });
  }

  // Helper methods for common notification types
  async notifyWorkflowStarted(userId: string, workflowName: string, instanceId: string) {
    return this.create(
      userId,
      'WORKFLOW_STARTED',
      'Workflow Started',
      `Your workflow "${workflowName}" has been started.`,
      { instanceId },
    );
  }

  async notifyWorkflowCompleted(userId: string, workflowName: string, instanceId: string) {
    return this.create(
      userId,
      'WORKFLOW_COMPLETED',
      'Workflow Completed',
      `Your workflow "${workflowName}" has been completed.`,
      { instanceId },
    );
  }

  async notifyApprovalRequired(userId: string, workflowName: string, requesterName: string, instanceId: string) {
    return this.create(
      userId,
      'APPROVAL_REQUIRED',
      'Approval Required',
      `${requesterName} is requesting your approval for "${workflowName}".`,
      { instanceId },
    );
  }

  async notifyApprovalGranted(userId: string, workflowName: string, instanceId: string) {
    return this.create(
      userId,
      'APPROVAL_GRANTED',
      'Request Approved',
      `Your request "${workflowName}" has been approved.`,
      { instanceId },
    );
  }

  async notifyApprovalRejected(userId: string, workflowName: string, instanceId: string, comment?: string) {
    return this.create(
      userId,
      'APPROVAL_REJECTED',
      'Request Rejected',
      `Your request "${workflowName}" has been rejected.${comment ? ` Reason: ${comment}` : ''}`,
      { instanceId },
    );
  }
}
