/**
 * Notifications Gateway Unit Tests
 */

import { NotificationsGateway } from '../notifications.gateway';
import { JwtService } from '@nestjs/jwt';

describe('NotificationsGateway', () => {
  let gateway: NotificationsGateway;
  let mockJwtService: any;

  beforeEach(() => {
    mockJwtService = {
      verify: jest.fn(),
    };
    gateway = new NotificationsGateway(mockJwtService);
    // Mock server
    (gateway as any).server = {
      to: jest.fn().mockReturnThis(),
      emit: jest.fn(),
    };
  });

  describe('sendNotification', () => {
    it('should send notification to user room', () => {
      const userId = 'user-1';
      const notification = { id: '1', title: 'Test', message: 'Hello' };

      gateway.sendNotification(userId, notification);

      expect((gateway as any).server.to).toHaveBeenCalledWith(`user:${userId}`);
      expect((gateway as any).server.emit).toHaveBeenCalledWith('notification:new', notification);
    });
  });

  describe('sendWorkflowUpdate', () => {
    it('should send workflow update to user', () => {
      const userId = 'user-1';
      const update = { instanceId: '1', status: 'COMPLETED' };

      gateway.sendWorkflowUpdate(userId, update);

      expect((gateway as any).server.to).toHaveBeenCalledWith(`user:${userId}`);
      expect((gateway as any).server.emit).toHaveBeenCalledWith('workflow:status', update);
    });
  });

  describe('sendApprovalCompleted', () => {
    it('should send approval completed event', () => {
      const userId = 'user-1';
      const approval = { id: '1', decision: 'approved' };

      gateway.sendApprovalCompleted(userId, approval);

      expect((gateway as any).server.to).toHaveBeenCalledWith(`user:${userId}`);
      expect((gateway as any).server.emit).toHaveBeenCalledWith('approval:completed', approval);
    });
  });

  describe('handleAuth', () => {
    it('should authenticate valid token', () => {
      mockJwtService.verify.mockReturnValue({ sub: 'user-1' });

      const mockClient = {
        join: jest.fn(),
      } as any;

      const result = gateway.handleAuth({ token: 'valid-token' }, mockClient);

      expect(result.success).toBe(true);
      expect(result.userId).toBe('user-1');
      expect(mockClient.join).toHaveBeenCalledWith('user:user-1');
    });

    it('should reject invalid token', () => {
      mockJwtService.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      const mockClient = {
        join: jest.fn(),
      } as any;

      const result = gateway.handleAuth({ token: 'invalid-token' }, mockClient);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid token');
    });
  });

  describe('handlePing', () => {
    it('should respond with pong', () => {
      const mockClient = {} as any;

      const result = gateway.handlePing(mockClient);

      expect(result.event).toBe('pong');
      expect(result.timestamp).toBeDefined();
    });
  });
});
