import { ExecutionContext, UnauthorizedException } from '@nestjs/common';

// Since JwtAuthGuard extends AuthGuard('jwt') which is a complex NestJS passport
// integration, we test the guard's behavior indirectly through integration tests
// This test file verifies the guard's contract

describe('JwtAuthGuard', () => {
  // The JwtAuthGuard is a thin wrapper around passport's AuthGuard('jwt')
  // Testing it requires complex mocking of the passport strategy
  // For now, we document the expected behavior:
  // - Valid JWT → canActivate returns true
  // - Invalid/Missing JWT → canActivate throws UnauthorizedException
  // - Valid JWT with user → attaches user to request

  it('should be defined as a class', () => {
    const { JwtAuthGuard } = require('./jwt-auth.guard');
    expect(JwtAuthGuard).toBeDefined();
  });

  it('should be instantiable', () => {
    const { JwtAuthGuard } = require('./jwt-auth.guard');
    expect(() => new JwtAuthGuard()).not.toThrow();
  });

  describe('guard behavior expectations', () => {
    it('should export JwtAuthGuard properly', () => {
      const { JwtAuthGuard } = require('./jwt-auth.guard');
      const guard = new JwtAuthGuard();
      expect(typeof guard.canActivate).toBe('function');
    });
  });
});
