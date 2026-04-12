import { Test, TestingModule } from '@nestjs/testing';
import { CommentsController } from '../comments.controller';
import { CommentsService } from '../comments.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

describe('CommentsController', () => {
  let controller: CommentsController;
  let mockCommentsService: any;

  const mockComment = {
    id: 'comment-123',
    instanceId: 'inst-123',
    userId: 'user-123',
    content: 'This is a test comment',
    parentCommentId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    mockCommentsService = {
      getThread: jest.fn().mockResolvedValue([mockComment]),
      addComment: jest.fn().mockResolvedValue(mockComment),
      deleteComment: jest.fn().mockResolvedValue({ id: 'comment-123' }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CommentsController],
      providers: [
        { provide: CommentsService, useValue: mockCommentsService },
      ],
    })
      .overrideGuard(JwtAuthGuard).useValue({
        canActivate: (context) => {
          const request = context.switchToHttp().getRequest();
          request.user = { id: 'user-123', role: 'USER' };
          return true;
        },
      })
      .compile();

    controller = module.get<CommentsController>(CommentsController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getThread', () => {
    it('should return comments for an instance', async () => {
      const result = await controller.getThread('inst-123');

      expect(result).toEqual([mockComment]);
      expect(mockCommentsService.getThread).toHaveBeenCalledWith('inst-123');
    });

    it('should return empty array when no comments exist', async () => {
      mockCommentsService.getThread.mockResolvedValue([]);
      const result = await controller.getThread('inst-without-comments');

      expect(result).toEqual([]);
    });
  });

  describe('addComment', () => {
    it('should add a comment to an instance', async () => {
      const body = { content: 'This is a test comment' };

      const result = await controller.addComment('inst-123', body, 'user-123');

      expect(result).toEqual(mockComment);
      expect(mockCommentsService.addComment).toHaveBeenCalledWith(
        'inst-123',
        'user-123',
        'This is a test comment',
        undefined,
      );
    });

    it('should add a reply to an existing comment', async () => {
      const body = { content: 'This is a reply', parentCommentId: 'parent-123' };

      const result = await controller.addComment('inst-123', body, 'user-123');

      expect(result).toEqual(mockComment);
      expect(mockCommentsService.addComment).toHaveBeenCalledWith(
        'inst-123',
        'user-123',
        'This is a reply',
        'parent-123',
      );
    });
  });

  describe('deleteComment', () => {
    it('should delete a comment', async () => {
      const result = await controller.deleteComment('comment-123', 'user-123');

      expect(result).toEqual({ id: 'comment-123' });
      expect(mockCommentsService.deleteComment).toHaveBeenCalledWith('comment-123', 'user-123');
    });

    it('should throw error when deleting non-existent comment', async () => {
      mockCommentsService.deleteComment.mockRejectedValue(new Error('Comment not found'));

      await expect(controller.deleteComment('non-existent', 'user-123'))
        .rejects.toThrow('Comment not found');
    });

    it('should throw error when deleting another users comment', async () => {
      mockCommentsService.deleteComment.mockRejectedValue(new Error('Access denied'));

      await expect(controller.deleteComment('comment-123', 'other-user'))
        .rejects.toThrow('Access denied');
    });
  });
});
