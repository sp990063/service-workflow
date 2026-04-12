import { Test, TestingModule } from '@nestjs/testing';
import { RbacController } from '../rbac.controller';
import { RbacService } from '../rbac.service';
import { PrismaService } from '../../prisma.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';

describe('RbacController', () => {
  let controller: RbacController;
  let mockRbacService: any;
  let mockPrismaService: any;

  const mockRole = {
    id: 'role-123',
    name: 'ADMIN',
    type: 'GLOBAL',
    description: 'Administrator role',
    permissions: ['workflow.create', 'workflow.read', 'workflow.delete'],
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockMember = {
    id: 'member-123',
    userId: 'user-123',
    roleId: 'role-123',
    scopeType: 'GLOBAL',
    scopeId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    user: { id: 'user-123', name: 'Test User', email: 'test@example.com' },
    role: mockRole,
  };

  beforeEach(async () => {
    mockRbacService = {
      getPermissionsByModule: jest.fn().mockResolvedValue({
        workflow: ['workflow.create', 'workflow.read', 'workflow.update', 'workflow.delete'],
        approval: ['approval.create', 'approval.read', 'approval.approve', 'approval.reject'],
      }),
      getRoles: jest.fn().mockResolvedValue([mockRole]),
      createRole: jest.fn().mockResolvedValue(mockRole),
      assignRole: jest.fn().mockResolvedValue(mockMember),
      getUserPermissions: jest.fn().mockResolvedValue(['workflow.create', 'workflow.read']),
    };

    mockPrismaService = {
      member: {
        findMany: jest.fn().mockResolvedValue([mockMember]),
        delete: jest.fn().mockResolvedValue({ id: 'member-123' }),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [RbacController],
      providers: [
        { provide: RbacService, useValue: mockRbacService },
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    })
      .overrideGuard(JwtAuthGuard).useValue({
        canActivate: (context) => {
          const request = context.switchToHttp().getRequest();
          request.user = { id: 'user-123', role: 'USER' };
          return true;
        },
      })
      .overrideGuard(RolesGuard).useValue({ canActivate: () => true })
      .compile();

    controller = module.get<RbacController>(RbacController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getPermissions', () => {
    it('should return permissions grouped by module', async () => {
      const result = await controller.getPermissions();

      expect(result).toEqual({
        workflow: ['workflow.create', 'workflow.read', 'workflow.update', 'workflow.delete'],
        approval: ['approval.create', 'approval.read', 'approval.approve', 'approval.reject'],
      });
      expect(mockRbacService.getPermissionsByModule).toHaveBeenCalled();
    });
  });

  describe('getRoles', () => {
    it('should return all roles', async () => {
      const result = await controller.getRoles(undefined);

      expect(result).toEqual([mockRole]);
      expect(mockRbacService.getRoles).toHaveBeenCalledWith(undefined);
    });

    it('should return roles filtered by scope type', async () => {
      const result = await controller.getRoles('GLOBAL');

      expect(result).toEqual([mockRole]);
      expect(mockRbacService.getRoles).toHaveBeenCalledWith('GLOBAL');
    });
  });

  describe('createRole', () => {
    it('should create a role', async () => {
      const body = {
        name: 'ADMIN',
        type: 'GLOBAL',
        description: 'Administrator role',
        permissions: ['workflow.create', 'workflow.read'],
      };

      const result = await controller.createRole(body);

      expect(result).toEqual(mockRole);
      expect(mockRbacService.createRole).toHaveBeenCalledWith(
        'ADMIN',
        'GLOBAL',
        'Administrator role',
        ['workflow.create', 'workflow.read'],
      );
    });
  });

  describe('getMembers', () => {
    it('should return all members', async () => {
      const result = await controller.getMembers(undefined);

      expect(result).toEqual([mockMember]);
      expect(mockPrismaService.member.findMany).toHaveBeenCalledWith({
        where: undefined,
        include: { user: { select: { id: true, name: true, email: true } }, role: true },
      });
    });

    it('should return members filtered by userId', async () => {
      const result = await controller.getMembers('user-123');

      expect(result).toEqual([mockMember]);
      expect(mockPrismaService.member.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-123' },
        include: { user: { select: { id: true, name: true, email: true } }, role: true },
      });
    });
  });

  describe('assignRole', () => {
    it('should assign a role to a user', async () => {
      const body = {
        userId: 'user-123',
        roleId: 'role-123',
        scopeType: 'GLOBAL',
        scopeId: undefined,
      };

      const result = await controller.assignRole(body);

      expect(result).toEqual(mockMember);
      expect(mockRbacService.assignRole).toHaveBeenCalledWith('user-123', 'role-123', 'GLOBAL', undefined);
    });

    it('should assign role with PROJECT scope', async () => {
      const body = {
        userId: 'user-123',
        roleId: 'role-123',
        scopeType: 'PROJECT',
        scopeId: 'project-456',
      };

      await controller.assignRole(body);

      expect(mockRbacService.assignRole).toHaveBeenCalledWith('user-123', 'role-123', 'PROJECT', 'project-456');
    });
  });

  describe('removeRole', () => {
    it('should remove a role assignment', async () => {
      const result = await controller.removeRole('member-123');

      expect(result).toEqual({ id: 'member-123' });
      expect(mockPrismaService.member.delete).toHaveBeenCalledWith({ where: { id: 'member-123' } });
    });

    it('should throw error when removing non-existent member', async () => {
      mockPrismaService.member.delete.mockRejectedValue(new Error('Member not found'));

      await expect(controller.removeRole('non-existent'))
        .rejects.toThrow('Member not found');
    });
  });

  describe('getMyPermissions', () => {
    it('should return current user permissions', async () => {
      const result = await controller.getMyPermissions('user-123');

      expect(result).toEqual(['workflow.create', 'workflow.read']);
      expect(mockRbacService.getUserPermissions).toHaveBeenCalledWith('user-123');
    });

    it('should return empty array when user has no permissions', async () => {
      mockRbacService.getUserPermissions.mockResolvedValue([]);
      const result = await controller.getMyPermissions('user-without-perms');

      expect(result).toEqual([]);
    });
  });
});
