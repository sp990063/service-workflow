import { Controller, Get, Post, Put, Body, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApprovalsService } from './approvals.service';

@Controller('approvals')
@UseGuards(JwtAuthGuard)
export class ApprovalsController {
  constructor(private approvalsService: ApprovalsService) {}

  @Get('pending')
  async getPending(@Query('userId') userId: string) {
    if (userId) {
      return this.approvalsService.getPendingApprovals(userId);
    }
    return this.approvalsService.getAllPendingApprovals();
  }

  @Get(':id')
  async getApproval(@Param('id') id: string) {
    return this.approvalsService.getApprovalRequest(id);
  }

  @Post()
  async create(@Body() body: { instanceId: string; nodeId: string; userId: string }) {
    return this.approvalsService.createApprovalRequest(body.instanceId, body.nodeId, body.userId);
  }

  @Put(':id/approve')
  async approve(@Param('id') id: string, @Body() body: { comment?: string }) {
    return this.approvalsService.approve(id, body.comment);
  }

  @Put(':id/reject')
  async reject(@Param('id') id: string, @Body() body: { comment?: string }) {
    return this.approvalsService.reject(id, body.comment);
  }

  @Get('instance/:instanceId')
  async getHistory(@Param('instanceId') instanceId: string) {
    return this.approvalsService.getApprovalHistory(instanceId);
  }
}
