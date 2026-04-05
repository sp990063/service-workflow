/**
 * Workflow Engine Utilities
 * 
 * Core logic for workflow execution and condition evaluation.
 */

export function evaluateCondition(
  value: any,
  operator: string,
  compareValue: any
): boolean {
  switch (operator) {
    case 'equals':
      return value === compareValue;
    case 'not_equals':
      return value !== compareValue;
    case 'contains':
      return String(value).includes(String(compareValue));
    case 'greater_than':
      return Number(value) > Number(compareValue);
    case 'less_than':
      return Number(value) < Number(compareValue);
    case 'greater_than_or_equals':
      return Number(value) >= Number(compareValue);
    case 'less_than_or_equals':
      return Number(value) <= Number(compareValue);
    case 'is_empty':
      return value === null || value === undefined || value === '';
    case 'is_not_empty':
      return value !== null && value !== undefined && value !== '';
    default:
      return false;
  }
}

export function getNextNode(
  currentNodeId: string,
  connections: Array<{ from: string; to: string }>
): string | null {
  const connection = connections.find(c => c.from === currentNodeId);
  return connection?.to ?? null;
}

export function parseWorkflow(workflow: {
  nodes: string | any[];
  connections: string | any[];
}) {
  const nodes = typeof workflow.nodes === 'string' 
    ? JSON.parse(workflow.nodes) 
    : workflow.nodes;
  const connections = typeof workflow.connections === 'string' 
    ? JSON.parse(workflow.connections) 
    : workflow.connections;
  
  return { nodes, connections };
}

export function findNodeById(nodes: any[], id: string): any {
  return nodes.find(n => n.id === id);
}

export function getStartNode(nodes: any[]): any {
  return nodes.find(n => n.type === 'start');
}

export function getEndNodes(nodes: any[]): any[] {
  return nodes.filter(n => n.type === 'end');
}

export function validateWorkflowStructure(nodes: any[], connections: any[]): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Check for start node
  if (!nodes.some(n => n.type === 'start')) {
    errors.push('Workflow must have a start node');
  }

  // Check for at least one end node
  if (!nodes.some(n => n.type === 'end')) {
    errors.push('Workflow must have at least one end node');
  }

  // Check all connection targets exist
  const nodeIds = new Set(nodes.map(n => n.id));
  connections.forEach(conn => {
    if (!nodeIds.has(conn.from)) {
      errors.push(`Connection references non-existent node: ${conn.from}`);
    }
    if (!nodeIds.has(conn.to)) {
      errors.push(`Connection references non-existent node: ${conn.to}`);
    }
  });

  return {
    valid: errors.length === 0,
    errors,
  };
}
