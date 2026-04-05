import { Controller, Get, Post, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard, Roles, Role } from '../common/guards/roles.guard';
import { RbacService } from './rbac.service';
import { PrismaService } from '../prisma.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('rbac')
@UseGuards(JwtAuthGuard, RolesGuard)
export class RbacController {
  constructor(
    private rbacService: RbacService,
    private prisma: PrismaService,
  ) {}

  // ============ Permissions (read-only for now) ============

  @Get('permissions')
  @Roles(Role.ADMIN)
  async getPermissions() {
    return this.rbacService.getPermissionsByModule();
  }

  // ============ Roles ============

  @Get('roles')
  @Roles(Role.ADMIN)
  async getRoles(@Query('scopeType') scopeType?: string) {
    return this.rbacService.getRoles(scopeType);
  }

  @Post('roles')
  @Roles(Role.ADMIN)
  async createRole(
    @Body() body: { name: string; type: string; description?: string; permissions?: string[] },
  ) {
    return this.rbacService.createRole(body.name, body.type, body.description, body.permissions);
  }

  // ============ Role Assignments (Members) ============

  @Get('members')
  @Roles(Role.ADMIN)
  async getMembers(@Query('userId') userId?: string) {
    const where = userId ? { userId } : undefined;
    return this.prisma.member.findMany({
      where,
      include: { user: { select: { id: true, name: true, email: true } }, role: true },
    });
  }

  @Post('members')
  @Roles(Role.ADMIN)
  async assignRole(
    @Body() body: { userId: string; roleId: string; scopeType?: string; scopeId?: string },
  ) {
    return this.rbacService.assignRole(body.userId, body.roleId, (body.scopeType as 'GLOBAL' | 'PROJECT' | 'ENTITY') || 'GLOBAL', body.scopeId);
  }

  @Delete('members/:id')
  @Roles(Role.ADMIN)
  async removeRole(@Param('id') id: string) {
    return this.prisma.member.delete({ where: { id } });
  }

  // ============ User Permissions (for frontend) ============

  @Get('my-permissions')
  async getMyPermissions(@CurrentUser('id') userId: string) {
    return this.rbacService.getUserPermissions(userId);
  }
}
