/**
 * Workflow Engine Unit Tests
 * 
 * Tests the core workflow execution logic.
 * Fastest tests (~ms), no DB or network needed.
 */

import { evaluateCondition, getNextNode, parseWorkflow } from './workflow-engine';

describe('Workflow Engine', () => {
  describe('evaluateCondition', () => {
    it('should evaluate equals operator', () => {
      expect(evaluateCondition('approved', 'equals', 'approved')).toBe(true);
      expect(evaluateCondition('pending', 'equals', 'approved')).toBe(false);
    });

    it('should evaluate not_equals operator', () => {
      expect(evaluateCondition('pending', 'not_equals', 'approved')).toBe(true);
      expect(evaluateCondition('approved', 'not_equals', 'approved')).toBe(false);
    });

    it('should evaluate contains operator', () => {
      expect(evaluateCondition('hello world', 'contains', 'world')).toBe(true);
      expect(evaluateCondition('hello world', 'contains', 'foo')).toBe(false);
    });

    it('should handle numeric comparisons', () => {
      expect(evaluateCondition(100, 'greater_than', 50)).toBe(true);
      expect(evaluateCondition(40, 'greater_than', 50)).toBe(false);
      expect(evaluateCondition(50, 'less_than', 100)).toBe(true);
    });
  });

  describe('getNextNode', () => {
    it('should return next node in linear workflow', () => {
      const nodes = [
        { id: 'start', type: 'start', data: {} },
        { id: 'task1', type: 'task', data: {} },
        { id: 'end', type: 'end', data: {} },
      ];
      const connections = [
        { from: 'start', to: 'task1' },
        { from: 'task1', to: 'end' },
      ];

      const next = getNextNode('start', connections);
      expect(next).toBe('task1');
    });

    it('should return null for end node', () => {
      const connections = [
        { from: 'task1', to: 'end' },
      ];

      const next = getNextNode('end', connections);
      expect(next).toBeNull();
    });
  });

  describe('parseWorkflow', () => {
    it('should parse valid workflow JSON', () => {
      const workflow = {
        nodes: '[{"id":"start","type":"start"}]',
        connections: '[{"from":"start","to":"end"}]',
      };

      const parsed = parseWorkflow(workflow);
      expect(parsed.nodes).toHaveLength(1);
      expect(parsed.connections).toHaveLength(1);
    });

    it('should handle invalid JSON gracefully', () => {
      const workflow = {
        nodes: 'invalid json',
        connections: 'also invalid',
      };

      expect(() => parseWorkflow(workflow)).toThrow();
    });
  });
});

describe('RBAC Permission Checks', () => {
  const PERMISSIONS = {
    ADMIN: ['workflow.create', 'workflow.read', 'workflow.update', 'workflow.delete', 'form.create', 'form.read', 'form.update', 'form.delete', 'user.manage', 'role.manage'],
    MANAGER: ['workflow.create', 'workflow.read', 'workflow.update', 'workflow.delete', 'form.create', 'form.read', 'form.update', 'form.delete'],
    USER: ['workflow.read', 'form.create', 'form.read'],
    VIEWER: ['workflow.read', 'form.read'],
  };

  function hasPermission(role: string, permission: string): boolean {
    return PERMISSIONS[role as keyof typeof PERMISSIONS]?.includes(permission) ?? false;
  }

  it('ADMIN can manage users and roles', () => {
    expect(hasPermission('ADMIN', 'user.manage')).toBe(true);
    expect(hasPermission('ADMIN', 'role.manage')).toBe(true);
  });

  it('MANAGER cannot manage users or roles', () => {
    expect(hasPermission('MANAGER', 'user.manage')).toBe(false);
    expect(hasPermission('MANAGER', 'role.manage')).toBe(false);
  });

  it('USER cannot delete workflows', () => {
    expect(hasPermission('USER', 'workflow.delete')).toBe(false);
  });

  it('VIEWER cannot create workflows', () => {
    expect(hasPermission('VIEWER', 'workflow.create')).toBe(false);
  });
});
