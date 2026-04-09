import { randomUUID } from 'crypto';

export interface MockFormElement {
  id: string;
  type: string;
  label: string;
  required: boolean;
  placeholder?: string;
  options?: string[];
  sectionId?: string;
}

export interface MockForm {
  id: string;
  name: string;
  description: string | null;
  elements: MockFormElement[];
  sections?: any[];
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface MockFormSubmission {
  id: string;
  formId: string;
  userId: string;
  formData: Record<string, any>;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  createdAt: Date;
  updatedAt: Date;
}

export function createMockForm(overrides: Partial<MockForm> = {}): MockForm {
  const now = new Date();
  return {
    id: randomUUID(),
    name: 'Test Form',
    description: null,
    elements: [
      { id: 'el-1', type: 'text', label: 'Name', required: true, placeholder: 'Enter your name' },
      { id: 'el-2', type: 'dropdown', label: 'Priority', required: false, options: ['Low', 'Medium', 'High'] },
      { id: 'el-3', type: 'email', label: 'Email', required: true, placeholder: 'email@example.com' },
    ],
    sections: [],
    version: 1,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

export function createMockFormSubmission(overrides: Partial<MockFormSubmission> = {}): MockFormSubmission {
  const now = new Date();
  return {
    id: randomUUID(),
    formId: 'form-123',
    userId: 'user-123',
    formData: { name: 'John', email: 'john@example.com', priority: 'High' },
    status: 'PENDING',
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}
