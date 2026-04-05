/**
 * Escalations Controller
 */

import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard, Roles, Role } from '../common/guards/roles.guard';
import { EscalationsService } from './escalations.service';

@Controller('escalation-rules')
@UseGuards(JwtAuthGuard)
@Roles(Role.ADMIN)
export class EscalationsController {
  constructor(private readonly escalationsService: EscalationsService) {}

  /**
   * Create escalation rule
   */
  @Post()
  create(@Body() body: {
    workflowId?: string;
    nodeType: string;
    timeoutMinutes: number;
    level1ApproverId?: string;
    level2ApproverId?: string;
    level3ApproverId?: string;
  }) {
    return this.escalationsService.createRule(body);
  }

  /**
   * List all escalation rules
   */
  @Get()
  getAll() {
    return this.escalationsService.getRules();
  }

  /**
   * Get rules for specific workflow
   */
  @Get('workflow/:workflowId')
  getForWorkflow(@Param('workflowId') workflowId: string) {
    return this.escalationsService.getRulesForWorkflow(workflowId);
  }

  /**
   * Get escalation history for instance
   */
  @Get('history/:instanceId')
  getHistory(@Param('instanceId') instanceId: string) {
    return this.escalationsService.getEscalationHistory(instanceId);
  }

  /**
   * Update rule
   */
  @Put(':id')
  update(
    @Param('id') id: string,
    @Body() body: {
      nodeType?: string;
      timeoutMinutes?: number;
      level1ApproverId?: string;
      level2ApproverId?: string;
      level3ApproverId?: string;
      isActive?: boolean;
    },
  ) {
    return this.escalationsService.updateRule(id, body);
  }

  /**
   * Delete rule
   */
  @Delete(':id')
  delete(@Param('id') id: string) {
    return this.escalationsService.deleteRule(id);
  }
}
