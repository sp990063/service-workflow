/**
 * Delegations Controller
 */

import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { DelegationsService } from './delegations.service';

@Controller('delegations')
@UseGuards(JwtAuthGuard)
export class DelegationsController {
  constructor(private readonly delegationsService: DelegationsService) {}

  /**
   * Create a new delegation
   */
  @Post()
  create(
    @CurrentUser('id') userId: string,
    @Body() body: { delegateId: string; reason?: string; startDate: string; endDate: string },
  ) {
    return this.delegationsService.create(userId, {
      delegateId: body.delegateId,
      reason: body.reason,
      startDate: new Date(body.startDate),
      endDate: new Date(body.endDate),
    });
  }

  /**
   * List my delegations (where I delegated to someone)
   */
  @Get()
  getMyDelegations(@CurrentUser('id') userId: string) {
    return this.delegationsService.getMyDelegations(userId);
  }

  /**
   * List delegations to me (someone delegated to me)
   */
  @Get('my-delegate')
  getDelegationsToMe(@CurrentUser('id') userId: string) {
    return this.delegationsService.getDelegationsToMe(userId);
  }

  /**
   * Get pending approvals that I can approve as delegate
   */
  @Get('pending-approvals')
  getPendingApprovals(@CurrentUser('id') userId: string) {
    return this.delegationsService.getPendingApprovalsForDelegate(userId);
  }

  /**
   * Check if I can approve on behalf of someone
   */
  @Get('can-approve/:originalApproverId')
  canApprove(
    @CurrentUser('id') userId: string,
    @Param('originalApproverId') originalApproverId: string,
  ) {
    return this.delegationsService.canApproveOnBehalf(userId, originalApproverId);
  }

  /**
   * Update a delegation
   */
  @Put(':id')
  update(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() body: { reason?: string; startDate?: string; endDate?: string; isActive?: boolean },
  ) {
    return this.delegationsService.update(id, userId, {
      reason: body.reason,
      startDate: body.startDate ? new Date(body.startDate) : undefined,
      endDate: body.endDate ? new Date(body.endDate) : undefined,
      isActive: body.isActive,
    });
  }

  /**
   * Delete a delegation
   */
  @Delete(':id')
  delete(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.delegationsService.delete(id, userId);
  }
}
