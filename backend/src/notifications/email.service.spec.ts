import { Test, TestingModule } from '@nestjs/testing';
import { EmailService, EmailOptions, WorkflowNotification } from './email.service';
import { ConfigService } from '../config/configuration';

// Mock nodemailer
jest.mock('nodemailer', () => ({
  createTransport: jest.fn(() => ({
    sendMail: jest.fn(),
  })),
}));

import * as nodemailer from 'nodemailer';

describe('EmailService', () => {
  let service: EmailService;
  let mockConfigService: any;
  let mockTransporter: any;

  const mockSmtpConfig = {
    enabled: true,
    host: 'smtp.example.com',
    port: 587,
    secure: false,
    user: 'user@example.com',
    password: 'password',
    from: 'noreply@example.com',
  };

  beforeEach(async () => {
    mockTransporter = {
      sendMail: jest.fn(),
    };
    (nodemailer.createTransport as jest.Mock).mockReturnValue(mockTransporter);

    mockConfigService = {
      getSmtpConfig: jest.fn().mockReturnValue(mockSmtpConfig),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailService,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<EmailService>(EmailService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('sendEmail', () => {
    it('should return true when SMTP is disabled (mock mode)', async () => {
      mockConfigService.getSmtpConfig.mockReturnValue({ ...mockSmtpConfig, enabled: false });

      const options: EmailOptions = {
        to: 'test@example.com',
        subject: 'Test Subject',
        html: '<p>Test content</p>',
      };

      const result = await service.sendEmail(options);

      expect(result).toBe(true);
    });

    it('should send email successfully', async () => {
      mockTransporter.sendMail.mockResolvedValue({ messageId: 'msg-123' });

      const options: EmailOptions = {
        to: 'test@example.com',
        subject: 'Test Subject',
        html: '<p>Test content</p>',
      };

      const result = await service.sendEmail(options);

      expect(result).toBe(true);
      expect(mockTransporter.sendMail).toHaveBeenCalledWith({
        from: mockSmtpConfig.from,
        to: 'test@example.com',
        subject: 'Test Subject',
        html: '<p>Test content</p>',
        text: 'Test content',
      });
    });

    it('should return false when sendMail fails', async () => {
      mockTransporter.sendMail.mockRejectedValue(new Error('SMTP error'));

      const options: EmailOptions = {
        to: 'test@example.com',
        subject: 'Test Subject',
        html: '<p>Test content</p>',
      };

      const result = await service.sendEmail(options);

      expect(result).toBe(false);
    });

    it('should strip HTML tags for text version', async () => {
      mockTransporter.sendMail.mockResolvedValue({ messageId: 'msg-123' });

      const options: EmailOptions = {
        to: 'test@example.com',
        subject: 'Test Subject',
        html: '<p>Test <strong>content</strong></p>',
      };

      await service.sendEmail(options);

      expect(mockTransporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          text: 'Test content',
        }),
      );
    });
  });

  describe('sendWorkflowNotification', () => {
    it('should send approval notification email', async () => {
      mockTransporter.sendMail.mockResolvedValue({ messageId: 'msg-123' });

      const notification: WorkflowNotification = {
        to: 'user@example.com',
        workflowName: 'Test Workflow',
        stepName: 'Manager Approval',
        status: 'approved',
        requesterName: 'John Doe',
        comment: 'Looks good',
      };

      const result = await service.sendWorkflowNotification(notification);

      expect(result).toBe(true);
      const sentMail = mockTransporter.sendMail.mock.calls[0][0];
      expect(sentMail.to).toBe('user@example.com');
      expect(sentMail.subject).toContain('[ServiceFlow]');
      expect(sentMail.html).toContain('Test Workflow');
      expect(sentMail.html).toContain('Manager Approval');
      expect(sentMail.html).toContain('Approved');
    });

    it('should send rejection notification email', async () => {
      mockTransporter.sendMail.mockResolvedValue({ messageId: 'msg-123' });

      const notification: WorkflowNotification = {
        to: 'user@example.com',
        workflowName: 'Test Workflow',
        stepName: 'Manager Approval',
        status: 'rejected',
      };

      await service.sendWorkflowNotification(notification);

      expect(mockTransporter.sendMail.mock.calls[0][0].html).toContain('Rejected');
    });

    it('should send pending notification email', async () => {
      mockTransporter.sendMail.mockResolvedValue({ messageId: 'msg-123' });

      const notification: WorkflowNotification = {
        to: 'user@example.com',
        workflowName: 'Test Workflow',
        stepName: 'Manager Approval',
        status: 'pending',
      };

      await service.sendWorkflowNotification(notification);

      expect(mockTransporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          html: expect.stringContaining('Pending Your Action'),
        }),
      );
    });
  });

  describe('sendPasswordResetEmail', () => {
    it('should send password reset email', async () => {
      mockTransporter.sendMail.mockResolvedValue({ messageId: 'msg-123' });

      const result = await service.sendPasswordResetEmail('user@example.com', 'reset-token-123');

      expect(result).toBe(true);
      const sentMail = mockTransporter.sendMail.mock.calls[0][0];
      expect(sentMail.to).toBe('user@example.com');
      expect(sentMail.subject).toBe('[ServiceFlow] Password Reset Request');
      expect(sentMail.html).toContain('reset-password');
      expect(sentMail.html).toContain('reset-token-123');
    });

    it('should use FRONTEND_URL from environment', async () => {
      process.env.FRONTEND_URL = 'https://custom.example.com';
      mockTransporter.sendMail.mockResolvedValue({ messageId: 'msg-123' });

      await service.sendPasswordResetEmail('user@example.com', 'token');

      expect(mockTransporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          html: expect.stringContaining('https://custom.example.com'),
        }),
      );

      delete process.env.FRONTEND_URL;
    });
  });

  describe('sendWelcomeEmail', () => {
    it('should send welcome email', async () => {
      mockTransporter.sendMail.mockResolvedValue({ messageId: 'msg-123' });

      const result = await service.sendWelcomeEmail('user@example.com', 'John Doe');

      expect(result).toBe(true);
      const sentMail = mockTransporter.sendMail.mock.calls[0][0];
      expect(sentMail.to).toBe('user@example.com');
      expect(sentMail.subject).toBe('Welcome to ServiceFlow!');
      expect(sentMail.html).toContain('John Doe');
      expect(sentMail.html).toContain('Welcome to ServiceFlow!');
    });

    it('should include FRONTEND_URL link', async () => {
      process.env.FRONTEND_URL = 'https://custom.example.com';
      mockTransporter.sendMail.mockResolvedValue({ messageId: 'msg-123' });

      await service.sendWelcomeEmail('user@example.com', 'John Doe');

      expect(mockTransporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          html: expect.stringContaining('https://custom.example.com'),
        }),
      );

      delete process.env.FRONTEND_URL;
    });
  });
});
