import { Injectable } from '@nestjs/common';

@Injectable()
export class EmailService {
  async sendEmail(to: string, subject: string, body: string): Promise<{ success: boolean; error?: string }> {
    // TODO: Implement with Nodemailer
    // For now, just log the email
    console.log(`[EMAIL] To: ${to}, Subject: ${subject}`);
    console.log(`[EMAIL] Body: ${body}`);
    return { success: true };
  }

  async sendApprovalRequest(to: string, workflowName: string, requesterName: string) {
    return this.sendEmail(
      to,
      `Approval Required: ${workflowName}`,
      `Dear Approver,\n\n${requesterName} has submitted a request for "${workflowName}" and requires your approval.\n\nPlease login to review and approve/reject the request.\n\nBest regards,\nService Workflow Platform`,
    );
  }

  async sendApprovalNotification(to: string, workflowName: string, decision: 'APPROVED' | 'REJECTED', comment?: string) {
    const statusText = decision === 'APPROVED' ? 'approved' : 'rejected';
    const body = `Dear User,\n\nYour request "${workflowName}" has been ${statusText}.\n\n${comment ? `Comment: ${comment}\n\n` : ''}Best regards,\nService Workflow Platform`;

    return this.sendEmail(
      to,
      `Request ${decision}: ${workflowName}`,
      body,
    );
  }

  async sendWorkflowStarted(to: string, workflowName: string) {
    return this.sendEmail(
      to,
      `Workflow Started: ${workflowName}`,
      `Dear User,\n\nYour workflow "${workflowName}" has been started successfully.\n\nBest regards,\nService Workflow Platform`,
    );
  }

  async sendWorkflowCompleted(to: string, workflowName: string) {
    return this.sendEmail(
      to,
      `Workflow Completed: ${workflowName}`,
      `Dear User,\n\nYour workflow "${workflowName}" has been completed successfully.\n\nBest regards,\nService Workflow Platform`,
    );
  }
}
