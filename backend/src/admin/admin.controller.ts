import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard, Roles, Role } from '../common/guards/roles.guard';
import { AdminService } from './admin.service';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class AdminController {
  constructor(private adminService: AdminService) {}

  @Get('settings')
  getSystemSettings() {
    return this.adminService.getSystemSettings();
  }

  @Post('settings/test-smtp')
  async testSmtp() {
    return this.adminService.testSmtpConnection();
  }

  @Post('settings/test-ldap')
  async testLdap() {
    return this.adminService.testLdapConnection();
  }

  @Post('settings/test-ldap-auth')
  async testLdapAuth(@Body() body: { username: string; password: string }) {
    return this.adminService.testLdapAuthentication(body.username, body.password);
  }

  @Get('system-info')
  getSystemInfo() {
    return this.adminService.getSystemInfo();
  }

  @Get('health')
  async getHealth() {
    return this.adminService.getHealthCheck();
  }
}
