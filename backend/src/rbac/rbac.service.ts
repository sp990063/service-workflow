import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

export interface PermissionCheck {
  allowed: boolean;
  reason?: string;
}

@Injectable()
export class RbacService {
  constructor(private prisma: PrismaService) {}

  /**
   * Check if user has a specific permission
   * Supports GLOBAL, PROJECT (scopeId), and ENTITY (scopeId) scopes
   */
  async hasPermission(
    userId: string,
    permission: string,
    scopeType: 'GLOBAL' | 'PROJECT' | 'ENTITY' = 'GLOBAL',
    scopeId?: string,
  ): Promise<PermissionCheck> {
    // First check if user has global admin role (legacy simple role check)
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { globalRole: true },
    });

    if (!user) {
      return { allowed: false, reason: 'User not found' };
    }

    // ADMIN role has all permissions
    if (user.role === 'ADMIN' || user.globalRole?.name === 'Admin') {
      return { allowed: true };
    }

    // Check for explicit permission via Member table
    const memberCondition: any = {
      userId,
      scopeType,
      role: {
        permissions: {
          some: {
            permission: { name: permission },
          },
        },
      },
    };

    // For PROJECT/ENTITY scope, also check scopeId
    if (scopeType !== 'GLOBAL' && scopeId) {
      memberCondition.scopeId = scopeId;
    }

    const member = await this.prisma.member.findFirst({
      where: memberCondition,
      include: { role: { include: { permissions: true } } },
    });

    if (member) {
      return { allowed: true };
    }

    // Check global scope as fallback
    if (scopeType !== 'GLOBAL') {
      const globalMember = await this.prisma.member.findFirst({
        where: {
          userId,
          scopeType: 'GLOBAL',
          role: {
            permissions: {
              some: {
                permission: { name: permission },
              },
            },
          },
        },
      });

      if (globalMember) {
        return { allowed: true };
      }
    }

    return { allowed: false, reason: `Missing permission: ${permission}` };
  }

  /**
   * Get all permissions for a user (for frontend to know what's available)
   */
  async getUserPermissions(userId: string): Promise<string[]> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { globalRole: true },
    });

    if (!user) return [];

    const permissions: Set<string> = new Set();

    // ADMIN has all permissions
    if (user.role === 'ADMIN' || user.globalRole?.name === 'Admin') {
      const allPermissions = await this.prisma.permission.findMany();
      return allPermissions.map(p => p.name);
    }

    // Get user's global role permissions
    if (user.globalRole) {
      const globalPerms = await this.prisma.rolePermission.findMany({
        where: { roleId: user.globalRole.id },
        include: { permission: true },
      });
      globalPerms.forEach(rp => permissions.add(rp.permission.name));
    }

    // Get user's member permissions (for project/entity scopes)
    const members = await this.prisma.member.findMany({
      where: { userId },
      include: { role: { include: { permissions: true } } },
    });

    members.forEach(member => {
      member.role.permissions.forEach((rp: any) => permissions.add((rp as any).permission?.name));
    });

    return Array.from(permissions);
  }

  /**
   * Add a role to a user
   */
  async assignRole(
    userId: string,
    roleId: string,
    scopeType: 'GLOBAL' | 'PROJECT' | 'ENTITY' = 'GLOBAL',
    scopeId?: string,
  ) {
    return this.prisma.member.create({
      data: {
        userId,
        roleId,
        scopeType,
        scopeId,
      },
    });
  }

  /**
   * Remove a role from a user
   */
  async removeRole(userId: string, roleId: string, scopeType?: string, scopeId?: string) {
    return this.prisma.member.delete({
      where: {
        userId_roleId_scopeType_scopeId: {
          userId,
          roleId,
          scopeType: scopeType || 'GLOBAL',
          scopeId: scopeId || null,
        },
      },
    });
  }

  /**
   * Get roles available for assignment
   */
  async getRoles(scopeType?: string) {
    return this.prisma.role.findMany({
      where: scopeType ? { type: scopeType } : undefined,
      include: { _count: { select: { permissions: true, members: true } } },
    });
  }

  /**
   * Create a role with permissions
   */
  async createRole(name: string, type: string, description?: string, permissionNames?: string[]) {
    const role = await this.prisma.role.create({
      data: {
        name,
        type,
        description,
      },
    });

    if (permissionNames && permissionNames.length > 0) {
      const permissions = await this.prisma.permission.findMany({
        where: { name: { in: permissionNames } },
      });

      await this.prisma.rolePermission.createMany({
        data: permissions.map(p => ({
          roleId: role.id,
          permissionId: p.id,
        })),
      });
    }

    return role;
  }

  /**
   * Get all permissions grouped by module
   */
  async getPermissionsByModule() {
    const permissions = await this.prisma.permission.findMany();
    return permissions.reduce((acc, perm) => {
      if (!acc[perm.module]) acc[perm.module] = [];
      acc[perm.module].push(perm);
      return acc;
    }, {} as Record<string, typeof permissions>);
  }
}
