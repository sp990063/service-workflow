import { randomUUID } from 'crypto';

export interface MockUser {
  id: string;
  email: string;
  name: string;
  password: string;
  role: 'admin' | 'manager' | 'user';
  department?: string;
  createdAt: Date;
  updatedAt: Date;
}

export function createMockUser(overrides: Partial<MockUser> = {}): MockUser {
  const now = new Date();
  return {
    id: randomUUID(),
    email: 'user@example.com',
    name: 'Test User',
    password: 'hashed_password',
    role: 'user',
    department: 'Engineering',
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}
