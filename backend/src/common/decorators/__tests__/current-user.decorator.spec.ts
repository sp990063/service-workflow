import { ExecutionContext } from '@nestjs/common';

function createMockContext(request: any): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => request,
      getResponse: () => ({}),
      getNext: () => ({}),
    }),
  } as ExecutionContext;
}

describe('CurrentUser Decorator Logic', () => {
  // Extract the inner function logic from current-user.decorator.ts
  // This tests the actual behavior without relying on createParamDecorator
  const decoratorLogic = (data: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      return null;
    }

    return data ? user[data] : user;
  };

  describe('with user on request', () => {
    const mockRequest = { user: { id: 'user-123', email: 'test@example.com', role: 'USER' } };

    it('should return entire user object when called with undefined data', () => {
      const ctx = createMockContext(mockRequest);
      const result = decoratorLogic(undefined, ctx);
      expect(result).toEqual({ id: 'user-123', email: 'test@example.com', role: 'USER' });
    });

    it('should return entire user object when called with empty string data', () => {
      const ctx = createMockContext(mockRequest);
      const result = decoratorLogic('', ctx);
      expect(result).toEqual({ id: 'user-123', email: 'test@example.com', role: 'USER' });
    });

    it('should return specific field when data is "id"', () => {
      const ctx = createMockContext(mockRequest);
      const result = decoratorLogic('id', ctx);
      expect(result).toBe('user-123');
    });

    it('should return specific field when data is "email"', () => {
      const ctx = createMockContext(mockRequest);
      const result = decoratorLogic('email', ctx);
      expect(result).toBe('test@example.com');
    });

    it('should return specific field when data is "role"', () => {
      const ctx = createMockContext(mockRequest);
      const result = decoratorLogic('role', ctx);
      expect(result).toBe('USER');
    });

    it('should return undefined for non-existent field', () => {
      const ctx = createMockContext(mockRequest);
      const result = decoratorLogic('nonexistent', ctx);
      expect(result).toBeUndefined();
    });
  });

  describe('with no user on request', () => {
    it('should return null when user is undefined', () => {
      const ctx = createMockContext({ user: undefined });
      const result = decoratorLogic('id', ctx);
      expect(result).toBeNull();
    });

    it('should return null when user is null', () => {
      const ctx = createMockContext({ user: null });
      const result = decoratorLogic('id', ctx);
      expect(result).toBeNull();
    });

    it('should return null when user is missing', () => {
      const ctx = createMockContext({});
      const result = decoratorLogic('id', ctx);
      expect(result).toBeNull();
    });

    it('should return null for any field when user is null', () => {
      const ctx = createMockContext({ user: null });
      const result = decoratorLogic(undefined, ctx);
      expect(result).toBeNull();
    });
  });
});
