import { Controller, Get, Post, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CommentsService } from './comments.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('instances/:instanceId/thread')
@UseGuards(JwtAuthGuard)
export class CommentsController {
  constructor(private commentsService: CommentsService) {}

  @Get()
  async getThread(@Param('instanceId') instanceId: string) {
    return this.commentsService.getThread(instanceId);
  }

  @Post()
  async addComment(
    @Param('instanceId') instanceId: string,
    @Body() body: { content: string; parentCommentId?: string },
    @CurrentUser('id') userId: string,
  ) {
    return this.commentsService.addComment(
      instanceId,
      userId,
      body.content,
      body.parentCommentId,
    );
  }

  @Delete('comment/:commentId')
  async deleteComment(
    @Param('commentId') id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.commentsService.deleteComment(id, userId);
  }
}
