import { Injectable } from '@angular/core';

export interface ValidationIssue {
  type: 'error' | 'warning';
  nodeId?: string;
  message: string;
  path?: string[];
}

export interface WorkflowGraph {
  nodes: WorkflowNode[];
  connections: Connection[];
}

export interface WorkflowNode {
  id: string;
  type: string;
  label: string;
  position: { x: number; y: number };
  config: Record<string, any>;
}

export interface Connection {
  id: string;
  sourceNodeId: string;
  targetNodeId: string;
  sourceHandle?: string;
}

@Injectable({ providedIn: 'root' })
export class DeadlockDetectionService {

  validate(graph: WorkflowGraph): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    const parallelNodes = graph.nodes.filter(n => n.type === 'parallel');
    const joinNodes = graph.nodes.filter(n => n.type === 'join');

    for (const parallel of parallelNodes) {
      const downstreamJoins = this.findDownstreamJoins(parallel.id, graph);
      if (downstreamJoins.length === 0) {
        issues.push({
          type: 'error',
          nodeId: parallel.id,
          message: `Parallel node "${parallel.label}" has no downstream Join node. This will cause a deadlock.`,
        });
      } else if (downstreamJoins.length > 1) {
        issues.push({
          type: 'warning',
          nodeId: parallel.id,
          message: `Parallel node "${parallel.label}" has ${downstreamJoins.length} downstream Join nodes. Consider using one Join per Parallel.`,
          path: [parallel.id, ...downstreamJoins.map(j => j.id)],
        });
      }
    }

    for (const join of joinNodes) {
      const upstreamParallels = this.findUpstreamParallels(join.id, graph);
      if (upstreamParallels.length === 0) {
        issues.push({
          type: 'error',
          nodeId: join.id,
          message: `Join node "${join.label}" has no upstream Parallel node.`,
        });
      } else {
        const expectedBranches = (join.config?.['branches'] as string[])?.length || upstreamParallels.length;
        if (upstreamParallels.length !== expectedBranches) {
          issues.push({
            type: 'warning',
            nodeId: join.id,
            message: `Join node "${join.label}" receives from ${upstreamParallels.length} branches but expects ${expectedBranches}.`,
            path: [...upstreamParallels.map(p => p.id), join.id],
          });
        }
      }
    }

    const reachable = this.computeReachableNodes(graph);
    const unreachable = graph.nodes.filter(n => n.type !== 'start' && !reachable.has(n.id));
    for (const node of unreachable) {
      issues.push({
        type: 'error',
        nodeId: node.id,
        message: `Node "${node.label}" is unreachable from the Start node.`,
      });
    }

    for (const node of graph.nodes) {
      if (node.type === 'end') continue;
      const outgoing = graph.connections.filter(c => c.sourceNodeId === node.id);
      if (outgoing.length === 0) {
        issues.push({
          type: 'error',
          nodeId: node.id,
          message: `Node "${node.label}" has no outgoing connections.`,
        });
      }
    }

    const cycles = this.detectCycles(graph);
    for (const cycle of cycles) {
      issues.push({
        type: 'warning',
        message: `Detected a loop: ${cycle.map(id => this.getNodeLabel(graph, id)).join(' → ')}`,
        path: cycle,
      });
    }

    return issues;
  }

  private findDownstreamJoins(nodeId: string, graph: WorkflowGraph): WorkflowNode[] {
    const visited = new Set<string>();
    const joins: WorkflowNode[] = [];
    const queue = [nodeId];

    while (queue.length) {
      const current = queue.shift()!;
      if (visited.has(current)) continue;
      visited.add(current);

      const outgoing = graph.connections.filter(c => c.sourceNodeId === current);
      for (const conn of outgoing) {
        const targetNode = graph.nodes.find(n => n.id === conn.targetNodeId);
        if (targetNode?.type === 'join') {
          joins.push(targetNode);
        } else if (targetNode) {
          queue.push(targetNode.id);
        }
      }
    }
    return joins;
  }

  private findUpstreamParallels(nodeId: string, graph: WorkflowGraph): WorkflowNode[] {
    const visited = new Set<string>();
    const parallels: WorkflowNode[] = [];
    const queue = [nodeId];

    while (queue.length) {
      const current = queue.shift()!;
      if (visited.has(current)) continue;
      visited.add(current);

      const incoming = graph.connections.filter(c => c.targetNodeId === current);
      for (const conn of incoming) {
        const sourceNode = graph.nodes.find(n => n.id === conn.sourceNodeId);
        if (sourceNode?.type === 'parallel') {
          parallels.push(sourceNode);
        } else if (sourceNode) {
          queue.push(sourceNode.id);
        }
      }
    }
    return parallels;
  }

  private computeReachableNodes(graph: WorkflowGraph): Set<string> {
    const reachable = new Set<string>();
    const startNodes = graph.nodes.filter(n => n.type === 'start');
    const queue = startNodes.map(n => n.id);

    while (queue.length) {
      const current = queue.shift()!;
      if (reachable.has(current)) continue;
      reachable.add(current);

      const outgoing = graph.connections.filter(c => c.sourceNodeId === current);
      for (const conn of outgoing) {
        if (!reachable.has(conn.targetNodeId)) queue.push(conn.targetNodeId);
      }
    }
    return reachable;
  }

  private detectCycles(graph: WorkflowGraph): string[][] {
    const cycles: string[][] = [];
    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    const path: string[] = [];

    const dfs = (nodeId: string): void => {
      visited.add(nodeId);
      recursionStack.add(nodeId);
      path.push(nodeId);

      const outgoing = graph.connections.filter(c => c.sourceNodeId === nodeId);
      for (const conn of outgoing) {
        if (!visited.has(conn.targetNodeId)) {
          dfs(conn.targetNodeId);
        } else if (recursionStack.has(conn.targetNodeId)) {
          const cycleStart = path.indexOf(conn.targetNodeId);
          cycles.push([...path.slice(cycleStart), conn.targetNodeId]);
        }
      }

      path.pop();
      recursionStack.delete(nodeId);
    };

    for (const node of graph.nodes) {
      if (!visited.has(node.id)) dfs(node.id);
    }
    return cycles;
  }

  private getNodeLabel(graph: WorkflowGraph, nodeId: string): string {
    return graph.nodes.find(n => n.id === nodeId)?.label || nodeId;
  }

  assignBranchColors(graph: WorkflowGraph): Map<string, string> {
    const colors = new Map<string, string>();
    const palette = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD'];
    let colorIndex = 0;

    for (const parallel of graph.nodes.filter(n => n.type === 'parallel')) {
      const downstreamNodes = this.getBranchNodes(parallel.id, graph);
      const branchColor = palette[colorIndex % palette.length];
      for (const nodeId of downstreamNodes) {
        colors.set(nodeId, branchColor);
      }
      colorIndex++;
    }
    return colors;
  }

  private getBranchNodes(parallelId: string, graph: WorkflowGraph): string[] {
    const downstreamJoins = this.findDownstreamJoins(parallelId, graph);
    if (!downstreamJoins.length) return [];

    const matchingJoin = downstreamJoins[0];
    const reachable = new Set<string>();
    const queue = [parallelId];

    while (queue.length) {
      const current = queue.shift()!;
      if (reachable.has(current)) continue;
      reachable.add(current);

      const outgoing = graph.connections.filter(c => c.sourceNodeId === current);
      for (const conn of outgoing) {
        if (conn.targetNodeId !== matchingJoin.id && !reachable.has(conn.targetNodeId)) {
          queue.push(conn.targetNodeId);
        }
      }
    }
    return Array.from(reachable);
  }
}