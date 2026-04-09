import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard, Roles, Role } from '../common/guards/roles.guard';
import { UsersService } from './users.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Post('lookup')
  @Roles(Role.ADMIN, Role.MANAGER, Role.USER)
  async lookup(@Body() body: { email: string }) {
    const user = await this.usersService.findByEmail(body.email);
    if (!user) {
      throw new Error('User not found');
    }
    return { id: user.id, email: user.email, name: user.name };
  }

  @Post('search')
  @Roles(Role.ADMIN, Role.MANAGER, Role.USER)
  async search(@Body() body: { query: string; limit?: number }) {
    const users = await this.usersService.search(body.query, body.limit ?? 10);
    return users;
  }

  @Get()
  @Roles(Role.ADMIN) // Only admins can list all users
  async findAll() {
    return this.usersService.findAll();
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.MANAGER, Role.USER) // Users can view their own profile
  async findOne(@Param('id') id: string, @CurrentUser('id') userId: string, @CurrentUser('role') role: string) {
    // Non-admins can only view their own profile
    if (role !== Role.ADMIN && id !== userId) {
      throw new Error('Access denied: You can only view your own profile');
    }
    return this.usersService.findById(id);
  }

  @Put(':id/role')
  @Roles(Role.ADMIN) // Only admins can change roles
  async updateRole(@Param('id') id: string, @Body() body: { role: 'ADMIN' | 'MANAGER' | 'USER' }) {
    return this.usersService.updateRole(id, body.role);
  }

  @Put(':id')
  @Roles(Role.ADMIN, Role.MANAGER, Role.USER) // Users can update their own profile
  async update(
    @Param('id') id: string,
    @Body() body: { name?: string; department?: string },
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: string,
  ) {
    // Non-admins can only update their own profile
    if (role !== Role.ADMIN && id !== userId) {
      throw new Error('Access denied: You can only update your own profile');
    }
    // Non-admins cannot change their own role
    if (role !== Role.ADMIN && body.name === undefined && body.department === undefined) {
      return this.usersService.update(id, {});
    }
    return this.usersService.update(id, body);
  }

  @Delete(':id')
  @Roles(Role.ADMIN) // Only admins can delete users
  async delete(@Param('id') id: string) {
    return this.usersService.delete(id);
  }
}
