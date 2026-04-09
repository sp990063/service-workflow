export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'manager' | 'user';
  department?: string;
}

export interface FormElement {
  id: string;
  type: string;
  label: string;
  required: boolean;
  placeholder?: string;
  options?: string[];
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
  };
}

export interface Form {
  id: string;
  name: string;
  description?: string;
  elements: FormElement[];
  version?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface WorkflowNode {
  id: string;
  type: 'start' | 'end' | 'form' | 'task' | 'condition' | 'approval' | 'parallel' | 'join' | 'sub-workflow' | 'script' | 'setvalue' | 'transform';
  position: { x: number; y: number };
  data: Record<string, unknown>;
}

export interface WorkflowConnection {
  id: string;
  source: string;
  target: string;
}

export interface Workflow {
  id: string;
  name: string;
  description?: string;
  nodes: WorkflowNode[];
  connections: WorkflowConnection[];
  createdAt: Date;
  updatedAt: Date;
}

export interface WorkflowInstance {
  id: string;
  displayId?: string;
  workflowId: string;
  workflow?: Workflow;
  userId: string;
  user?: User;
  currentNodeId?: string;
  status: string;
  formData?: Record<string, unknown>;
  history?: any[];
  createdAt: Date;
  updatedAt: Date;
}

export interface DashboardStats {
  totalForms: number;
  totalWorkflows: number;
  pendingApprovals: number;
  completedSubmissions: number;
}
