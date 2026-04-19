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

export interface WorkflowDefinition {
  id: string;
  name: string;
  nodes: WorkflowNode[];
  connections: Connection[];
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

export * from './condition-config.interface';
export * from './sub-workflow-mapping.interface';
