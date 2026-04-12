import { Test, TestingModule } from '@nestjs/testing';
import { NotificationsService } from './notifications.service';
import { PrismaService } from '../prisma.service';

describe('NotificationsService', () => {
  let service: NotificationsService;
  let mockPrisma: any;

  const mockNotification = {
    id: 'notif-123',
    userId: 'user-123',
    type: 'WORKFLOW_STARTED',
    title: 'Workflow Started',
    message: 'Your workflow "Test Workflow" has been started.',
    data: '{"instanceId":"inst-123"}',
    isRead: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    mockPrisma = {
      notification: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
        count: jest.fn(),
        delete: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a notification with stringified data', async () => {
      const createdNotification = { ...mockNotification };
      mockPrisma.notification.create.mockResolvedValue(createdNotification);

      const result = await service.create('user-123', 'WORKFLOW_STARTED', 'Workflow Started', 'Message', { instanceId: 'inst-123' });

      expect(result).toEqual(createdNotification);
      expect(mockPrisma.notification.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-123',
          type: 'WORKFLOW_STARTED',
          title: 'Workflow Started',
          message: 'Message',
          data: '{"instanceId":"inst-123"}',
        },
      });
    });

    it('should create notification without data', async () => {
      mockPrisma.notification.create.mockResolvedValue(mockNotification);

      const result = await service.create('user-123', 'WORKFLOW_STARTED', 'Workflow Started', 'Message');

      expect(mockPrisma.notification.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-123',
          type: 'WORKFLOW_STARTED',
          title: 'Workflow Started',
          message: 'Message',
          data: null,
        },
      });
    });
  });

  describe('getForUser', () => {
    it('should return notifications with parsed data', async () => {
      const notifications = [
        { ...mockNotification, data: '{"instanceId":"inst-123"}' },
        { ...mockNotification, id: 'notif-456', data: null },
      ];
      mockPrisma.notification.findMany.mockResolvedValue(notifications);

      const result = await service.getForUser('user-123');

      expect(result).toHaveLength(2);
      expect(result[0].data).toEqual({ instanceId: 'inst-123' });
      expect(result[1].data).toBeNull();
    });

    it('should order notifications by createdAt descending', async () => {
      mockPrisma.notification.findMany.mockResolvedValue([]);

      await service.getForUser('user-123');

      expect(mockPrisma.notification.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-123' },
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('markAsRead', () => {
    it('should update notification to read', async () => {
      const updatedNotification = { ...mockNotification, isRead: true };
      mockPrisma.notification.update.mockResolvedValue(updatedNotification);

      const result = await service.markAsRead('notif-123');

      expect(result).toEqual(updatedNotification);
      expect(mockPrisma.notification.update).toHaveBeenCalledWith({
        where: { id: 'notif-123' },
        data: { isRead: true },
      });
    });
  });

  describe('markAllAsRead', () => {
    it('should mark all user notifications as read', async () => {
      mockPrisma.notification.updateMany.mockResolvedValue({ count: 5 });

      const result = await service.markAllAsRead('user-123');

      expect(result).toEqual({ count: 5 });
      expect(mockPrisma.notification.updateMany).toHaveBeenCalledWith({
        where: { userId: 'user-123', isRead: false },
        data: { isRead: true },
      });
    });
  });

  describe('getUnreadCount', () => {
    it('should return count of unread notifications', async () => {
      mockPrisma.notification.count.mockResolvedValue(3);

      const result = await service.getUnreadCount('user-123');

      expect(result).toBe(3);
      expect(mockPrisma.notification.count).toHaveBeenCalledWith({
        where: { userId: 'user-123', isRead: false },
      });
    });
  });

  describe('delete', () => {
    it('should delete a notification', async () => {
      mockPrisma.notification.delete.mockResolvedValue(mockNotification);

      const result = await service.delete('notif-123');

      expect(result).toEqual(mockNotification);
      expect(mockPrisma.notification.delete).toHaveBeenCalledWith({
        where: { id: 'notif-123' },
      });
    });
  });

  describe('notifyWorkflowStarted', () => {
    it('should create WORKFLOW_STARTED notification', async () => {
      mockPrisma.notification.create.mockResolvedValue(mockNotification);

      await service.notifyWorkflowStarted('user-123', 'Test Workflow', 'inst-123');

      expect(mockPrisma.notification.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'user-123',
          type: 'WORKFLOW_STARTED',
          title: 'Workflow Started',
          message: 'Your workflow "Test Workflow" has been started.',
          data: expect.stringContaining('inst-123'),
        }),
      });
    });
  });

  describe('notifyWorkflowCompleted', () => {
    it('should create WORKFLOW_COMPLETED notification', async () => {
      mockPrisma.notification.create.mockResolvedValue(mockNotification);

      await service.notifyWorkflowCompleted('user-123', 'Test Workflow', 'inst-123');

      expect(mockPrisma.notification.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'user-123',
          type: 'WORKFLOW_COMPLETED',
          title: 'Workflow Completed',
        }),
      });
    });
  });

  describe('notifyApprovalRequired', () => {
    it('should create APPROVAL_REQUIRED notification', async () => {
      mockPrisma.notification.create.mockResolvedValue(mockNotification);

      await service.notifyApprovalRequired('user-123', 'Test Workflow', 'John Doe', 'inst-123');

      expect(mockPrisma.notification.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'user-123',
          type: 'APPROVAL_REQUIRED',
          title: 'Approval Required',
          message: 'John Doe is requesting your approval for "Test Workflow".',
        }),
      });
    });
  });

  describe('notifyApprovalGranted', () => {
    it('should create APPROVAL_GRANTED notification', async () => {
      mockPrisma.notification.create.mockResolvedValue(mockNotification);

      await service.notifyApprovalGranted('user-123', 'Test Workflow', 'inst-123');

      expect(mockPrisma.notification.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'user-123',
          type: 'APPROVAL_GRANTED',
          title: 'Request Approved',
          message: 'Your request "Test Workflow" has been approved.',
        }),
      });
    });
  });

  describe('notifyApprovalRejected', () => {
    it('should create APPROVAL_REJECTED notification without comment', async () => {
      mockPrisma.notification.create.mockResolvedValue(mockNotification);

      await service.notifyApprovalRejected('user-123', 'Test Workflow', 'inst-123');

      expect(mockPrisma.notification.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'user-123',
          type: 'APPROVAL_REJECTED',
          title: 'Request Rejected',
          message: 'Your request "Test Workflow" has been rejected.',
        }),
      });
    });

    it('should create APPROVAL_REJECTED notification with comment', async () => {
      mockPrisma.notification.create.mockResolvedValue(mockNotification);

      await service.notifyApprovalRejected('user-123', 'Test Workflow', 'inst-123', 'Not approved');

      expect(mockPrisma.notification.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          message: 'Your request "Test Workflow" has been rejected. Reason: Not approved',
        }),
      });
    });
  });
});
