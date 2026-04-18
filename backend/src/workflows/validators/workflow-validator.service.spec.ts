import { WorkflowValidatorService } from './workflow-validator.service';
import { WorkflowDefinition } from '../interfaces';

describe('WorkflowValidatorService', () => {
  let service: WorkflowValidatorService;

  beforeEach(() => { service = new WorkflowValidatorService(); });

  function makeDef(nodes: any[], connections: any[]): WorkflowDefinition {
    return { id: 'test', name: 'Test', nodes, connections, version: 1, createdAt: new Date(), updatedAt: new Date() };
  }

  it('should return valid for a simple linear workflow', () => {
    const def = makeDef(
      [
        { id: 'n1', type: 'start', label: 'Start', position: { x: 0, y: 0 } },
        { id: 'n2', type: 'end', label: 'End', position: { x: 100, y: 0 } },
      ],
      [{ id: 'c1', sourceNodeId: 'n1', targetNodeId: 'n2' }]
    );
    const result = service.validate(def);
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('should fail when no Start node', () => {
    const def = makeDef([{ id: 'n1', type: 'end', label: 'End', position: { x: 0, y: 0 } }], []);
    const result = service.validate(def);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Workflow must have exactly one Start node');
  });

  it('should fail when no End node', () => {
    const def = makeDef([{ id: 'n1', type: 'start', label: 'Start', position: { x: 0, y: 0 } }], []);
    const result = service.validate(def);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Workflow must have at least one End node');
  });

  it('should fail when parallel has no downstream Join', () => {
    const def = makeDef(
      [
        { id: 'n1', type: 'start', label: 'Start', position: { x: 0, y: 0 } },
        { id: 'n2', type: 'parallel', label: 'Split', position: { x: 100, y: 0 } },
        { id: 'n3', type: 'end', label: 'End', position: { x: 200, y: 0 } },
      ],
      [
        { id: 'c1', sourceNodeId: 'n1', targetNodeId: 'n2' },
        { id: 'c2', sourceNodeId: 'n2', targetNodeId: 'n3' },
      ]
    );
    const result = service.validate(def);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('no downstream Join'))).toBe(true);
  });

  it('should fail when join has no upstream Parallel', () => {
    const def = makeDef(
      [
        { id: 'n1', type: 'start', label: 'Start', position: { x: 0, y: 0 } },
        { id: 'n2', type: 'join', label: 'Join', position: { x: 100, y: 0 } },
        { id: 'n3', type: 'end', label: 'End', position: { x: 200, y: 0 } },
      ],
      [
        { id: 'c1', sourceNodeId: 'n1', targetNodeId: 'n2' },
        { id: 'c2', sourceNodeId: 'n2', targetNodeId: 'n3' },
      ]
    );
    const result = service.validate(def);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('no upstream Parallel'))).toBe(true);
  });

  it('should fail when node is unreachable from Start', () => {
    const def = makeDef(
      [
        { id: 'n1', type: 'start', label: 'Start', position: { x: 0, y: 0 } },
        { id: 'n2', type: 'task', label: 'Orphan', position: { x: 100, y: 0 } },
        { id: 'n3', type: 'end', label: 'End', position: { x: 200, y: 0 } },
      ],
      [{ id: 'c1', sourceNodeId: 'n1', targetNodeId: 'n3' }]
    );
    const result = service.validate(def);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('unreachable'))).toBe(true);
  });

  it('should fail when non-End node has no outgoing connections', () => {
    const def = makeDef(
      [
        { id: 'n1', type: 'start', label: 'Start', position: { x: 0, y: 0 } },
        { id: 'n2', type: 'task', label: 'Dead End', position: { x: 100, y: 0 } },
        { id: 'n3', type: 'end', label: 'End', position: { x: 200, y: 0 } },
      ],
      [
        { id: 'c1', sourceNodeId: 'n1', targetNodeId: 'n2' },
        { id: 'c3', sourceNodeId: 'n1', targetNodeId: 'n3' }  // n2 has no outgoing connections
      ]
    );
    const result = service.validate(def);
    expect(result.valid).toBe(false);
  });

  it('should pass a valid parallel/join workflow', () => {
    const def = makeDef(
      [
        { id: 'n1', type: 'start', label: 'Start', position: { x: 0, y: 0 } },
        { id: 'n2', type: 'parallel', label: 'Split', position: { x: 100, y: 0 } },
        { id: 'n3', type: 'task', label: 'Branch A', position: { x: 200, y: -50 } },
        { id: 'n4', type: 'task', label: 'Branch B', position: { x: 200, y: 50 } },
        { id: 'n5', type: 'join', label: 'Join', position: { x: 300, y: 0 } },
        { id: 'n6', type: 'end', label: 'End', position: { x: 400, y: 0 } },
      ],
      [
        { id: 'c1', sourceNodeId: 'n1', targetNodeId: 'n2' },
        { id: 'c2', sourceNodeId: 'n2', targetNodeId: 'n3' },
        { id: 'c3', sourceNodeId: 'n2', targetNodeId: 'n4' },
        { id: 'c4', sourceNodeId: 'n3', targetNodeId: 'n5' },
        { id: 'c5', sourceNodeId: 'n4', targetNodeId: 'n5' },
        { id: 'c6', sourceNodeId: 'n5', targetNodeId: 'n6' },
      ]
    );
    const result = service.validate(def);
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });
});