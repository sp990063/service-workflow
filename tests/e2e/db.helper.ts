/**
 * DbHelper - Database validation helper for E2E tests
 * 
 * Connects directly to SQLite database to verify that UI operations
 * correctly create/update records in the backend database.
 */

import Database = require('better-sqlite3');
import path = require('path');

export interface DbUser {
  id: string;
  email: string;
  name: string;
  role: string;
  department: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DbForm {
  id: string;
  name: string;
  description: string | null;
  elements: string;
  version: number;
  isActive: number;
  createdAt: string;
  updatedAt: string;
}

export interface DbWorkflow {
  id: string;
  name: string;
  description: string | null;
  nodes: string;
  connections: string;
  version: number;
  isActive: number;
  category: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DbWorkflowInstance {
  id: string;
  workflowId: string;
  userId: string;
  currentNodeId: string | null;
  status: string;
  formData: string;
  history: string;
  childInstanceId: string | null;
  parentInstanceId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DbFormSubmission {
  id: string;
  formId: string;
  userId: string;
  data: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface DbApprovalRequest {
  id: string;
  instanceId: string;
  nodeId: string;
  userId: string;
  decision: string | null;
  comment: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DbNotification {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  data: string | null;
  isRead: number;
  createdAt: string;
}

export class DbHelper {
  private db: Database.Database;

  constructor(dbPath?: string) {
    const resolvedPath = dbPath || path.join(__dirname, '..', '..', 'backend', 'prisma', 'dev.db');
    this.db = new Database(resolvedPath, { readonly: false });
    try {
      this.db.pragma('journal_mode = WAL');
    } catch (e) {
      // WAL mode might not be available or writable
    }
  }

  // ─── User queries ───────────────────────────────────────────────────────────

  getUserByEmail(email: string): DbUser | undefined {
    const stmt = this.db.prepare('SELECT * FROM User WHERE email = ?');
    return stmt.get(email) as DbUser | undefined;
  }

  getUserById(id: string): DbUser | undefined {
    const stmt = this.db.prepare('SELECT * FROM User WHERE id = ?');
    return stmt.get(id) as DbUser | undefined;
  }

  getUsersByRole(role: string): DbUser[] {
    const stmt = this.db.prepare('SELECT * FROM User WHERE role = ?');
    return stmt.all(role) as DbUser[];
  }

  getAllUsers(): DbUser[] {
    const stmt = this.db.prepare('SELECT * FROM User');
    return stmt.all() as DbUser[];
  }

  // ─── Form queries ──────────────────────────────────────────────────────────

  getFormById(id: string): DbForm | undefined {
    const stmt = this.db.prepare('SELECT * FROM Form WHERE id = ?');
    return stmt.get(id) as DbForm | undefined;
  }

  getActiveForms(): DbForm[] {
    const stmt = this.db.prepare('SELECT * FROM Form WHERE isActive = 1');
    return stmt.all() as DbForm[];
  }

  // ─── Workflow queries ───────────────────────────────────────────────────────

  getWorkflowById(id: string): DbWorkflow | undefined {
    const stmt = this.db.prepare('SELECT * FROM Workflow WHERE id = ?');
    return stmt.get(id) as DbWorkflow | undefined;
  }

  getActiveWorkflows(): DbWorkflow[] {
    const stmt = this.db.prepare('SELECT * FROM Workflow WHERE isActive = 1');
    return stmt.all() as DbWorkflow[];
  }

  // ─── Workflow Instance queries ─────────────────────────────────────────────

  getWorkflowInstance(filter: { id?: string; userId?: string; workflowId?: string; status?: string }): DbWorkflowInstance | undefined {
    const conditions: string[] = [];
    const params: string[] = [];

    if (filter.id) {
      conditions.push('id = ?');
      params.push(filter.id);
    }
    if (filter.userId) {
      conditions.push('userId = ?');
      params.push(filter.userId);
    }
    if (filter.workflowId) {
      conditions.push('workflowId = ?');
      params.push(filter.workflowId);
    }
    if (filter.status) {
      conditions.push('status = ?');
      params.push(filter.status);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const stmt = this.db.prepare(`SELECT * FROM WorkflowInstance ${where} ORDER BY createdAt DESC LIMIT 1`);
    return stmt.get(...params) as DbWorkflowInstance | undefined;
  }

  getWorkflowInstances(filter: { userId?: string; workflowId?: string; status?: string }): DbWorkflowInstance[] {
    const conditions: string[] = [];
    const params: string[] = [];

    if (filter.userId) {
      conditions.push('userId = ?');
      params.push(filter.userId);
    }
    if (filter.workflowId) {
      conditions.push('workflowId = ?');
      params.push(filter.workflowId);
    }
    if (filter.status) {
      conditions.push('status = ?');
      params.push(filter.status);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const stmt = this.db.prepare(`SELECT * FROM WorkflowInstance ${where} ORDER BY createdAt DESC`);
    return stmt.all(...params) as DbWorkflowInstance[];
  }

  // ─── Form Submission queries ───────────────────────────────────────────────

  getFormSubmission(filter: { id?: string; userId?: string; formId?: string; status?: string }): DbFormSubmission | undefined {
    const conditions: string[] = [];
    const params: string[] = [];

    if (filter.id) {
      conditions.push('id = ?');
      params.push(filter.id);
    }
    if (filter.userId) {
      conditions.push('userId = ?');
      params.push(filter.userId);
    }
    if (filter.formId) {
      conditions.push('formId = ?');
      params.push(filter.formId);
    }
    if (filter.status) {
      conditions.push('status = ?');
      params.push(filter.status);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const stmt = this.db.prepare(`SELECT * FROM FormSubmission ${where} ORDER BY createdAt DESC LIMIT 1`);
    return stmt.get(...params) as DbFormSubmission | undefined;
  }

  getFormSubmissions(filter: { userId?: string; formId?: string }): DbFormSubmission[] {
    const conditions: string[] = [];
    const params: string[] = [];

    if (filter.userId) {
      conditions.push('userId = ?');
      params.push(filter.userId);
    }
    if (filter.formId) {
      conditions.push('formId = ?');
      params.push(filter.formId);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const stmt = this.db.prepare(`SELECT * FROM FormSubmission ${where} ORDER BY createdAt DESC`);
    return stmt.all(...params) as DbFormSubmission[];
  }

  // ─── Approval Request queries ─────────────────────────────────────────────

  getApprovalRequest(filter: { id?: string; instanceId?: string; userId?: string; decision?: string }): DbApprovalRequest | undefined {
    const conditions: string[] = [];
    const params: string[] = [];

    if (filter.id) {
      conditions.push('id = ?');
      params.push(filter.id);
    }
    if (filter.instanceId) {
      conditions.push('instanceId = ?');
      params.push(filter.instanceId);
    }
    if (filter.userId) {
      conditions.push('userId = ?');
      params.push(filter.userId);
    }
    if (filter.decision) {
      conditions.push('decision = ?');
      params.push(filter.decision);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const stmt = this.db.prepare(`SELECT * FROM ApprovalRequest ${where} ORDER BY createdAt DESC LIMIT 1`);
    return stmt.get(...params) as DbApprovalRequest | undefined;
  }

  getApprovalRequestsForInstance(instanceId: string): DbApprovalRequest[] {
    const stmt = this.db.prepare('SELECT * FROM ApprovalRequest WHERE instanceId = ? ORDER BY createdAt DESC');
    return stmt.all(instanceId) as DbApprovalRequest[];
  }

  // ─── Notification queries ──────────────────────────────────────────────────

  getNotification(filter: { id?: string; userId?: string; type?: string; isRead?: boolean }): DbNotification | undefined {
    const conditions: string[] = [];
    const params: (string | number)[] = [];

    if (filter.id) {
      conditions.push('id = ?');
      params.push(filter.id);
    }
    if (filter.userId) {
      conditions.push('userId = ?');
      params.push(filter.userId);
    }
    if (filter.type) {
      conditions.push('type = ?');
      params.push(filter.type);
    }
    if (filter.isRead !== undefined) {
      conditions.push('isRead = ?');
      params.push(filter.isRead ? 1 : 0);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const stmt = this.db.prepare(`SELECT * FROM Notification ${where} ORDER BY createdAt DESC LIMIT 1`);
    return stmt.get(...params) as DbNotification | undefined;
  }

  getNotifications(filter: { userId?: string; isRead?: boolean }): DbNotification[] {
    const conditions: string[] = [];
    const params: (string | number)[] = [];

    if (filter.userId) {
      conditions.push('userId = ?');
      params.push(filter.userId);
    }
    if (filter.isRead !== undefined) {
      conditions.push('isRead = ?');
      params.push(filter.isRead ? 1 : 0);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const stmt = this.db.prepare(`SELECT * FROM Notification ${where} ORDER BY createdAt DESC`);
    return stmt.all(...params) as DbNotification[];
  }

  // ─── Count helpers ─────────────────────────────────────────────────────────

  countNotifications(userId: string, isRead?: boolean): number {
    const conditions = ['userId = ?'];
    const params: (string | number)[] = [userId];
    if (isRead !== undefined) {
      conditions.push('isRead = ?');
      params.push(isRead ? 1 : 0);
    }
    const stmt = this.db.prepare(`SELECT COUNT(*) as count FROM Notification WHERE ${conditions.join(' AND ')}`);
    const result = stmt.get(...params) as { count: number };
    return result.count;
  }

  countWorkflowInstances(userId?: string, status?: string): number {
    const conditions: string[] = [];
    const params: (string | number)[] = [];
    if (userId) {
      conditions.push('userId = ?');
      params.push(userId);
    }
    if (status) {
      conditions.push('status = ?');
      params.push(status);
    }
    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const stmt = this.db.prepare(`SELECT COUNT(*) as count FROM WorkflowInstance ${where}`);
    const result = stmt.get(...params) as { count: number };
    return result.count;
  }

  countFormSubmissions(userId?: string, formId?: string): number {
    const conditions: string[] = [];
    const params: string[] = [];
    if (userId) {
      conditions.push('userId = ?');
      params.push(userId);
    }
    if (formId) {
      conditions.push('formId = ?');
      params.push(formId);
    }
    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const stmt = this.db.prepare(`SELECT COUNT(*) as count FROM FormSubmission ${where}`);
    const result = stmt.get(...params) as { count: number };
    return result.count;
  }

  close() {
    this.db.close();
  }
}
