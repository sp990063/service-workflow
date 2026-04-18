import { Injectable } from '@nestjs/common';
import { WorkflowDefinition } from '../interfaces';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

@Injectable()
export class WorkflowValidatorService {

  validate(definition: WorkflowDefinition): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Rule 1: Exactly one Start node
    const startNodes = definition.nodes.filter(n => n.type === 'start');
    if (startNodes.length === 0) errors.push('Workflow must have exactly one Start node');
    if (startNodes.length > 1) errors.push('Workflow must have exactly one Start node (found multiple)');

    // Rule 2: At least one End node
    const endNodes = definition.nodes.filter(n => n.type === 'end');
    if (endNodes.length === 0) errors.push('Workflow must have at least one End node');

    // Rule 3: Every non-End node has outgoing connections
    for (const node of definition.nodes) {
      if (node.type === 'end') continue;
      const outgoing = definition.connections.filter(c => c.sourceNodeId === node.id);
      if (outgoing.length === 0) {
        errors.push(`Node "${node.label}" has no outgoing connections`);
      }
    }

    // Rule 4: Parallel/Join structural validation
    const parallelNodes = definition.nodes.filter(n => n.type === 'parallel');
    const joinNodes = definition.nodes.filter(n => n.type === 'join');

    for (const parallel of parallelNodes) {
      const downstreamJoins = this.findDownstream(parallel.id, 'join', definition);
      if (downstreamJoins.length === 0) {
        errors.push(`Parallel node "${parallel.label}" has no downstream Join — will deadlock`);
      }
    }

    for (const join of joinNodes) {
      const upstreamParallels = this.findUpstream(join.id, 'parallel', definition);
      if (upstreamParallels.length === 0) {
        errors.push(`Join node "${join.label}" has no upstream Parallel`);
      }
    }

    // Rule 5: No orphan nodes
    const reachable = this.computeReachable(definition);
    for (const node of definition.nodes) {
      if (!reachable.has(node.id) && node.type !== 'start') {
        errors.push(`Node "${node.label}" is unreachable from Start`);
      }
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  private findDownstream(nodeId: string, targetType: string, def: WorkflowDefinition): any[] {
    const visited = new Set<string>();
    const result: any[] = [];
    const queue = [nodeId];
    while (queue.length) {
      const current = queue.shift()!;
      if (visited.has(current)) continue;
      visited.add(current);
      for (const conn of def.connections.filter(c => c.sourceNodeId === current)) {
        const target = def.nodes.find(n => n.id === conn.targetNodeId);
        if (target?.type === targetType) result.push(target);
        else if (target) queue.push(target.id);
      }
    }
    return result;
  }

  private findUpstream(nodeId: string, targetType: string, def: WorkflowDefinition): any[] {
    const visited = new Set<string>();
    const result: any[] = [];
    const queue = [nodeId];
    while (queue.length) {
      const current = queue.shift()!;
      if (visited.has(current)) continue;
      visited.add(current);
      for (const conn of def.connections.filter(c => c.targetNodeId === current)) {
        const source = def.nodes.find(n => n.id === conn.sourceNodeId);
        if (source?.type === targetType) result.push(source);
        else if (source) queue.push(source.id);
      }
    }
    return result;
  }

  private computeReachable(def: WorkflowDefinition): Set<string> {
    const reachable = new Set<string>();
    const queue = def.nodes.filter(n => n.type === 'start').map(n => n.id);
    while (queue.length) {
      const current = queue.shift()!;
      if (reachable.has(current)) continue;
      reachable.add(current);
      def.connections.filter(c => c.sourceNodeId === current).forEach(c => {
        if (!reachable.has(c.targetNodeId)) queue.push(c.targetNodeId);
      });
    }
    return reachable;
  }
}