import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { OwnershipGuard, OWNERSHIP_KEY } from './ownership.guard';

describe('OwnershipGuard', () => {
  let guard: OwnershipGuard;
  let reflector: Reflector;

  const createMockContext = (
    user?: { id: string; role: string },
    resourceId?: string,
    workflowService?: any,
  ): ExecutionContext => {
    const mockRequest = {
      user,
      params: { id: resourceId },
      scope: workflowService ? { workflowsService: workflowService } : undefined,
    };

    return {
      switchToHttp: () => ({
        getRequest: () => mockRequest,
      }),
      getHandler: () => ({}),
      getClass: () => ({}),
    } as unknown as ExecutionContext;
  };

  beforeEach(() => {
    reflector = new Reflector();
    guard = new OwnershipGuard(reflector);
  });

  describe('canActivate', () => {
    it('should return true when no ownership is required', async () => {
      const context = createMockContext({ id: 'user-123', role: 'USER' }, 'resource-1');
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should return true when user is the owner', async () => {
      const mockWorkflowService = {
        findById: jest.fn().mockResolvedValue({ id: 'resource-1', userId: 'user-123' }),
      };
      const context = createMockContext({ id: 'user-123', role: 'USER' }, 'resource-1', mockWorkflowService);
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(true);

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(mockWorkflowService.findById).toHaveBeenCalledWith('resource-1');
    });

    it('should return true when user is ADMIN', async () => {
      const mockWorkflowService = {
        findById: jest.fn().mockResolvedValue({ id: 'resource-1', userId: 'other-user' }),
      };
      const context = createMockContext({ id: 'admin-1', role: 'ADMIN' }, 'resource-1', mockWorkflowService);
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(true);

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(mockWorkflowService.findById).toHaveBeenCalledWith('resource-1');
    });

    it('should return true when user is MANAGER', async () => {
      const mockWorkflowService = {
        findById: jest.fn().mockResolvedValue({ id: 'resource-1', userId: 'other-user' }),
      };
      const context = createMockContext({ id: 'manager-1', role: 'MANAGER' }, 'resource-1', mockWorkflowService);
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(true);

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should throw ForbiddenException when user is not owner and not ADMIN/MANAGER', async () => {
      const mockWorkflowService = {
        findById: jest.fn().mockResolvedValue({ id: 'resource-1', userId: 'other-user' }),
      };
      const context = createMockContext({ id: 'user-123', role: 'USER' }, 'resource-1', mockWorkflowService);
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(true);

      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
    });

    it('should return true when resource is not found (let other guards handle)', async () => {
      const mockWorkflowService = {
        findById: jest.fn().mockResolvedValue(null),
      };
      const context = createMockContext({ id: 'user-123', role: 'USER' }, 'non-existent', mockWorkflowService);
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(true);

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should return true when no user in request', async () => {
      const mockWorkflowService = {
        findById: jest.fn().mockResolvedValue({ id: 'resource-1', userId: 'other-user' }),
      };
      const context = createMockContext(undefined, 'resource-1', mockWorkflowService);
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(true);

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should return true when no resourceId in params', async () => {
      const mockWorkflowService = {
        findById: jest.fn().mockResolvedValue({ id: 'resource-1', userId: 'other-user' }),
      };
      const context = createMockContext({ id: 'user-123', role: 'USER' }, undefined, mockWorkflowService);
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(true);

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should return true when no workflowService in scope', async () => {
      const context = createMockContext({ id: 'user-123', role: 'USER' }, 'resource-1', undefined);
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(true);

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
    });
  });
});
