import { Controller, Get, Put, Delete, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { NotificationsService } from './notifications.service';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private notificationsService: NotificationsService) {}

  @Get()
  async getForUser(@Query('userId') userId: string) {
    return this.notificationsService.getForUser(userId);
  }

  @Get('unread-count')
  async getUnreadCount(@Query('userId') userId: string) {
    const count = await this.notificationsService.getUnreadCount(userId);
    return { count };
  }

  @Put(':id/read')
  async markAsRead(@Param('id') id: string) {
    return this.notificationsService.markAsRead(id);
  }

  @Put('read-all')
  async markAllAsRead(@Query('userId') userId: string) {
    return this.notificationsService.markAllAsRead(userId);
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    return this.notificationsService.delete(id);
  }
}
