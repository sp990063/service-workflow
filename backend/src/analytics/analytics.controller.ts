/**
 * Analytics Controller
 */

import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard, Roles, Role } from '../common/guards/roles.guard';
import { AnalyticsService } from './analytics.service';

@Controller('analytics')
@UseGuards(JwtAuthGuard)
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  /**
   * Get overview statistics (admin only)
   */
  @Get('overview')
  @Roles(Role.ADMIN)
  getOverview() {
    return this.analyticsService.getOverview();
  }

  /**
   * Get workflow-specific statistics
   */
  @Get('workflows/:id')
  getWorkflowStats(@Param('id') id: string) {
    return this.analyticsService.getWorkflowStats(id);
  }

  /**
   * Get most used workflows
   */
  @Get('most-used')
  getMostUsedWorkflows(@Query('limit') limit?: string) {
    return this.analyticsService.getMostUsedWorkflows(limit ? parseInt(limit, 10) : 10);
  }

  /**
   * Get approval time trends
   */
  @Get('approval-times')
  @Roles(Role.ADMIN)
  getApprovalTimes(@Query('days') days?: string) {
    return this.analyticsService.getApprovalTimeTrends(days ? parseInt(days, 10) : 7);
  }

  /**
   * Get user statistics
   */
  @Get('users/:id')
  getUserStats(@Param('id') id: string) {
    return this.analyticsService.getUserStats(id);
  }
}
