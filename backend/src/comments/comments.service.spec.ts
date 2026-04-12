import { Test, TestingModule } from '@nestjs/testing';
import { CommentsService } from './comments.service';
import { PrismaService } from '../prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

describe('CommentsService', () => {
  let service: CommentsService;
  let mockPrisma: any;
  let mockNotificationsService: any;

  const mockUser = {
    id: 'user-123',
    name: 'Test User',
    email: 'test@example.com',
  };

  const mockInstance = {
    id: 'instance-123',
    workflow: { id: 'wf-123', name: 'Test Workflow' },
  };

  const mockComment = {
    id: 'comment-123',
    instanceId: 'instance-123',
    authorId: 'user-123',
    content: 'This is a test comment',
    parentCommentId: null,
    mentionedUsers: '[]',
    createdAt: new Date(),
  };

  beforeEach(async () => {
    mockPrisma = {
      comment: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        delete: jest.fn(),
      },
      user: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
      },
      workflowInstance: {
        findUnique: jest.fn(),
      },
    };

    mockNotificationsService = {
      create: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CommentsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: NotificationsService, useValue: mockNotificationsService },
      ],
    }).compile();

    service = module.get<CommentsService>(CommentsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('parseMentions', () => {
    it('should parse single @mention from text', () => {
      const result = service.parseMentions('Hello @john how are you?');
      expect(result).toEqual(['john']);
    });

    it('should parse multiple @mentions from text', () => {
      const result = service.parseMentions('Hello @john and @jane, please review');
      expect(result).toEqual(['john', 'jane']);
    });

    it('should deduplicate @mentions', () => {
      const result = service.parseMentions('@john please help @john with this');
      expect(result).toEqual(['john']);
    });

    it('should return empty array when no mentions', () => {
      const result = service.parseMentions('Hello world without mentions');
      expect(result).toEqual([]);
    });

    it('should handle mentions with underscores', () => {
      const result = service.parseMentions('Hey @john_doe please check');
      expect(result).toEqual(['john_doe']);
    });

    it('should handle mentions with numbers', () => {
      const result = service.parseMentions('Hey @user123 please check');
      expect(result).toEqual(['user123']);
    });
  });

  describe('getThread', () => {
    it('should return top-level comments with replies', async () => {
      const topLevelComments = [
        { ...mockComment, id: 'comment-1', mentionedUsers: '[]' },
        { ...mockComment, id: 'comment-2', authorId: 'user-456', mentionedUsers: '[]' },
      ];
      const replies = [
        { ...mockComment, id: 'reply-1', parentCommentId: 'comment-1', mentionedUsers: '[]' },
      ];

      mockPrisma.comment.findMany
        .mockResolvedValueOnce(topLevelComments) // top-level
        .mockResolvedValueOnce(replies); // replies

      mockPrisma.user.findMany.mockResolvedValue([mockUser]);

      const result = await service.getThread('instance-123');

      expect(result).toHaveLength(2);
      expect(result[0].replies).toHaveLength(1);
      expect(mockPrisma.comment.findMany).toHaveBeenCalledTimes(2);
    });

    it('should return empty thread when no comments', async () => {
      mockPrisma.comment.findMany.mockResolvedValueOnce([]).mockResolvedValueOnce([]);
      mockPrisma.user.findMany.mockResolvedValue([]);

      const result = await service.getThread('instance-123');

      expect(result).toEqual([]);
    });

    it('should handle comments with mentioned users', async () => {
      const topLevelComments = [
        { ...mockComment, id: 'comment-1', mentionedUsers: JSON.stringify(['user-456']) },
      ];

      mockPrisma.comment.findMany
        .mockResolvedValueOnce(topLevelComments)
        .mockResolvedValueOnce([]);

      mockPrisma.user.findMany.mockResolvedValue([
        mockUser,
        { id: 'user-456', name: 'Mentioned User', email: 'mentioned@example.com' },
      ]);

      const result = await service.getThread('instance-123');

      expect(result).toHaveLength(1);
      expect(result[0].mentionedUsers).toHaveLength(1);
      expect(result[0].mentionedUsers[0].name).toBe('Mentioned User');
    });
  });

  describe('addComment', () => {
    it('should create a comment without mentions', async () => {
      const createdComment = { ...mockComment, id: 'new-comment', content: 'Test comment' };
      mockPrisma.comment.create.mockResolvedValue(createdComment);
      mockPrisma.workflowInstance.findUnique.mockResolvedValue(mockInstance);
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.user.findMany.mockResolvedValue([]);

      const result = await service.addComment('instance-123', 'user-123', 'Test comment');

      expect(result.content).toBe('Test comment');
      expect(mockPrisma.comment.create).toHaveBeenCalledWith({
        data: {
          instanceId: 'instance-123',
          authorId: 'user-123',
          content: 'Test comment',
          parentCommentId: null,
          mentionedUsers: '[]',
        },
      });
    });

    it('should create a comment with @mentions and send notifications', async () => {
      const createdComment = { ...mockComment, id: 'new-comment', content: 'Hey @jane please check' };
      const mentionedUser = { id: 'user-456', name: 'Jane', email: 'jane@example.com' };

      mockPrisma.comment.create.mockResolvedValue(createdComment);
      mockPrisma.workflowInstance.findUnique.mockResolvedValue(mockInstance);
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.user.findMany.mockResolvedValue([mentionedUser]);

      const result = await service.addComment('instance-123', 'user-123', 'Hey @jane please check');

      expect(result.mentionedUsers).toHaveLength(1);
      expect(result.mentionedUsers[0].name).toBe('Jane');
      expect(mockNotificationsService.create).toHaveBeenCalledWith(
        'user-456',
        'MENTION',
        'You were mentioned in a comment',
        expect.stringContaining('Test User'),
        expect.objectContaining({ instanceId: 'instance-123', commentId: 'new-comment' }),
      );
    });

    it('should not notify self when mentioning yourself', async () => {
      const createdComment = { ...mockComment, id: 'new-comment', content: 'Talking to myself @testuser' };
      const mentionedUser = { id: 'user-123', name: 'Test User', email: 'test@example.com' };

      mockPrisma.comment.create.mockResolvedValue(createdComment);
      mockPrisma.workflowInstance.findUnique.mockResolvedValue(mockInstance);
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.user.findMany.mockResolvedValue([mentionedUser]);

      await service.addComment('instance-123', 'user-123', 'Talking to myself @testuser');

      expect(mockNotificationsService.create).not.toHaveBeenCalled();
    });

    it('should create a reply to an existing comment', async () => {
      const createdComment = { ...mockComment, id: 'reply-comment', parentCommentId: 'parent-123' };
      mockPrisma.comment.create.mockResolvedValue(createdComment);
      mockPrisma.workflowInstance.findUnique.mockResolvedValue(mockInstance);
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.user.findMany.mockResolvedValue([]);

      const result = await service.addComment('instance-123', 'user-123', 'This is a reply', 'parent-123');

      expect(mockPrisma.comment.create).toHaveBeenCalledWith({
        data: {
          instanceId: 'instance-123',
          authorId: 'user-123',
          content: 'This is a reply',
          parentCommentId: 'parent-123',
          mentionedUsers: '[]',
        },
      });
    });
  });

  describe('getComment', () => {
    it('should return a comment by id', async () => {
      mockPrisma.comment.findUnique.mockResolvedValue(mockComment);

      const result = await service.getComment('comment-123');

      expect(result).toEqual(mockComment);
      expect(mockPrisma.comment.findUnique).toHaveBeenCalledWith({ where: { id: 'comment-123' } });
    });

    it('should return null for non-existent comment', async () => {
      mockPrisma.comment.findUnique.mockResolvedValue(null);

      const result = await service.getComment('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('deleteComment', () => {
    it('should delete a comment owned by the user', async () => {
      mockPrisma.comment.findUnique.mockResolvedValue(mockComment);
      mockPrisma.comment.delete.mockResolvedValue(mockComment);

      const result = await service.deleteComment('comment-123', 'user-123');

      expect(result).toEqual(mockComment);
      expect(mockPrisma.comment.delete).toHaveBeenCalledWith({ where: { id: 'comment-123' } });
    });

    it('should return null if comment not found', async () => {
      mockPrisma.comment.findUnique.mockResolvedValue(null);

      const result = await service.deleteComment('non-existent', 'user-123');

      expect(result).toBeNull();
      expect(mockPrisma.comment.delete).not.toHaveBeenCalled();
    });

    it('should throw error if user is not the author', async () => {
      mockPrisma.comment.findUnique.mockResolvedValue(mockComment);

      await expect(service.deleteComment('comment-123', 'different-user'))
        .rejects.toThrow('Access denied');
    });
  });
});