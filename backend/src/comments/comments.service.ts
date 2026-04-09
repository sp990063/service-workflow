import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class CommentsService {
  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
  ) {}

  /**
   * Parse @username mentions from comment text
   * Returns array of mentioned usernames (without @)
   */
  parseMentions(text: string): string[] {
    const mentionRegex = /@(\w+)/g;
    const matches = text.matchAll(mentionRegex);
    const usernames: string[] = [];
    for (const match of matches) {
      usernames.push(match[1]);
    }
    return [...new Set(usernames)]; // dedupe
  }

  /**
   * Get all comments for a workflow instance (thread)
   * Returns top-level comments with nested replies
   */
  async getThread(instanceId: string) {
    // Get top-level comments (no parentCommentId)
    const topLevelComments = await this.prisma.comment.findMany({
      where: { instanceId, parentCommentId: null },
      orderBy: { createdAt: 'asc' },
    });

    // Get all replies for these comments
    const topLevelIds = topLevelComments.map(c => c.id);
    const replies = topLevelIds.length > 0
      ? await this.prisma.comment.findMany({
          where: { parentCommentId: { in: topLevelIds } },
          orderBy: { createdAt: 'asc' },
        })
      : [];

    // Group replies by parentCommentId
    const repliesByParent = new Map<string, typeof replies>();
    for (const reply of replies) {
      const list = repliesByParent.get(reply.parentCommentId!) || [];
      list.push(reply);
      repliesByParent.set(reply.parentCommentId!, list);
    }

    // Get all author IDs and mentioned user IDs
    const allComments = [...topLevelComments, ...replies];
    const authorIds = allComments.map(c => c.authorId);
    const allMentionedUserIds = allComments.flatMap(c => JSON.parse(c.mentionedUsers || '[]'));
    const userIds = [...new Set([...authorIds, ...allMentionedUserIds])];

    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true, email: true },
    });
    const userMap = new Map(users.map(u => [u.id, u]));

    const formatComment = (comment: typeof topLevelComments[0]) => {
      const mentionedUserIds = JSON.parse(comment.mentionedUsers || '[]');
      return {
        id: comment.id,
        content: comment.content,
        createdAt: comment.createdAt,
        author: userMap.get(comment.authorId) ? { id: userMap.get(comment.authorId)!.id, name: userMap.get(comment.authorId)!.name, email: userMap.get(comment.authorId)!.email } : null,
        mentionedUsers: mentionedUserIds.map((id: string) => userMap.get(id)).filter(Boolean).map(u => ({ id: u!.id, name: u!.name, email: u!.email })),
      };
    };

    // Combine comments with replies
    return topLevelComments.map(comment => ({
      ...formatComment(comment),
      replies: (repliesByParent.get(comment.id) || []).map(reply => formatComment(reply)),
    }));
  }

  /**
   * Add a comment to a workflow instance
   */
  async addComment(
    instanceId: string,
    userId: string,
    content: string,
    parentCommentId?: string,
  ) {
    // Parse @mentions
    const mentionedUsernames = this.parseMentions(content);

    // Resolve mentioned usernames to user IDs
    const mentionedUsers = await this.prisma.user.findMany({
      where: {
        OR: mentionedUsernames.map(username => ({
          name: { contains: username, mode: 'insensitive' },
        })),
      },
      select: { id: true, name: true, email: true },
    });

    const mentionedUserIds = mentionedUsers.map(u => u.id);

    // Create comment
    const comment = await this.prisma.comment.create({
      data: {
        instanceId,
        authorId: userId,
        content,
        parentCommentId: parentCommentId || null,
        mentionedUsers: JSON.stringify(mentionedUserIds),
      },
    });

    // Create notifications for mentioned users (not the commenter)
    const instance = await this.prisma.workflowInstance.findUnique({
      where: { id: instanceId },
      include: { workflow: true },
    });

    const commenter = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { name: true },
    });

    for (const mentionedUser of mentionedUsers) {
      if (mentionedUser.id !== userId) {
        await this.notificationsService.create(
          mentionedUser.id,
          'MENTION',
          'You were mentioned in a comment',
          `${commenter?.name || 'Someone'} mentioned you in a comment on "${instance?.workflow?.name || 'workflow'}"`,
          { instanceId, commentId: comment.id, mentionedBy: userId },
        );
      }
    }

    return {
      id: comment.id,
      content: comment.content,
      createdAt: comment.createdAt,
      author: { id: userId, name: commenter?.name, email: '' },
      mentionedUsers: mentionedUsers.map(u => ({ id: u.id, name: u.name, email: u.email })),
      replies: [],
    };
  }

  /**
   * Get a single comment by ID
   */
  async getComment(id: string) {
    return this.prisma.comment.findUnique({ where: { id } });
  }

  /**
   * Delete a comment (only if owned by user)
   */
  async deleteComment(id: string, userId: string) {
    const comment = await this.prisma.comment.findUnique({ where: { id } });
    if (!comment) return null;
    if (comment.authorId !== userId) throw new Error('Access denied');
    return this.prisma.comment.delete({ where: { id } });
  }
}
