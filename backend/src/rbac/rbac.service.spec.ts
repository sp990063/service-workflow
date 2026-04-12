import { Test, TestingModule } from '@nestjs/testing';
import { RbacService } from './rbac.service';
import { PrismaService } from '../prisma.service';

describe('RbacService', () => {
  let service: RbacService;
  let mockPrisma: any;

  const mockUser = {
    id: 'user-123',
    name: 'Test User',
    email: 'test@example.com',
    role: 'USER',
    globalRole: { id: 'role-123', name: 'Admin' },
  };

  beforeEach(async () => {
    mockPrisma = {
      user: {
        findUnique: jest.fn(),
      },
      member: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        delete: jest.fn(),
      },
      role: {
        findMany: jest.fn(),
        create: jest.fn(),
      },
      permission: {
        findMany: jest.fn(),
      },
      rolePermission: {
        createMany: jest.fn(),
        findMany: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RbacService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<RbacService>(RbacService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('hasPermission', () => {
    it('should return allowed for ADMIN role', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ ...mockUser, role: 'ADMIN' });

      const result = await service.hasPermission('user-123', 'any_permission');

      expect(result).toEqual({ allowed: true });
    });

    it('should return allowed for user with globalRole Admin', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.hasPermission('user-123', 'any_permission');

      expect(result).toEqual({ allowed: true });
    });

    it('should return denied when user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const result = await service.hasPermission('non-existent', 'any_permission');

      expect(result).toEqual({ allowed: false, reason: 'User not found' });
    });

    it('should return allowed when member has the permission', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ ...mockUser, globalRole: null });
      mockPrisma.member.findFirst.mockResolvedValue({ id: 'member-123' });

      const result = await service.hasPermission('user-123', 'workflow:execute');

      expect(result).toEqual({ allowed: true });
    });

    it('should return denied when member does not have permission', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ ...mockUser, globalRole: null });
      mockPrisma.member.findFirst.mockResolvedValue(null);

      const result = await service.hasPermission('user-123', 'workflow:execute');

      expect(result).toEqual({ allowed: false, reason: 'Missing permission: workflow:execute' });
    });

    it('should check scopeId for PROJECT scope', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ ...mockUser, globalRole: null });
      mockPrisma.member.findFirst.mockResolvedValue({ id: 'member-123' });

      await service.hasPermission('user-123', 'workflow:execute', 'PROJECT', 'project-123');

      expect(mockPrisma.member.findFirst).toHaveBeenCalledWith({
        where: expect.objectContaining({
          userId: 'user-123',
          scopeType: 'PROJECT',
          scopeId: 'project-123',
        }),
        include: { role: { include: { permissions: true } } },
      });
    });

    it('should fallback to GLOBAL scope when PROJECT scope fails', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ ...mockUser, globalRole: null });
      mockPrisma.member.findFirst
        .mockResolvedValueOnce(null) // PROJECT scope check
        .mockResolvedValueOnce({ id: 'member-123' }); // GLOBAL fallback

      const result = await service.hasPermission('user-123', 'workflow:execute', 'PROJECT', 'project-123');

      expect(result).toEqual({ allowed: true });
      expect(mockPrisma.member.findFirst).toHaveBeenCalledTimes(2);
    });
  });

  describe('getUserPermissions', () => {
    it('should return all permissions for ADMIN', async () => {
      const allPermissions = [
        { id: 'perm-1', name: 'form:create', module: 'forms' },
        { id: 'perm-2', name: 'workflow:execute', module: 'workflows' },
      ];
      mockPrisma.user.findUnique.mockResolvedValue({ ...mockUser, role: 'ADMIN' });
      mockPrisma.permission.findMany.mockResolvedValue(allPermissions);

      const result = await service.getUserPermissions('user-123');

      expect(result).toEqual(['form:create', 'workflow:execute']);
    });

    it('should return empty array when user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const result = await service.getUserPermissions('non-existent');

      expect(result).toEqual([]);
    });

    it('should return global role permissions', async () => {
      const globalRole = { id: 'role-1', name: 'Manager' };
      mockPrisma.user.findUnique.mockResolvedValue({ ...mockUser, globalRole });
      mockPrisma.rolePermission.findMany.mockResolvedValue([
        { permission: { name: 'form:read' } },
        { permission: { name: 'workflow:view' } },
      ]);
      mockPrisma.member.findMany.mockResolvedValue([]);

      const result = await service.getUserPermissions('user-123');

      expect(result).toContain('form:read');
      expect(result).toContain('workflow:view');
    });

    it('should return member permissions for project/entity scopes', async () => {
      const globalRole = null;
      mockPrisma.user.findUnique.mockResolvedValue({ ...mockUser, globalRole });
      mockPrisma.rolePermission.findMany.mockResolvedValue([]);
      mockPrisma.member.findMany.mockResolvedValue([
        {
          role: {
            permissions: [
              { permission: { name: 'project:edit' } },
            ],
          },
        },
      ]);

      const result = await service.getUserPermissions('user-123');

      expect(result).toContain('project:edit');
    });
  });

  describe('assignRole', () => {
    it('should assign a role to a user', async () => {
      const member = { id: 'member-123', userId: 'user-123', roleId: 'role-123' };
      mockPrisma.member.create.mockResolvedValue(member);

      const result = await service.assignRole('user-123', 'role-123');

      expect(result).toEqual(member);
      expect(mockPrisma.member.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-123',
          roleId: 'role-123',
          scopeType: 'GLOBAL',
          scopeId: undefined,
        },
      });
    });

    it('should assign a role with PROJECT scope', async () => {
      const member = { id: 'member-123', userId: 'user-123', roleId: 'role-123', scopeType: 'PROJECT', scopeId: 'project-1' };
      mockPrisma.member.create.mockResolvedValue(member);

      const result = await service.assignRole('user-123', 'role-123', 'PROJECT', 'project-1');

      expect(result.scopeType).toBe('PROJECT');
      expect(result.scopeId).toBe('project-1');
    });
  });

  describe('removeRole', () => {
    it('should remove a role from a user', async () => {
      mockPrisma.member.delete.mockResolvedValue({});

      await service.removeRole('user-123', 'role-123');

      expect(mockPrisma.member.delete).toHaveBeenCalledWith({
        where: {
          userId_roleId_scopeType_scopeId: {
            userId: 'user-123',
            roleId: 'role-123',
            scopeType: 'GLOBAL',
            scopeId: null,
          },
        },
      });
    });

    it('should remove a role with specific scope', async () => {
      mockPrisma.member.delete.mockResolvedValue({});

      await service.removeRole('user-123', 'role-123', 'PROJECT', 'project-1');

      expect(mockPrisma.member.delete).toHaveBeenCalledWith({
        where: {
          userId_roleId_scopeType_scopeId: {
            userId: 'user-123',
            roleId: 'role-123',
            scopeType: 'PROJECT',
            scopeId: 'project-1',
          },
        },
      });
    });
  });

  describe('getRoles', () => {
    it('should return all roles', async () => {
      const roles = [
        { id: 'role-1', name: 'Admin', type: 'GLOBAL', _count: { permissions: 5, members: 2 } },
        { id: 'role-2', name: 'Manager', type: 'PROJECT', _count: { permissions: 3, members: 1 } },
      ];
      mockPrisma.role.findMany.mockResolvedValue(roles);

      const result = await service.getRoles();

      expect(result).toEqual(roles);
    });

    it('should filter roles by scope type', async () => {
      const roles = [
        { id: 'role-1', name: 'Admin', type: 'GLOBAL', _count: { permissions: 5, members: 2 } },
      ];
      mockPrisma.role.findMany.mockResolvedValue(roles);

      const result = await service.getRoles('GLOBAL');

      expect(result).toEqual(roles);
      expect(mockPrisma.role.findMany).toHaveBeenCalledWith({
        where: { type: 'GLOBAL' },
        include: { _count: { select: { permissions: true, members: true } } },
      });
    });
  });

  describe('createRole', () => {
    it('should create a role without permissions', async () => {
      const role = { id: 'role-123', name: 'New Role', type: 'GLOBAL' };
      mockPrisma.role.create.mockResolvedValue(role);

      const result = await service.createRole('New Role', 'GLOBAL');

      expect(result).toEqual(role);
      expect(mockPrisma.role.create).toHaveBeenCalledWith({
        data: { name: 'New Role', type: 'GLOBAL', description: undefined },
      });
    });

    it('should create a role with permissions', async () => {
      const role = { id: 'role-123', name: 'New Role', type: 'GLOBAL' };
      const permissions = [
        { id: 'perm-1', name: 'form:create' },
        { id: 'perm-2', name: 'form:read' },
      ];
      mockPrisma.role.create.mockResolvedValue(role);
      mockPrisma.permission.findMany.mockResolvedValue(permissions);

      const result = await service.createRole('New Role', 'GLOBAL', 'A new role', ['form:create', 'form:read']);

      expect(result).toEqual(role);
      expect(mockPrisma.rolePermission.createMany).toHaveBeenCalledWith({
        data: [
          { roleId: 'role-123', permissionId: 'perm-1' },
          { roleId: 'role-123', permissionId: 'perm-2' },
        ],
      });
    });

    it('should not create role permissions when none provided', async () => {
      const role = { id: 'role-123', name: 'New Role', type: 'GLOBAL' };
      mockPrisma.role.create.mockResolvedValue(role);

      await service.createRole('New Role', 'GLOBAL', undefined, []);

      expect(mockPrisma.rolePermission.createMany).not.toHaveBeenCalled();
    });
  });

  describe('getPermissionsByModule', () => {
    it('should group permissions by module', async () => {
      const permissions = [
        { id: 'perm-1', name: 'form:create', module: 'forms' },
        { id: 'perm-2', name: 'form:read', module: 'forms' },
        { id: 'perm-3', name: 'workflow:execute', module: 'workflows' },
      ];
      mockPrisma.permission.findMany.mockResolvedValue(permissions);

      const result = await service.getPermissionsByModule();

      expect(result['forms']).toHaveLength(2);
      expect(result['workflows']).toHaveLength(1);
    });

    it('should return empty object when no permissions', async () => {
      mockPrisma.permission.findMany.mockResolvedValue([]);

      const result = await service.getPermissionsByModule();

      expect(result).toEqual({});
    });
  });
});