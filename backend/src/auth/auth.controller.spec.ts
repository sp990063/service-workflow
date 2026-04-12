import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { ThrottlerModule } from '@nestjs/throttler';

describe('AuthController', () => {
  let controller: AuthController;
  let mockAuthService: any;

  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    name: 'Test User',
    role: 'USER',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockLoginResult = {
    access_token: 'jwt-token',
    user: mockUser,
  };

  beforeEach(async () => {
    mockAuthService = {
      login: jest.fn().mockResolvedValue(mockLoginResult),
      register: jest.fn().mockResolvedValue(mockUser),
    };

    const module: TestingModule = await Test.createTestingModule({
      imports: [ThrottlerModule.forRoot()],
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('login', () => {
    it('should return access token and user on successful login', async () => {
      const body = { email: 'test@example.com', password: 'password123' };

      const result = await controller.login(body);

      expect(result).toEqual(mockLoginResult);
      expect(mockAuthService.login).toHaveBeenCalledWith('test@example.com', 'password123');
    });

    it('should call authService.login with correct credentials', async () => {
      const body = { email: 'user@example.com', password: 'secret' };

      await controller.login(body);

      expect(mockAuthService.login).toHaveBeenCalledWith('user@example.com', 'secret');
    });
  });

  describe('register', () => {
    it('should register a new user', async () => {
      const body = {
        email: 'new@example.com',
        password: 'password123',
        name: 'New User',
      };

      const result = await controller.register(body);

      expect(result).toEqual(mockUser);
      expect(mockAuthService.register).toHaveBeenCalledWith(
        'new@example.com',
        'password123',
        'New User',
      );
    });

    it('should call authService.register with correct parameters', async () => {
      const body = {
        email: 'test@example.com',
        password: 'password',
        name: 'Test Name',
      };

      await controller.register(body);

      expect(mockAuthService.register).toHaveBeenCalledWith(
        'test@example.com',
        'password',
        'Test Name',
      );
    });
  });
});
