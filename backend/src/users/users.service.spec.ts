import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { PrismaService } from '../prisma.service';

describe('UsersService', () => {
  let service: UsersService;
  let mockPrisma: any;

  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    password: 'hashedpassword',
    name: 'Test User',
    role: 'USER' as const,
    department: 'Engineering',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    mockPrisma = {
      user: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findByEmail', () => {
    it('should return user when found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.findByEmail('test@example.com');

      expect(result).toEqual(mockUser);
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({ where: { email: 'test@example.com' } });
    });

    it('should return null when user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const result = await service.findByEmail('nonexistent@example.com');

      expect(result).toBeNull();
    });
  });

  describe('findById', () => {
    it('should return user when found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.findById('user-123');

      expect(result).toEqual(mockUser);
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({ where: { id: 'user-123' } });
    });

    it('should return null when user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const result = await service.findById('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('create', () => {
    it('should create a new user', async () => {
      const userData = { email: 'new@example.com', password: 'hashedpassword', name: 'New User' };
      const createdUser = { ...mockUser, ...userData };
      mockPrisma.user.create.mockResolvedValue(createdUser);

      const result = await service.create(userData);

      expect(result).toEqual(createdUser);
      expect(mockPrisma.user.create).toHaveBeenCalledWith({ data: userData });
    });
  });

  describe('findAll', () => {
    it('should return all users with selected fields', async () => {
      const users = [
        { id: 'user-1', email: 'user1@example.com', name: 'User 1', role: 'USER', department: 'Eng', createdAt: new Date() },
        { id: 'user-2', email: 'user2@example.com', name: 'User 2', role: 'MANAGER', department: 'Sales', createdAt: new Date() },
      ];
      mockPrisma.user.findMany.mockResolvedValue(users);

      const result = await service.findAll();

      expect(result).toHaveLength(2);
      expect(result[0]).toHaveProperty('id');
      expect(result[0]).toHaveProperty('email');
      expect(result[0]).toHaveProperty('name');
      expect(result[0]).toHaveProperty('role');
      expect(result[0]).toHaveProperty('department');
      expect(result[0]).toHaveProperty('createdAt');
      expect(mockPrisma.user.findMany).toHaveBeenCalledWith({
        select: { id: true, email: true, name: true, role: true, department: true, createdAt: true },
      });
    });

    it('should return empty array when no users', async () => {
      mockPrisma.user.findMany.mockResolvedValue([]);

      const result = await service.findAll();

      expect(result).toEqual([]);
    });
  });

  describe('search', () => {
    it('should search users by name or email', async () => {
      const users = [{ id: 'user-123', name: 'John Doe', email: 'john@example.com' }];
      mockPrisma.user.findMany.mockResolvedValue(users);

      const result = await service.search('john');

      expect(result).toEqual(users);
      expect(mockPrisma.user.findMany).toHaveBeenCalledWith({
        where: {
          OR: [
            { name: { contains: 'john' } },
            { email: { contains: 'john' } },
          ],
        },
        select: { id: true, name: true, email: true },
        take: 10,
      });
    });

    it('should respect limit parameter', async () => {
      mockPrisma.user.findMany.mockResolvedValue([]);

      await service.search('test', 5);

      expect(mockPrisma.user.findMany).toHaveBeenCalledWith({
        where: {
          OR: [
            { name: { contains: 'test' } },
            { email: { contains: 'test' } },
          ],
        },
        select: { id: true, name: true, email: true },
        take: 5,
      });
    });

    it('should return empty array when no matches', async () => {
      mockPrisma.user.findMany.mockResolvedValue([]);

      const result = await service.search('nonexistent');

      expect(result).toEqual([]);
    });
  });

  describe('update', () => {
    it('should update user name', async () => {
      const updatedUser = { ...mockUser, name: 'Updated Name' };
      mockPrisma.user.update.mockResolvedValue(updatedUser);

      const result = await service.update('user-123', { name: 'Updated Name' });

      expect(result.name).toBe('Updated Name');
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        data: { name: 'Updated Name' },
      });
    });

    it('should update user role', async () => {
      const updatedUser = { ...mockUser, role: 'MANAGER' as const };
      mockPrisma.user.update.mockResolvedValue(updatedUser);

      const result = await service.update('user-123', { role: 'MANAGER' });

      expect(result.role).toBe('MANAGER');
    });

    it('should update user department', async () => {
      const updatedUser = { ...mockUser, department: 'Sales' };
      mockPrisma.user.update.mockResolvedValue(updatedUser);

      const result = await service.update('user-123', { department: 'Sales' });

      expect(result.department).toBe('Sales');
    });

    it('should update multiple fields at once', async () => {
      const updatedUser = { ...mockUser, name: 'New Name', role: 'ADMIN' as const, department: 'HR' };
      mockPrisma.user.update.mockResolvedValue(updatedUser);

      const result = await service.update('user-123', { name: 'New Name', role: 'ADMIN', department: 'HR' });

      expect(result).toEqual(updatedUser);
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        data: { name: 'New Name', role: 'ADMIN', department: 'HR' },
      });
    });
  });

  describe('updateRole', () => {
    it('should update user role', async () => {
      const updatedUser = { ...mockUser, role: 'ADMIN' as const };
      mockPrisma.user.update.mockResolvedValue(updatedUser);

      const result = await service.updateRole('user-123', 'ADMIN');

      expect(result.role).toBe('ADMIN');
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        data: { role: 'ADMIN' },
      });
    });
  });

  describe('delete', () => {
    it('should delete a user', async () => {
      mockPrisma.user.delete.mockResolvedValue(mockUser);

      const result = await service.delete('user-123');

      expect(result).toEqual(mockUser);
      expect(mockPrisma.user.delete).toHaveBeenCalledWith({ where: { id: 'user-123' } });
    });
  });
});