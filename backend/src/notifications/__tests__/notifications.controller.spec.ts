import { Test, TestingModule } from '@nestjs/testing';
import { NotificationsController } from '../notifications.controller';
import { NotificationsService } from '../notifications.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

describe('NotificationsController', () => {
  let controller: NotificationsController;
  let mockNotificationsService: any;

  const mockNotification = {
    id: 'notif-123',
    userId: 'user-123',
    type: 'APPROVAL_REQUIRED',
    title: 'Approval Required',
    message: 'You have a pending approval',
    data: null,
    isRead: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    mockNotificationsService = {
      getForUser: jest.fn().mockResolvedValue([mockNotification]),
      getUnreadCount: jest.fn().mockResolvedValue(5),
      markAsRead: jest.fn().mockResolvedValue({ ...mockNotification, isRead: true }),
      markAllAsRead: jest.fn().mockResolvedValue({ count: 3 }),
      delete: jest.fn().mockResolvedValue({ id: 'notif-123' }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [NotificationsController],
      providers: [
        { provide: NotificationsService, useValue: mockNotificationsService },
      ],
    })
      .overrideGuard(JwtAuthGuard).useValue({ canActivate: () => true })
      .compile();

    controller = module.get<NotificationsController>(NotificationsController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getForUser', () => {
    it('should return notifications for a user', async () => {
      const result = await controller.getForUser('user-123');

      expect(result).toEqual([mockNotification]);
      expect(mockNotificationsService.getForUser).toHaveBeenCalledWith('user-123');
    });

    it('should return empty array when user has no notifications', async () => {
      mockNotificationsService.getForUser.mockResolvedValue([]);
      const result = await controller.getForUser('user-without-notifs');

      expect(result).toEqual([]);
    });
  });

  describe('getUnreadCount', () => {
    it('should return unread count for a user', async () => {
      const result = await controller.getUnreadCount('user-123');

      expect(result).toEqual({ count: 5 });
      expect(mockNotificationsService.getUnreadCount).toHaveBeenCalledWith('user-123');
    });

    it('should return zero count when user has no unread notifications', async () => {
      mockNotificationsService.getUnreadCount.mockResolvedValue(0);
      const result = await controller.getUnreadCount('user-without-notifs');

      expect(result).toEqual({ count: 0 });
    });
  });

  describe('markAsRead', () => {
    it('should mark a notification as read', async () => {
      const result = await controller.markAsRead('notif-123');

      expect(result).toEqual({ ...mockNotification, isRead: true });
      expect(mockNotificationsService.markAsRead).toHaveBeenCalledWith('notif-123');
    });
  });

  describe('markAllAsRead', () => {
    it('should mark all notifications as read for a user', async () => {
      const result = await controller.markAllAsRead('user-123');

      expect(result).toEqual({ count: 3 });
      expect(mockNotificationsService.markAllAsRead).toHaveBeenCalledWith('user-123');
    });
  });

  describe('delete', () => {
    it('should delete a notification', async () => {
      const result = await controller.delete('notif-123');

      expect(result).toEqual({ id: 'notif-123' });
      expect(mockNotificationsService.delete).toHaveBeenCalledWith('notif-123');
    });
  });
});
