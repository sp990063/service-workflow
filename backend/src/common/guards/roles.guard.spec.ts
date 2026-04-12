import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard, Role, ROLES_KEY } from './roles.guard';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: Reflector;

  const createMockContext = (user?: { id: string; role: string }, handlerRoles?: Role[], classRoles?: Role[]): ExecutionContext => {
    const mockHandler = { metadata: {} };
    const mockClass = { metadata: {} };

    if (handlerRoles) {
      Reflect.defineMetadata(ROLES_KEY, handlerRoles, mockHandler);
    }
    if (classRoles) {
      Reflect.defineMetadata(ROLES_KEY, classRoles, mockClass);
    }

    return {
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
      getHandler: () => mockHandler,
      getClass: () => mockClass,
    } as unknown as ExecutionContext;
  };

  beforeEach(() => {
    reflector = new Reflector();
    guard = new RolesGuard(reflector);
  });

  describe('canActivate', () => {
    it('should return true when no roles are required', () => {
      const context = createMockContext({ id: 'user-123', role: 'USER' });
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should return true when user has required role', () => {
      const context = createMockContext({ id: 'user-123', role: 'ADMIN' }, [Role.ADMIN]);
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([Role.ADMIN]);

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should return true when user has one of multiple required roles', () => {
      const context = createMockContext({ id: 'user-123', role: 'MANAGER' }, [Role.ADMIN, Role.MANAGER]);
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([Role.ADMIN, Role.MANAGER]);

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should throw UnauthorizedException when user does not have required role', () => {
      const context = createMockContext({ id: 'user-123', role: 'USER' }, [Role.ADMIN]);
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([Role.ADMIN]);

      expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when user role does not match any required', () => {
      const context = createMockContext({ id: 'user-123', role: 'USER' }, [Role.ADMIN, Role.MANAGER]);
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([Role.ADMIN, Role.MANAGER]);

      expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when no user in request', () => {
      const context = createMockContext(undefined, [Role.ADMIN]);
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([Role.ADMIN]);

      expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException with correct message for multiple required roles', () => {
      const context = createMockContext({ id: 'user-123', role: 'USER' }, [Role.ADMIN, Role.MANAGER]);
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([Role.ADMIN, Role.MANAGER]);

      expect(() => guard.canActivate(context)).toThrow('Access denied. Required roles: ADMIN, MANAGER');
    });

    it('should use class-level roles when handler has no roles', () => {
      const context = createMockContext({ id: 'user-123', role: 'ADMIN' }, undefined, [Role.ADMIN]);
      jest.spyOn(reflector, 'getAllAndOverride')
        .mockReturnValueOnce(undefined)  // handler roles
        .mockReturnValueOnce([Role.ADMIN]);  // class roles

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should prefer handler roles over class roles', () => {
      const context = createMockContext({ id: 'user-123', role: 'MANAGER' }, [Role.MANAGER], [Role.ADMIN]);
      jest.spyOn(reflector, 'getAllAndOverride')
        .mockReturnValueOnce([Role.MANAGER])  // handler roles
        .mockReturnValueOnce([Role.ADMIN]);  // class roles

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });
  });
});
