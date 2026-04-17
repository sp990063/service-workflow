import { Component, OnInit, signal, computed, ElementRef, ViewChild, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';
import { WorkflowService } from '../../core/services/workflow.service';
import { AuthService } from '../../core/services/auth.service';
import { Workflow, WorkflowNode } from '../../core/models';

// WorkflowInstance interface - defined locally since not exported from service
interface WorkflowInstance {
  id: string;
  displayId?: string;
  workflowId: string;
  userId: string;
  currentNodeId: string | null;
  status: string;
  formData: Record<string, any>;
  history: Array<{nodeId: string; action: string; timestamp: string | Date; comment?: string}>;
  createdAt: string;
  updatedAt: string;
  user?: { id: string; name: string; email: string };
  workflow?: Workflow;
}

interface Comment {
  id: string;
  content: string;
  userId: string;
  parentCommentId: string | null;
  author?: { id: string; name: string; email: string };
  mentionedUsers?: Array<{ id: string; name: string; email: string }>;
  createdAt: string;
  replies?: Comment[];
  replyCount?: number;
}

interface ApprovalHistoryEntry {
  nodeId: string;
  nodeLabel: string;
  action: string;
  timestamp: string | Date;
  comment?: string;
  approver?: string;
}

type NodeStatus = 'COMPLETED' | 'IN_PROGRESS' | 'PENDING';

interface WorkflowStep {
  node: WorkflowNode;
  status: NodeStatus;
  completedAt?: Date | string;
}

@Component({
  selector: 'app-workflow-instance-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="instance-detail">
      @if (loading()) {
        <div class="loading">Loading workflow instance...</div>
      } @else if (!instance()) {
        <div class="not-found">
          <h2>Workflow Instance Not Found</h2>
          <p>The workflow instance you're looking for doesn't exist.</p>
          <a routerLink="/workflows" class="btn btn-secondary">Back to Workflows</a>
        </div>
      } @else {
        <!-- Header -->
        <header class="detail-header">
          <div class="header-info">
            <div class="header-row">
              <h1>{{ instance()!.displayId || 'WF-' + instance()!.id.slice(0, 8) }}</h1>
              <span class="status-badge" [class]="getStatusClass(instance()!.status)">
                {{ formatStatus(instance()!.status) }}
              </span>
            </div>
            @if (instance()!.user) {
              <div class="workflow-name">{{ instance()!.workflow?.name || 'Workflow' }}</div>
            }
          </div>
          <a routerLink="/workflows" class="btn btn-secondary">← Back</a>
        </header>

        <!-- Sticky Action Bar - shows when user has pending approval actions -->
        @if (isInProgress() && currentStep() && (currentStep()!.node.type === 'approval' || currentStep()!.node.type === 'parallel' || currentStep()!.node.type === 'task')) {
          <div class="sticky-action-bar">
            <div class="sticky-action-content">
              <div class="action-info">
                <span class="action-label">Pending Your Action</span>
                <span class="action-detail">{{ currentStep()!.node.data['label'] || currentStep()!.node.type }} - {{ getNodeTypeLabel(currentStep()!.node.type) }}</span>
              </div>
              <div class="action-buttons-sticky">
                @if (currentStep()!.node.type === 'parallel') {
                  <span class="parallel-info">{{ getParallelProgress() }}</span>
                  @if (canApproveParallel()) {
                    <button class="btn btn-success" (click)="approve()">✓ Approve</button>
                  } @else {
                    <span class="already-approved-badge">✓ You approved</span>
                  }
                } @else {
                  <button class="btn btn-success" (click)="approve()">✓ Approve</button>
                  <button class="btn btn-danger" (click)="reject()">✗ Reject</button>
                  <button class="btn btn-secondary" (click)="requestInfo()">? Request Info</button>
                }
              </div>
            </div>
          </div>
        }

        <!-- Applicant Info -->
        <section class="applicant-section">
          <h2>Applicant Information</h2>
          <div class="info-grid">
            <div class="info-item">
              <span class="info-label">Applicant</span>
              <span class="info-value">{{ instance()!.user?.name || 'Unknown' }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Email</span>
              <span class="info-value">{{ instance()!.user?.email || '-' }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Submitted</span>
              <span class="info-value">{{ instance()!.createdAt | date:'medium' }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Last Updated</span>
              <span class="info-value">{{ instance()!.updatedAt | date:'medium' }}</span>
            </div>
          </div>
        </section>

        <!-- Workflow Steps -->
        <section class="workflow-steps">
          <div class="steps-header">
            <h2>Workflow Progress</h2>
            <span class="step-counter">{{ getCurrentStepNumber() }} of {{ steps().length }} steps</span>
          </div>
          <div class="steps-timeline">
            @for (step of steps(); track step.node.id; let i = $index) {
              <div
                class="step-card"
                [class.completed]="step.status === 'COMPLETED'"
                [class.in-progress]="step.status === 'IN_PROGRESS'"
                [class.pending]="step.status === 'PENDING'"
                [class.rejected]="step.status === 'REJECTED'"
              >
                <div class="step-indicator">
                  @if (step.status === 'COMPLETED') {
                    <span class="icon completed-icon">✓</span>
                  } @else if (step.status === 'IN_PROGRESS') {
                    <span class="icon in-progress-icon">⟳</span>
                  } @else if (step.status === 'REJECTED') {
                    <span class="icon rejected-icon">✗</span>
                  } @else {
                    <span class="icon pending-icon">⏳</span>
                  }
                </div>
                <div class="step-avatar" [class.has-assignee]="getStepAssignee(step)">
                  {{ getInitials(getStepAssignee(step)) }}
                </div>
                <div class="step-content">
                  <div class="step-name">
                    {{ step.node.data['label'] || step.node.type }}
                  </div>
                  <div class="step-type">{{ getNodeTypeLabel(step.node.type) }}</div>
                  @if (step.completedAt) {
                    <div class="step-time">Completed {{ step.completedAt | date:'short' }}</div>
                  }
                  @if (step.status === 'IN_PROGRESS') {
                    <div class="current-marker">← Current</div>
                  }
                </div>
                <div class="step-status-badge" [class]="step.status.toLowerCase()">
                  {{ step.status === 'IN_PROGRESS' ? 'IN PROGRESS' : step.status }}
                </div>
              </div>
            }
          </div>
        </section>

        <!-- History Timeline -->
        <section class="history-section">
          <h2>Approval History</h2>
          @if (approvalHistory().length === 0) {
            <p class="no-history">No approvals yet.</p>
          } @else {
            <div class="approval-timeline">
              @for (entry of approvalHistory(); track entry.timestamp) {
                <div class="approval-entry">
                  <div class="approval-icon" [class]="getApprovalIconClass(entry)">
                    {{ getApprovalIcon(entry) }}
                  </div>
                  <div class="approval-content">
                    <div class="approval-header">
                      <span class="approval-action">{{ entry.action }}</span>
                      <span class="approval-time">{{ entry.timestamp | date:'medium' }}</span>
                    </div>
                    @if (entry.nodeLabel) {
                      <div class="approval-node">{{ entry.nodeLabel }}</div>
                    }
                    @if (entry.approver) {
                      <div class="approval-approver">by {{ entry.approver }}</div>
                    }
                    @if (entry.comment) {
                      <div class="approval-comment">"{{ entry.comment }}"</div>
                    }
                  </div>
                </div>
              }
            </div>
          }
        </section>

        <!-- Discussion Thread -->
        <section class="discussion-section">
          <h2>Discussion Thread</h2>
          
          <!-- Comment List -->
          <div class="comment-list">
            @if (comments().length === 0) {
              <p class="no-comments">No comments yet. Start the discussion!</p>
            } @else {
              @for (comment of comments(); track comment.id) {
                <div class="comment-item">
                  <div class="comment-header">
                    <span class="comment-author">{{ comment.author?.name || 'Unknown' }}</span>
                    <span class="comment-time">{{ comment.createdAt | date:'medium' }}</span>
                  </div>
                  <div class="comment-body">{{ comment.content }}</div>
                  @if (comment.mentionedUsers && comment.mentionedUsers.length > 0) {
                    <div class="comment-mentions">
                      @for (user of comment.mentionedUsers; track user.id) {
                        <span class="mention-badge">{{ '@' + user.name }}</span>
                      }
                    </div>
                  }
                  <div class="comment-actions">
                    <button class="reply-btn" (click)="startReply(comment)">Reply</button>
                  </div>

                  <!-- Replies -->
                  @if (comment.replies && comment.replies.length > 0) {
                    <div class="reply-list">
                      @for (reply of comment.replies; track reply.id) {
                        <div class="reply-item">
                          <div class="comment-header">
                            <span class="comment-author">{{ reply.author?.name || 'Unknown' }}</span>
                            <span class="comment-time">{{ reply.createdAt | date:'short' }}</span>
                          </div>
                          <div class="comment-body">{{ reply.content }}</div>
                          @if (reply.mentionedUsers && reply.mentionedUsers.length > 0) {
                            <div class="comment-mentions">
                              @for (user of reply.mentionedUsers; track user.id) {
                                <span class="mention-badge">{{ '@' + user.name }}</span>
                              }
                            </div>
                          }
                        </div>
                      }
                    </div>
                  }

                  <!-- Reply Input -->
                  @if (replyingTo() === comment.id) {
                    <div class="reply-input-area">
                      <div class="textarea-wrapper">
                        <textarea 
                          #replyTextarea
                          [(ngModel)]="replyText" 
                          (input)="onReplyInput($event)"
                          placeholder="Write a reply... Use @name to mention"
                          class="comment-textarea"
                          rows="2"
                        ></textarea>
                        <!-- @mention dropdown for reply -->
                        @if (showMentionDropdown() && activeMentionTextarea() === 'reply') {
                          <div class="mention-dropdown">
                            @if (mentionResults().length === 0) {
                              <div class="mention-empty">No users found</div>
                            } @else {
                              @for (user of mentionResults(); track user.id) {
                                <div class="mention-item" (click)="selectMention(user)">
                                  <span class="mention-name">{{ user.name }}</span>
                                  <span class="mention-email">{{ user.email }}</span>
                                </div>
                              }
                            }
                          </div>
                        }
                      </div>
                      <div class="reply-actions">
                        <button class="btn btn-sm btn-secondary" (click)="cancelReply()">Cancel</button>
                        <button class="btn btn-sm btn-primary" (click)="submitReply(comment.id)" [disabled]="!replyText.trim()">Post Reply</button>
                      </div>
                    </div>
                  }
                </div>
              }
            }
          </div>

          <!-- New Comment Input -->
          <div class="new-comment-area">
            <div class="textarea-wrapper">
              <textarea 
                #newCommentTextarea
                [(ngModel)]="newComment" 
                (input)="onNewCommentInput($event)"
                placeholder="Add a comment... Use @name to mention someone"
                class="comment-textarea"
                rows="3"
              ></textarea>
              <!-- @mention autocomplete dropdown -->
              @if (showMentionDropdown() && activeMentionTextarea() === 'newComment') {
                <div class="mention-dropdown">
                  @if (mentionResults().length === 0) {
                    <div class="mention-empty">No users found</div>
                  } @else {
                    @for (user of mentionResults(); track user.id) {
                      <div class="mention-item" (click)="selectMention(user)">
                        <span class="mention-name">{{ user.name }}</span>
                        <span class="mention-email">{{ user.email }}</span>
                      </div>
                    }
                  }
                </div>
              }
            </div>
            <div class="comment-actions-row">
              <span class="hint-text">Use &#64;username to mention someone</span>
              <button class="btn btn-primary" (click)="submitComment()" [disabled]="!newComment.trim()">Post Comment</button>
            </div>
          </div>
        </section>

      }
    </div>
  `,
  styles: [`
    .instance-detail {
      max-width: 900px;
      margin: 0 auto;
      padding: 2rem;
    }
    .loading, .not-found {
      text-align: center;
      padding: 4rem 2rem;
    }
    .detail-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 2rem;
      padding: 1.5rem;
      background: var(--color-surface);
      border-radius: var(--radius-lg);
    }
    .detail-header h1 {
      font-size: 1.5rem;
      margin-bottom: 0.5rem;
    }
    .header-meta {
      display: flex;
      align-items: center;
      gap: 1rem;
    }
    .status-badge {
      padding: 0.25rem 0.75rem;
      border-radius: var(--radius-sm);
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
    }
    .status-badge.pending { background: #fef3c7; color: #92400e; }
    .status-badge.in-progress { background: #dbeafe; color: #1e40af; }
    .status-badge.waiting-for-child { background: #ede9fe; color: #5b21b6; }
    .status-badge.completed { background: #d1fae5; color: #065f46; }
    .current-step {
      color: var(--color-text-muted);
      font-size: 0.875rem;
    }
    
    /* Steps Timeline */
    .workflow-steps {
      background: var(--color-surface);
      border-radius: var(--radius-lg);
      padding: 1.5rem;
      margin-bottom: 1.5rem;
    }
    .steps-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1rem;
    }
    .workflow-steps h2 {
      font-size: 1.125rem;
      margin: 0;
    }
    .step-counter {
      font-size: 0.875rem;
      color: var(--color-text-muted);
      background: var(--color-background);
      padding: 0.25rem 0.75rem;
      border-radius: var(--radius-sm);
    }
    .steps-timeline {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }
    .step-card {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 1rem;
      border-radius: var(--radius-md);
      background: var(--color-background);
      border-left: 4px solid transparent;
    }
    .step-card.completed {
      border-left-color: var(--color-success);
    }
    .step-card.in-progress {
      border-left-color: var(--color-warning);
      background: #fffbeb;
    }
    .step-card.pending {
      border-left-color: #d1d5db;
      opacity: 0.7;
    }
    .step-card.rejected {
      border-left-color: var(--color-danger);
      background: #fef2f2;
    }
    .step-indicator {
      width: 40px;
      height: 40px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
      font-size: 1.25rem;
      flex-shrink: 0;
    }
    .completed-icon {
      background: var(--color-success);
      color: white;
    }
    .in-progress-icon {
      background: var(--color-warning);
      color: white;
    }
    .pending-icon {
      background: #d1d5db;
      color: #6b7280;
    }
    .rejected-icon {
      background: var(--color-danger);
      color: white;
    }
    .step-avatar {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      background: var(--color-secondary);
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.75rem;
      font-weight: 600;
      flex-shrink: 0;
    }
    .step-avatar.has-assignee {
      background: var(--color-primary);
    }
    .step-content {
      flex: 1;
    }
    .step-name {
      font-weight: 600;
      margin-bottom: 0.125rem;
    }
    .step-type {
      font-size: 0.75rem;
      color: var(--color-text-muted);
      text-transform: uppercase;
    }
    .step-time {
      font-size: 0.75rem;
      color: var(--color-text-muted);
      margin-top: 0.25rem;
    }
    .current-marker {
      font-size: 0.75rem;
      color: var(--color-primary);
      font-weight: 600;
      margin-top: 0.25rem;
    }
    .step-status-badge {
      padding: 0.25rem 0.5rem;
      border-radius: var(--radius-sm);
      font-size: 0.625rem;
      font-weight: 600;
      text-transform: uppercase;
    }
    .step-status-badge.completed { background: #d1fae5; color: #065f46; }
    .step-status-badge.in_progress { background: #dbeafe; color: #1e40af; }
    .step-status-badge.pending { background: #f3f4f6; color: #6b7280; }
    .step-status-badge.rejected { background: #fee2e2; color: #991b1b; }
    
    /* History */
    .history-section {
      background: var(--color-surface);
      border-radius: var(--radius-lg);
      padding: 1.5rem;
      margin-bottom: 1.5rem;
    }
    .history-section h2 {
      font-size: 1.125rem;
      margin-bottom: 1rem;
    }
    .history-timeline {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }
    .history-entry {
      font-size: 0.875rem;
      padding: 0.5rem;
      background: var(--color-background);
      border-radius: var(--radius-sm);
    }
    .history-time {
      color: var(--color-text-muted);
      font-weight: 500;
    }
    .history-separator {
      margin: 0 0.5rem;
      color: var(--color-text-muted);
    }
    .history-action {
      color: var(--color-text);
    }
    .no-history {
      color: var(--color-text-muted);
      font-size: 0.875rem;
      font-style: italic;
    }
    
    /* Approval History */
    .approval-timeline {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }
    .approval-entry {
      display: flex;
      gap: 1rem;
      padding: 0.75rem;
      background: var(--color-background);
      border-radius: var(--radius-md);
    }
    .approval-icon {
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
      font-size: 0.875rem;
      font-weight: 700;
      flex-shrink: 0;
    }
    .approval-icon.approved { background: #d1fae5; color: #065f46; }
    .approval-icon.rejected { background: #fee2e2; color: #991b1b; }
    .approval-icon.info { background: #dbeafe; color: #1e40af; }
    .approval-icon.started { background: #fef3c7; color: #92400e; }
    .approval-icon.pending { background: #f3f4f6; color: #6b7280; }
    .approval-content { flex: 1; }
    .approval-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.25rem;
    }
    .approval-action { font-size: 0.875rem; font-weight: 500; }
    .approval-time { font-size: 0.75rem; color: var(--color-text-muted); }
    .approval-node { font-size: 0.8125rem; color: var(--color-text-muted); }
    .approval-approver { font-size: 0.8125rem; color: var(--color-text-muted); font-style: italic; }
    .approval-comment { font-size: 0.8125rem; color: var(--color-text); font-style: italic; margin-top: 0.25rem; }
    
    /* Applicant Info */
    .applicant-section {
      background: var(--color-surface);
      border-radius: var(--radius-lg);
      padding: 1.5rem;
      margin-bottom: 1.5rem;
    }
    .applicant-section h2 {
      font-size: 1.125rem;
      margin-bottom: 1rem;
    }
    .info-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 1rem;
    }
    .info-item {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }
    .info-label {
      font-size: 0.75rem;
      color: var(--color-text-muted);
      text-transform: uppercase;
    }
    .info-value {
      font-size: 0.875rem;
      font-weight: 500;
    }
    .header-row {
      display: flex;
      align-items: center;
      gap: 1rem;
      margin-bottom: 0.25rem;
    }
    .workflow-name {
      font-size: 0.875rem;
      color: var(--color-text-muted);
      margin-top: 0.25rem;
    }
    
    /* Discussion Thread */
    .discussion-section {
      background: var(--color-surface);
      border-radius: var(--radius-lg);
      padding: 1.5rem;
      margin-bottom: 1.5rem;
    }
    .discussion-section h2 {
      font-size: 1.125rem;
      margin-bottom: 1rem;
    }
    .comment-list {
      display: flex;
      flex-direction: column;
      gap: 1rem;
      margin-bottom: 1.5rem;
    }
    .no-comments {
      color: var(--color-text-muted);
      font-size: 0.875rem;
      font-style: italic;
      text-align: center;
      padding: 2rem;
    }
    .comment-item {
      padding: 1rem;
      background: var(--color-background);
      border-radius: var(--radius-md);
    }
    .comment-header {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      margin-bottom: 0.5rem;
    }
    .comment-author { font-weight: 600; font-size: 0.875rem; }
    .comment-time { font-size: 0.75rem; color: var(--color-text-muted); }
    .comment-body { font-size: 0.875rem; line-height: 1.5; margin-bottom: 0.5rem; white-space: pre-wrap; }
    .comment-mentions { display: flex; flex-wrap: wrap; gap: 0.5rem; margin-bottom: 0.5rem; }
    .mention-badge {
      padding: 0.125rem 0.5rem;
      background: #dbeafe;
      color: #1e40af;
      border-radius: var(--radius-sm);
      font-size: 0.75rem;
      font-weight: 500;
    }
    .comment-actions { display: flex; gap: 0.5rem; }
    .reply-btn {
      background: none;
      border: none;
      color: var(--color-primary);
      font-size: 0.75rem;
      cursor: pointer;
      padding: 0;
    }
    .reply-btn:hover { text-decoration: underline; }
    
    .reply-list { margin-top: 0.75rem; margin-left: 1.5rem; }
    .reply-item {
      padding: 0.75rem;
      background: var(--color-surface);
      border-radius: var(--radius-sm);
      margin-bottom: 0.5rem;
      border-left: 2px solid #e5e7eb;
    }
    
    .reply-input-area {
      margin-top: 0.75rem;
      padding: 0.75rem;
      background: var(--color-surface);
      border-radius: var(--radius-sm);
    }
    .reply-actions { display: flex; justify-content: flex-end; gap: 0.5rem; margin-top: 0.5rem; }
    
    .new-comment-area {
      padding: 1rem;
      background: var(--color-background);
      border-radius: var(--radius-md);
      border: 1px solid #e5e7eb;
    }
    .comment-textarea {
      width: 100%;
      padding: 0.75rem;
      border: 1px solid #e5e7eb;
      border-radius: var(--radius-sm);
      font-size: 0.875rem;
      font-family: inherit;
      resize: vertical;
      box-sizing: border-box;
    }
    .comment-textarea:focus {
      outline: none;
      border-color: var(--color-primary);
    }
    .comment-actions-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: 0.5rem;
    }
    .hint-text { font-size: 0.75rem; color: var(--color-text-muted); }
    
    /* @mention autocomplete */
    .textarea-wrapper {
      position: relative;
    }
    .mention-dropdown {
      position: absolute;
      top: 100%;
      left: 0;
      right: 0;
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      box-shadow: var(--shadow-md);
      z-index: 100;
      max-height: 200px;
      overflow-y: auto;
      margin-top: 0.25rem;
    }
    .mention-item {
      display: flex;
      flex-direction: column;
      padding: 0.5rem 0.75rem;
      cursor: pointer;
      border-bottom: 1px solid var(--color-border);
    }
    .mention-item:last-child { border-bottom: none; }
    .mention-item:hover { background: var(--color-background); }
    .mention-name { font-size: 0.875rem; font-weight: 500; }
    .mention-email { font-size: 0.75rem; color: var(--color-text-muted); }
    .mention-empty { padding: 0.5rem 0.75rem; font-size: 0.875rem; color: var(--color-text-muted); text-align: center; }
    
    .btn-success {
      background: var(--color-success);
      color: white;
    }
    .btn-danger {
      background: var(--color-danger);
      color: white;
    }

    /* Sticky Action Bar */
    .sticky-action-bar {
      position: sticky;
      top: 0;
      z-index: 100;
      background: var(--color-surface);
      border-bottom: 2px solid var(--color-primary);
      padding: 1rem 1.5rem;
      margin: 0 -2rem 1.5rem -2rem;
      box-shadow: var(--shadow-md);
    }
    .sticky-action-content {
      max-width: 900px;
      margin: 0 auto;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 1rem;
    }
    .action-info {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }
    .action-label {
      font-size: 0.875rem;
      font-weight: 600;
      color: var(--color-primary);
    }
    .action-detail {
      font-size: 0.75rem;
      color: var(--color-text-muted);
    }
    .action-buttons-sticky {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }
    .parallel-info {
      font-size: 0.875rem;
      color: var(--color-text-muted);
    }
    .already-approved-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.375rem;
      padding: 0.5rem 1rem;
      background: #d1fae5;
      color: #065f46;
      border-radius: var(--radius-md);
      font-size: 0.875rem;
      font-weight: 500;
    }
  `]
})
export class WorkflowInstanceDetailComponent implements OnInit, OnDestroy {
  @ViewChild('newCommentTextarea') newCommentTextarea?: ElementRef<HTMLTextAreaElement>;
  @ViewChild('replyTextarea') replyTextarea?: ElementRef<HTMLTextAreaElement>;

  workflow = signal<Workflow | null>(null);
  instance = signal<WorkflowInstance | null>(null);
  loading = signal(true);
  newComment = '';
  replyText = '';
  replyingTo = signal<string | null>(null);
  comments = signal<Comment[]>([]);

  // @mention autocomplete state
  showMentionDropdown = signal(false);
  mentionQuery = signal('');
  mentionResults = signal<{ id: string; name: string; email: string }[]>([]);
  mentionCursorPos = signal(0);
  activeMentionTextarea = signal<'newComment' | 'reply' | null>(null);

  private mentionSearch$ = new Subject<string>();

  steps = computed<WorkflowStep[]>(() => {
    const wf = this.workflow();
    const inst = this.instance();
    if (!wf || !inst) return [];

    return wf.nodes.map(node => {
      const status = this.getStepStatus(node.id);
      const historyEntry = inst.history.find(h => h.nodeId === node.id);
      
      return {
        node,
        status,
        completedAt: historyEntry?.timestamp
      };
    });
  });

  currentStep = computed<WorkflowStep | null>(() => {
    const inst = this.instance();
    return this.steps().find(s => s.status === 'IN_PROGRESS') || null;
  });

  approvalHistory = computed<ApprovalHistoryEntry[]>(() => {
    const inst = this.instance();
    const wf = this.workflow();
    if (!inst || !wf) return [];

    return inst.history.map(entry => {
      const node = wf.nodes.find((n: WorkflowNode) => n.id === entry.nodeId);
      return {
        nodeId: entry.nodeId,
        nodeLabel: (node?.data?.['label'] as string) || node?.type || '',
        action: entry.action,
        timestamp: entry.timestamp,
        comment: entry.comment,
        approver: this.extractApproverName(entry.action),
      };
    });
  });

  isInProgress(): boolean {
    return this.instance()?.status === 'IN_PROGRESS';
  }

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private workflowService: WorkflowService,
    private auth: AuthService
  ) {}

  ngOnInit() {
    const instanceId = this.route.snapshot.paramMap.get('id');
    if (instanceId) {
      this.loadInstance(instanceId);
      this.loadComments(instanceId);
    } else {
      this.loading.set(false);
    }

    // Debounced mention search
    this.mentionSearch$.pipe(
      debounceTime(200),
      distinctUntilChanged()
    ).subscribe(query => {
      if (query.length > 0) {
        this.auth.searchUsers(query).subscribe({
          next: (users) => this.mentionResults.set(users),
          error: () => this.mentionResults.set([])
        });
      } else {
        this.mentionResults.set([]);
      }
    });
  }

  ngOnDestroy() {
    this.mentionSearch$.complete();
  }

  loadInstance(instanceId: string) {
    this.loading.set(true);
    this.workflowService.getInstance(instanceId).subscribe({
      next: (instance: any) => {
        this.instance.set(instance);
        // Load associated workflow
        if (instance.workflowId) {
          this.workflowService.getById(instance.workflowId).subscribe({
            next: (workflow: any) => {
              this.workflow.set(workflow);
              this.loading.set(false);
            },
            error: () => {
              this.workflow.set(null);
              this.loading.set(false);
            }
          });
        } else {
          this.loading.set(false);
        }
      },
      error: () => {
        this.instance.set(null);
        this.loading.set(false);
      }
    });
  }

  getStepStatus(nodeId: string): NodeStatus {
    const inst = this.instance();
    const wf = this.workflow();
    if (!inst || !wf) return 'PENDING';

    // If current node
    if (inst.currentNodeId === nodeId) {
      return 'IN_PROGRESS';
    }

    // If in history, it's completed
    if (inst.history.some(h => h.nodeId === nodeId)) {
      return 'COMPLETED';
    }

    // For nodes before current (based on order)
    const currentIdx = wf.nodes.findIndex(n => n.id === inst.currentNodeId);
    const nodeIdx = wf.nodes.findIndex(n => n.id === nodeId);
    
    if (nodeIdx < currentIdx && currentIdx >= 0) {
      return 'COMPLETED';
    }

    return 'PENDING';
  }

  getNodeTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      'start': 'Start',
      'end': 'End',
      'task': 'Task',
      'condition': 'Condition',
      'approval': 'Approval',
      'parallel': 'Parallel Split',
      'join': 'Join',
      'sub-workflow': 'Sub-Workflow'
    };
    return labels[type] || type;
  }

  getCurrentStepNumber(): number {
    const steps = this.steps();
    const index = steps.findIndex(s => s.status === 'IN_PROGRESS');
    if (index >= 0) {
      return index + 1;
    }
    // No step in progress - check if workflow is completed or not yet started
    if (steps.length > 0 && steps[steps.length - 1].status === 'COMPLETED') {
      return steps.length; // All completed, show final step number
    }
    return 0; // Not started yet
  }

  getStepAssignee(step: WorkflowStep): string {
    // Handle single approver
    const approver = step.node.data['approver'] as string | undefined;
    if (approver) {
      return approver.replace('role:', '');
    }
    // Handle parallel approvers (array)
    const approvers = step.node.data['approvers'] as string[] | undefined;
    if (approvers && approvers.length > 0) {
      return approvers.map(a => a.replace('role:', '')).join(', ');
    }
    // Handle parallelApprovers field
    const parallelApprovers = step.node.data['parallelApprovers'] as string[] | undefined;
    if (parallelApprovers && parallelApprovers.length > 0) {
      return parallelApprovers.map(a => a.replace('role:', '')).join(', ');
    }
    return '';
  }

  getInitials(name: string): string {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  }

  getStatusClass(status: string): string {
    return status;
  }

  formatStatus(status: string): string {
    return status.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  }

  getApprovalIcon(entry: ApprovalHistoryEntry): string {
    const action = entry.action.toLowerCase();
    if (action.includes('reject')) return '✗';
    if (action.includes('approv')) return '✓';
    if (action.includes('request') || action.includes('info')) return '?';
    if (action.includes('start')) return '▶';
    return '•';
  }

  getApprovalIconClass(entry: ApprovalHistoryEntry): string {
    const action = entry.action.toLowerCase();
    if (action.includes('reject')) return 'rejected';
    if (action.includes('approv')) return 'approved';
    if (action.includes('request') || action.includes('info')) return 'info';
    if (action.includes('start')) return 'started';
    return 'pending';
  }

  extractApproverName(action: string): string | undefined {
    const match = action.match(/by (.+)$/i);
    return match ? match[1] : undefined;
  }

  getParallelProgress(): string {
    const step = this.currentStep();
    const inst = this.instance();
    if (!step || !inst || step.node.type !== 'parallel') return '';

    const formData = inst.formData as Record<string, any>;
    const parallelApprovals = formData?.['parallelApprovals'];
    const nodeState = parallelApprovals?.[step.node.id];

    const required = (step.node.data['approvers'] as string[]) || [];
    const approvals = nodeState?.approvals || [];

    return `${approvals.length} of ${required.length} approvers have approved`;
  }

  canApproveParallel(): boolean {
    const step = this.currentStep();
    const inst = this.instance();
    const currentUser = this.auth.user();
    if (!step || !inst || !currentUser || step.node.type !== 'parallel') return false;

    const formData = inst.formData as Record<string, any>;
    const parallelApprovals = formData?.['parallelApprovals'];
    const nodeState = parallelApprovals?.[step.node.id];

    const approvals = nodeState?.approvals || [];
    return !approvals.includes(currentUser.id) && !approvals.includes(currentUser.name || '');
  }

  approve() {
    const inst = this.instance();
    const step = this.currentStep();
    if (!inst || !step) return;

    const currentUser = this.auth.user();
    const node = step.node;

    // Check if this is a parallel node - use parallel approval API
    if (node.type === 'parallel') {
      this.handleParallelApproval(inst, node, currentUser);
      return;
    }

    // Regular approval - advance using instance's current node ID
    // Backend will auto-evaluate conditions and route correctly
    inst.history.push({
      nodeId: inst.currentNodeId!,
      action: `Approved by ${currentUser?.name || 'User'}`,
      timestamp: new Date()
    });

    // Find the next node after the current node and advance
    const wf = this.workflow();
    if (wf) {
      const currentIdx = wf.nodes.findIndex(n => n.id === inst.currentNodeId);
      const nextNode = wf.nodes[currentIdx + 1];
      if (nextNode) {
        this.workflowService.advanceInstance(inst.id, nextNode.id, inst.history).subscribe({
          next: (updated: any) => this.instance.set({ ...updated }),
          error: () => this.instance.set({ ...inst })
        });
        return;
      }
    }

    // Fallback: pass current node ID, backend will handle routing
    this.workflowService.advanceInstance(inst.id, inst.currentNodeId!, inst.history).subscribe({
      next: (updated: any) => this.instance.set({ ...updated }),
      error: () => this.instance.set({ ...inst })
    });
  }

  private handleParallelApproval(inst: WorkflowInstance, node: WorkflowNode, currentUser: { id: string; name?: string } | null) {
    const approvers = (node.data['approvers'] as string[]) || [];
    const currentNodeId = node.id;

    // Get current parallel approval state from formData
    const formData = inst.formData as Record<string, any>;
    const parallelApprovals = formData?.['parallelApprovals'];
    const existingState = parallelApprovals?.[currentNodeId];

    if (!existingState) {
      // Initialize parallel approval first
      this.workflowService.initParallelApproval(inst.id, currentNodeId, approvers).subscribe({
        next: (updated) => {
          this.instance.set(updated);
          // Now record this user's approval
          if (currentUser) {
            this.doParallelApprove(updated, currentNodeId, currentUser.id);
          }
        },
        error: () => {
          // Fallback to local handling
          this.handleParallelApprovalLocally(inst, node, currentUser, approvers);
        }
      });
    } else if (currentUser && !existingState.approvals.includes(currentUser.id)) {
      // Already initialized, record this approval
      this.doParallelApprove(inst, currentNodeId, currentUser.id);
    }
  }

  private doParallelApprove(inst: WorkflowInstance, nodeId: string, approverId: string) {
    this.workflowService.approveParallel(inst.id, nodeId, approverId).subscribe({
      next: (result) => {
        this.instance.set(result.instance);
        // Note: allApproved is handled by the backend - when true, workflow advances automatically
        // If not all approved, the instance stays at the parallel node
      },
      error: () => {
        // Fallback to local handling
        const wf = this.workflow();
        if (wf) {
          const node = wf.nodes.find(n => n.id === nodeId);
          const approvers = (node?.data['approvers'] as string[]) || [];
          this.handleParallelApprovalLocally(inst, node!, { id: approverId } as any, approvers);
        }
      }
    });
  }

  private handleParallelApprovalLocally(inst: WorkflowInstance, node: WorkflowNode, currentUser: { id: string; name?: string } | null, requiredApprovers: string[]) {
    const currentNodeId = node.id;
    const formData = inst.formData || {};
    const parallelApprovals = formData['parallelApprovals'] || {};
    
    let nodeApproval = parallelApprovals[currentNodeId];
    if (!nodeApproval) {
      nodeApproval = {
        nodeId: currentNodeId,
        requiredApprovers,
        approvals: [],
        status: 'PENDING' as 'PENDING' | 'ALL_APPROVED' | 'REJECTED'
      };
    }

    // Record this approval
    if (currentUser && !nodeApproval.approvals.includes(currentUser.id)) {
      nodeApproval.approvals.push(currentUser.id);
    }

    // Check if all have approved
    const allApproved = requiredApprovers.length === 0 ||
      requiredApprovers.every(a => nodeApproval!.approvals.includes(a));

    const historyEntry = {
      nodeId: currentNodeId,
      action: `Parallel approval: ${nodeApproval.approvals.length}/${requiredApprovers.length} approved`,
      timestamp: new Date()
    };

    if (allApproved) {
      nodeApproval.status = 'ALL_APPROVED';
      // Find next node and advance
      const wf = this.workflow();
      if (wf) {
        const currentIdx = wf.nodes.findIndex(n => n.id === currentNodeId);
        if (currentIdx >= 0 && currentIdx < wf.nodes.length - 1) {
          const nextNode = wf.nodes[currentIdx + 1];
          const newStatus = nextNode.type === 'end' ? 'completed' : inst.status;
          
          this.instance.set({
            ...inst,
            currentNodeId: nextNode.id,
            status: newStatus,
            formData: { ...formData, parallelApprovals: { ...(formData?.['parallelApprovals'] || {}), [currentNodeId]: nodeApproval } },
            history: [...inst.history, historyEntry]
          });
          return;
        }
      }
    }

    // Not all approved - stay at parallel node
    this.instance.set({
      ...inst,
      formData: { ...formData, parallelApprovals: { ...(formData?.['parallelApprovals'] || {}), [currentNodeId]: nodeApproval } },
      history: [...inst.history, historyEntry]
    });
  }

  reject() {
    const inst = this.instance();
    const step = this.currentStep();
    if (!inst || !step) return;

    inst.history.push({
      nodeId: step.node.id,
      action: 'Rejected',
      timestamp: new Date()
    });

    inst.status = 'REJECTED';
    inst.currentNodeId = null;

    this.workflowService.rejectInstance(inst.id).subscribe({
      next: (updated: any) => this.instance.set({ ...updated }),
      error: () => this.instance.set({ ...inst })
    });
  }

  requestInfo() {
    const inst = this.instance();
    const step = this.currentStep();
    if (!inst || !step) return;

    inst.history.push({
      nodeId: step.node.id,
      action: 'Additional information requested',
      timestamp: new Date()
    });

    this.instance.set({ ...inst });
    // TODO: Implement request info flow
  }

  // ---- @mention autocomplete ----
  onNewCommentInput(event: Event) {
    const textarea = event.target as HTMLTextAreaElement;
    this.newComment = textarea.value;
    this.activeMentionTextarea.set('newComment');
    this.checkForMention(textarea);
  }

  onReplyInput(event: Event) {
    const textarea = event.target as HTMLTextAreaElement;
    this.replyText = textarea.value;
    this.activeMentionTextarea.set('reply');
    this.checkForMention(textarea);
  }

  private checkForMention(textarea: HTMLTextAreaElement) {
    const cursorPos = textarea.selectionStart;
    this.mentionCursorPos.set(cursorPos);
    const textBeforeCursor = textarea.value.substring(0, cursorPos);

    // Find the last @ that starts a potential mention
    const atIndex = textBeforeCursor.lastIndexOf('@');
    if (atIndex === -1) {
      this.showMentionDropdown.set(false);
      this.mentionQuery.set('');
      return;
    }

    // Check if there's a space between the @ and cursor (i.e., it's not a mention)
    const textAfterAt = textBeforeCursor.substring(atIndex + 1);
    if (textAfterAt.includes(' ') || textAfterAt.includes('\n')) {
      this.showMentionDropdown.set(false);
      this.mentionQuery.set('');
      return;
    }

    // We're in a potential mention - show dropdown and search
    this.mentionQuery.set(textAfterAt);
    this.showMentionDropdown.set(true);
    this.mentionSearch$.next(textAfterAt);
  }

  selectMention(user: { id: string; name: string; email: string }) {
    const textarea = this.activeMentionTextarea() === 'reply'
      ? this.replyTextarea?.nativeElement
      : this.newCommentTextarea?.nativeElement;

    if (!textarea) return;

    const cursorPos = textarea.selectionStart;
    const textBeforeCursor = textarea.value.substring(0, cursorPos);
    const textAfterCursor = textarea.value.substring(cursorPos);

    // Find the @ symbol position
    const atIndex = textBeforeCursor.lastIndexOf('@');
    if (atIndex === -1) return;

    const textBeforeAt = textarea.value.substring(0, atIndex);
    const mention = `@${user.name} `;

    if (this.activeMentionTextarea() === 'reply') {
      this.replyText = textBeforeAt + mention + textAfterCursor;
    } else {
      this.newComment = textBeforeAt + mention + textAfterCursor;
    }

    this.showMentionDropdown.set(false);
    this.mentionQuery.set('');

    // Set cursor position after the inserted mention
    setTimeout(() => {
      const newPos = textBeforeAt.length + mention.length;
      textarea.setSelectionRange(newPos, newPos);
      textarea.focus();
    });
  }

  closeMentionDropdown() {
    this.showMentionDropdown.set(false);
    this.mentionQuery.set('');
  }
  
  loadComments(instanceId: string) {
    this.workflowService.getInstanceComments(instanceId).subscribe({
      next: (comments: any[]) => this.comments.set(comments),
      error: () => this.comments.set([])
    });
  }
  
  submitComment() {
    if (!this.newComment.trim()) return;
    const instanceId = this.instance()?.id;
    if (!instanceId) return;
    
    const currentUser = this.auth.user();
    
    this.workflowService.addInstanceComment(instanceId, {
      content: this.newComment,
      authorId: currentUser?.id || '',
      parentCommentId: this.replyingTo() || null
    }).subscribe({
      next: () => {
        this.newComment = '';
        this.replyingTo.set(null);
        this.replyText = '';
        this.loadComments(instanceId);
      },
      error: () => alert('Failed to post comment')
    });
  }
  
  startReply(comment: any) {
    this.replyingTo.set(comment.id);
    setTimeout(() => {
      this.replyTextarea?.nativeElement.focus();
    }, 0);
  }
  
  cancelReply() {
    this.replyingTo.set(null);
    this.replyText = '';
  }
  
  submitReply(parentCommentId: string) {
    if (!this.replyText.trim()) return;
    const instanceId = this.instance()?.id;
    if (!instanceId) return;
    
    const currentUser = this.auth.user();
    
    this.workflowService.addInstanceComment(instanceId, {
      content: this.replyText,
      authorId: currentUser?.id || '',
      parentCommentId
    }).subscribe({
      next: () => {
        this.replyText = '';
        this.replyingTo.set(null);
        this.loadComments(instanceId);
      },
      error: () => alert('Failed to post reply')
    });
  }
  
  canApprove(): boolean {
    const inst = this.instance();
    if (!inst || inst.status !== 'IN_PROGRESS') return false;
    const currentUser = this.auth.user();
    if (!currentUser) return false;
    
    // Check if user has pending approval for this instance
    return inst.history?.some((h: any) => 
      h.action?.includes('PENDING') && h.action?.includes(currentUser.id)
    ) ?? false;
  }
}
