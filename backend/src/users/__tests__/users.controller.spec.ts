import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from '../users.controller';
import { UsersService } from '../users.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';

describe('UsersController', () => {
  let controller: UsersController;
  let mockUsersService: any;

  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    name: 'Test User',
    role: 'USER',
    department: 'Engineering',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    mockUsersService = {
      findByEmail: jest.fn().mockResolvedValue(mockUser),
      search: jest.fn().mockResolvedValue([mockUser]),
      findAll: jest.fn().mockResolvedValue([mockUser]),
      findById: jest.fn().mockResolvedValue(mockUser),
      update: jest.fn().mockResolvedValue(mockUser),
      updateRole: jest.fn().mockResolvedValue(mockUser),
      delete: jest.fn().mockResolvedValue({ id: 'user-123' }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        { provide: UsersService, useValue: mockUsersService },
      ],
    })
      .overrideGuard(JwtAuthGuard).useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard).useValue({ canActivate: () => true })
      .compile();

    controller = module.get<UsersController>(UsersController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('lookup', () => {
    it('should return user by email', async () => {
      const result = await controller.lookup({ email: 'test@example.com' });

      expect(result).toEqual({ id: 'user-123', email: 'test@example.com', name: 'Test User' });
      expect(mockUsersService.findByEmail).toHaveBeenCalledWith('test@example.com');
    });

    it('should throw error when user not found', async () => {
      mockUsersService.findByEmail.mockResolvedValue(null);

      await expect(controller.lookup({ email: 'nonexistent@example.com' }))
        .rejects.toThrow('User not found');
    });
  });

  describe('search', () => {
    it('should return users matching query', async () => {
      const result = await controller.search({ query: 'test', limit: 10 });

      expect(result).toEqual([mockUser]);
      expect(mockUsersService.search).toHaveBeenCalledWith('test', 10);
    });

    it('should use default limit when not provided', async () => {
      await controller.search({ query: 'test' });

      expect(mockUsersService.search).toHaveBeenCalledWith('test', 10);
    });
  });

  describe('findAll', () => {
    it('should return all users', async () => {
      const result = await controller.findAll();

      expect(result).toEqual([mockUser]);
      expect(mockUsersService.findAll).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should return user by id for admin', async () => {
      const result = await controller.findOne('user-123', 'admin-123', 'ADMIN');

      expect(result).toEqual(mockUser);
      expect(mockUsersService.findById).toHaveBeenCalledWith('user-123');
    });

    it('should return own profile for non-admin', async () => {
      const result = await controller.findOne('user-123', 'user-123', 'USER');

      expect(result).toEqual(mockUser);
      expect(mockUsersService.findById).toHaveBeenCalledWith('user-123');
    });

    it('should throw error when non-admin tries to view other profile', async () => {
      await expect(controller.findOne('other-user', 'user-123', 'USER'))
        .rejects.toThrow('Access denied: You can only view your own profile');
    });
  });

  describe('updateRole', () => {
    it('should update user role', async () => {
      const result = await controller.updateRole('user-123', { role: 'MANAGER' });

      expect(result).toEqual(mockUser);
      expect(mockUsersService.updateRole).toHaveBeenCalledWith('user-123', 'MANAGER');
    });
  });

  describe('update', () => {
    it('should update own profile', async () => {
      const body = { name: 'Updated Name' };
      const result = await controller.update('user-123', body, 'user-123', 'USER');

      expect(result).toEqual(mockUser);
      expect(mockUsersService.update).toHaveBeenCalledWith('user-123', body);
    });

    it('should update any profile for admin', async () => {
      const body = { name: 'Updated Name' };
      const result = await controller.update('other-user', body, 'admin-123', 'ADMIN');

      expect(result).toEqual(mockUser);
      expect(mockUsersService.update).toHaveBeenCalledWith('other-user', body);
    });

    it('should throw error when non-admin updates others profile', async () => {
      const body = { name: 'Updated Name' };

      await expect(controller.update('other-user', body, 'user-123', 'USER'))
        .rejects.toThrow('Access denied: You can only update your own profile');
    });

    it('should allow non-admin to update with empty body', async () => {
      mockUsersService.update.mockResolvedValue(mockUser);
      const result = await controller.update('user-123', {}, 'user-123', 'USER');

      expect(result).toEqual(mockUser);
    });
  });

  describe('delete', () => {
    it('should delete a user', async () => {
      const result = await controller.delete('user-123');

      expect(result).toEqual({ id: 'user-123' });
      expect(mockUsersService.delete).toHaveBeenCalledWith('user-123');
    });

    it('should throw error when deleting non-existent user', async () => {
      mockUsersService.delete.mockRejectedValue(new Error('User not found'));

      await expect(controller.delete('non-existent'))
        .rejects.toThrow('User not found');
    });
  });
});
