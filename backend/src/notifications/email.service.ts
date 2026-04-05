import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { ConfigService } from '../config/configuration';

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export interface WorkflowNotification {
  to: string;
  workflowName: string;
  stepName: string;
  status: 'approved' | 'rejected' | 'pending';
  requesterName?: string;
  comment?: string;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter | null = null;

  constructor(private configService: ConfigService) {
    this.initializeTransporter();
  }

  private initializeTransporter() {
    const config = this.configService.getSmtpConfig();
    
    if (!config.enabled) {
      this.logger.log('SMTP is disabled - emails will be logged only');
      return;
    }

    if (!config.host) {
      this.logger.warn('SMTP host not configured');
      return;
    }

    this.transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: {
        user: config.user,
        pass: config.password,
      },
    });

    this.logger.log(`SMTP configured: ${config.host}:${config.port}`);
  }

  async sendEmail(options: EmailOptions): Promise<boolean> {
    const config = this.configService.getSmtpConfig();

    if (!config.enabled || !this.transporter) {
      this.logger.log(`[EMAIL MOCK] To: ${options.to}, Subject: ${options.subject}`);
      return true;
    }

    try {
      const info = await this.transporter.sendMail({
        from: config.from,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text || options.html.replace(/<[^>]*>/g, ''),
      });

      this.logger.log(`Email sent: ${info.messageId}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to send email: ${error.message}`);
      return false;
    }
  }

  async sendWorkflowNotification(notification: WorkflowNotification): Promise<boolean> {
    const statusEmoji = {
      approved: '✅',
      rejected: '❌',
      pending: '⏳',
    };

    const statusText = {
      approved: 'Approved',
      rejected: 'Rejected',
      pending: 'Pending Your Action',
    };

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Workflow Notification</h2>
        <div style="background: #f5f5f5; padding: 20px; border-radius: 8px;">
          <p><strong>Workflow:</strong> ${notification.workflowName}</p>
          <p><strong>Step:</strong> ${notification.stepName}</p>
          <p><strong>Status:</strong> ${statusEmoji[notification.status]} ${statusText[notification.status]}</p>
          ${notification.requesterName ? `<p><strong>Requester:</strong> ${notification.requesterName}</p>` : ''}
          ${notification.comment ? `<p><strong>Comment:</strong> ${notification.comment}</p>` : ''}
        </div>
        <p style="color: #666; margin-top: 20px;">
          This is an automated notification from ServiceFlow.
        </p>
      </div>
    `;

    return this.sendEmail({
      to: notification.to,
      subject: `[ServiceFlow] ${statusEmoji[notification.status]} ${notification.workflowName} - ${statusText[notification.status]}`,
      html,
    });
  }

  async sendPasswordResetEmail(to: string, resetToken: string): Promise<boolean> {
    const resetUrl = `${process.env['FRONTEND_URL'] || 'http://localhost:4200'}/reset-password?token=${resetToken}`;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Password Reset Request</h2>
        <p>You requested a password reset for your ServiceFlow account.</p>
        <p>Click the link below to reset your password:</p>
        <a href="${resetUrl}" style="display: inline-block; background: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin: 20px 0;">
          Reset Password
        </a>
        <p style="color: #666; font-size: 14px;">
          This link will expire in 1 hour.<br>
          If you didn't request this, please ignore this email.
        </p>
      </div>
    `;

    return this.sendEmail({
      to,
      subject: '[ServiceFlow] Password Reset Request',
      html,
    });
  }

  async sendWelcomeEmail(to: string, name: string): Promise<boolean> {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Welcome to ServiceFlow!</h2>
        <p>Hello ${name},</p>
        <p>Your ServiceFlow account has been created successfully.</p>
        <p>You can now:</p>
        <ul>
          <li>Create and manage forms</li>
          <li>Design workflow automation</li>
          <li>Track approvals and submissions</li>
        </ul>
        <p>Click below to access the platform:</p>
        <a href="${process.env['FRONTEND_URL'] || 'http://localhost:4200'}" style="display: inline-block; background: #28a745; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px;">
          Go to ServiceFlow
        </a>
      </div>
    `;

    return this.sendEmail({
      to,
      subject: 'Welcome to ServiceFlow!',
      html,
    });
  }
}
