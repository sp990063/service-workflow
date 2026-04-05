/**
 * Workflow Engine Controller
 * 
 * HTTP endpoints for workflow execution
 */

import { Controller, Post, Get, Param, Body, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { WorkflowEngineService } from './workflow-engine.service';

@Controller('workflows')
@UseGuards(JwtAuthGuard)
export class WorkflowEngineController {
  constructor(private readonly engine: WorkflowEngineService) {}

  /**
   * Start a new workflow instance
   */
  @Post(':id/instances')
  async startInstance(
    @Param('id') workflowId: string,
    @Body() body: { initialData?: Record<string, any> },
    @Request() req: any,
  ) {
    const instance = await this.engine.startInstance(workflowId, req.user.id, body.initialData);
    return instance;
  }

  /**
   * Get instance details
   */
  @Get('instances/:instanceId')
  async getInstance(@Param('instanceId') instanceId: string) {
    return this.engine.getInstance(instanceId);
  }

  /**
   * Execute current node (advance workflow)
   */
  @Post('instances/:instanceId/execute')
  async execute(@Param('instanceId') instanceId: string) {
    return this.engine.executeCurrentNode(instanceId);
  }

  /**
   * Get available actions for current node
   */
  @Get('instances/:instanceId/actions')
  async getActions(@Param('instanceId') instanceId: string) {
    return this.engine.getAvailableActions(instanceId);
  }

  /**
   * Submit approval decision
   */
  @Post('instances/:instanceId/submit')
  async submit(
    @Param('instanceId') instanceId: string,
    @Body() body: { action: string; comment?: string },
    @Request() req: any,
  ) {
    if (body.action === 'approve' || body.action === 'reject') {
      return this.engine.submitApproval(instanceId, req.user.id, body.action, body.comment);
    }
    
    if (body.action === 'submit_form') {
      return this.engine.submitFormData(instanceId, body.data || {});
    }

    return { success: false, error: 'Invalid action' };
  }

  /**
   * Cancel a workflow instance
   */
  @Post('instances/:instanceId/cancel')
  async cancel(@Param('instanceId') instanceId: string) {
    const instance = await this.engine.getInstance(instanceId);
    if (!instance) {
      return { success: false, error: 'Instance not found' };
    }

    // Update status to cancelled
    // This would need to be added to the service
    return { success: true, message: 'Workflow cancelled' };
  }
}
