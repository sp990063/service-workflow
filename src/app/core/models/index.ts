export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'manager' | 'user';
  department?: string;
}

export interface FormSection {
  id: string;
  title: string;
  description?: string;
  columns: 1 | 2 | 3 | 4;
  order: number;
}

export interface FormElement {
  id: string;
  type: string;
  label: string;
  required: boolean;
  placeholder?: string;
  options?: string[];
  helpText?: string;
  defaultValue?: string;
  sectionId?: string; // Which section this element belongs to
  // Text/Textarea specific
  minLength?: number;
  maxLength?: number;
  rows?: number;
  // Number specific
  min?: number;
  max?: number;
  step?: number;
  // Date/Time specific
  minDate?: string;
  maxDate?: string;
  minTime?: string;
  maxTime?: string;
  // File/Image specific
  allowedTypes?: string[];
  maxSize?: number; // in KB
  maxFiles?: number;
  // Select specific
  allowMultiple?: boolean;
  allowOther?: boolean;
  // Checkbox/Radio specific
  minSelect?: number;
  maxSelect?: number;
  // User/Dept picker specific
  filterRole?: string;
  includeSubDepts?: boolean;
  // Rich text specific
  toolbarOptions?: string[];
  // Table specific
  columns?: { name: string; type: string; width?: string }[];
  // Calculated specific
  expression?: string;
  // Address specific
  addressFields?: string[];
  // URL specific
  allowedProtocols?: string[];
  // Validation
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    customError?: string;
  };
}

export interface Form {
  id: string;
  name: string;
  description?: string;
  elements: FormElement[];
  sections?: FormSection[];
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
