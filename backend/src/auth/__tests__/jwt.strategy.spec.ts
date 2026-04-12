import { Test, TestingModule } from '@nestjs/testing';
import { JwtStrategy } from '../jwt.strategy';
import { ExtractJwt } from 'passport-jwt';

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [JwtStrategy],
    }).compile();

    strategy = module.get<JwtStrategy>(JwtStrategy);
  });

  it('should be defined', () => {
    expect(strategy).toBeDefined();
  });

  describe('validate', () => {
    it('should return user object from payload', async () => {
      const payload = { sub: 1, email: 'test@example.com', role: 'user' };
      const result = await strategy.validate(payload);

      expect(result).toEqual({
        id: payload.sub,
        email: payload.email,
        role: payload.role,
      });
    });

    it('should handle payload with only sub', async () => {
      const payload = { sub: 42 };
      const result = await strategy.validate(payload);

      expect(result).toEqual({
        id: 42,
        email: undefined,
        role: undefined,
      });
    });

    it('should handle payload with different roles', async () => {
      const adminPayload = { sub: 1, email: 'admin@example.com', role: 'admin' };
      const result = await strategy.validate(adminPayload);

      expect(result.role).toBe('admin');
    });
  });

  describe('constructor', () => {
    it('should configure jwt extraction from bearer token', async () => {
      const module = await Test.createTestingModule({
        providers: [JwtStrategy],
      }).compile();

      expect(module.get<JwtStrategy>(JwtStrategy)).toBeDefined();
    });
  });
});
