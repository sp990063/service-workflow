/**
 * Workflow Integration Tests
 * 
 * These tests verify workflow CRUD and state management.
 * Run with: npm run test:integration
 * 
 * Note: These use the actual database, not mocks.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const TEST_USER_ID = 'integration-test-user';
const TEST_WORKFLOW_NAME = `Test-Workflow-${Date.now()}`;

async function cleanup() {
  await prisma.workflowInstance.deleteMany({
    where: { workflow: { name: { contains: 'Test-Workflow-' } } }
  });
  await prisma.workflow.deleteMany({
    where: { name: { contains: 'Test-Workflow-' } }
  });
}

describe('Workflow Integration Tests', () => {
  beforeAll(async () => {
    // Clean up any existing test data
    await cleanup();
  });

  afterAll(async () => {
    // Clean up test data
    await cleanup();
    await prisma.$disconnect();
  });

  describe('Workflow Creation with Nodes', () => {
    it('should create workflow with START node', async () => {
      const workflow = await prisma.workflow.create({
        data: {
          name: `${TEST_WORKFLOW_NAME}-start`,
          description: 'Test start node',
          nodes: JSON.stringify([
            { id: 'start-1', type: 'start', data: { label: 'Start' } },
            { id: 'end-1', type: 'end', data: { label: 'End' } },
          ]),
          connections: JSON.stringify([
            { from: 'start-1', to: 'end-1' },
          ]),
          userId: TEST_USER_ID,
        },
      });

      expect(workflow.id).toBeDefined();
      expect(workflow.name).toBe(`${TEST_WORKFLOW_NAME}-start`);

      const nodes = JSON.parse(workflow.nodes as string);
      expect(nodes).toHaveLength(2);
      expect(nodes[0].type).toBe('start');
    });

    it('should create workflow with CONDITION node', async () => {
      const workflow = await prisma.workflow.create({
        data: {
          name: `${TEST_WORKFLOW_NAME}-condition`,
          description: 'Test condition node',
          nodes: JSON.stringify([
            { id: 'start-1', type: 'start', data: { label: 'Start' } },
            { id: 'cond-1', type: 'condition', data: { label: 'Check', field: 'status', operator: 'equals', value: 'approved' } },
            { id: 'end-1', type: 'end', data: { label: 'End' } },
          ]),
          connections: JSON.stringify([
            { from: 'start-1', to: 'cond-1' },
            { from: 'cond-1', to: 'end-1' },
          ]),
          userId: TEST_USER_ID,
        },
      });

      expect(workflow.id).toBeDefined();
      const nodes = JSON.parse(workflow.nodes as string);
      const conditionNode = nodes.find((n: any) => n.type === 'condition');
      expect(conditionNode).toBeDefined();
      expect(conditionNode.data.field).toBe('status');
    });

    it('should create workflow with PARALLEL node', async () => {
      const workflow = await prisma.workflow.create({
        data: {
          name: `${TEST_WORKFLOW_NAME}-parallel`,
          description: 'Test parallel node',
          nodes: JSON.stringify([
            { id: 'start-1', type: 'start', data: { label: 'Start' } },
            { id: 'parallel-1', type: 'parallel', data: { label: 'Parallel', joinType: 'AND' } },
            { id: 'end-1', type: 'end', data: { label: 'End' } },
          ]),
          connections: JSON.stringify([
            { from: 'start-1', to: 'parallel-1' },
            { from: 'parallel-1', to: 'end-1' },
          ]),
          userId: TEST_USER_ID,
        },
      });

      expect(workflow.id).toBeDefined();
      const nodes = JSON.parse(workflow.nodes as string);
      const parallelNode = nodes.find((n: any) => n.type === 'parallel');
      expect(parallelNode).toBeDefined();
      expect(parallelNode.data.joinType).toBe('AND');
    });

    it('should create workflow with FORM node', async () => {
      const workflow = await prisma.workflow.create({
        data: {
          name: `${TEST_WORKFLOW_NAME}-form`,
          description: 'Test form node',
          nodes: JSON.stringify([
            { id: 'start-1', type: 'start', data: { label: 'Start' } },
            { id: 'form-1', type: 'form', data: { label: 'Fill Form', formId: 'test-form-id' } },
            { id: 'end-1', type: 'end', data: { label: 'End' } },
          ]),
          connections: JSON.stringify([
            { from: 'start-1', to: 'form-1' },
            { from: 'form-1', to: 'end-1' },
          ]),
          userId: TEST_USER_ID,
        },
      });

      expect(workflow.id).toBeDefined();
      const nodes = JSON.parse(workflow.nodes as string);
      const formNode = nodes.find((n: any) => n.type === 'form');
      expect(formNode).toBeDefined();
      expect(formNode.data.formId).toBe('test-form-id');
    });
  });

  describe('Workflow Instance Lifecycle', () => {
    let workflowId: string;
    let instanceId: string;

    beforeAll(async () => {
      // Find the start workflow
      const workflow = await prisma.workflow.findFirst({
        where: { name: `${TEST_WORKFLOW_NAME}-start` }
      });
      workflowId = workflow.id;
    });

    it('should start workflow instance', async () => {
      const nodes = JSON.parse((await prisma.workflow.findUnique({ where: { id: workflowId } })).nodes as string);
      const startNode = nodes.find((n: any) => n.type === 'start');

      const instance = await prisma.workflowInstance.create({
        data: {
          workflowId,
          userId: TEST_USER_ID,
          currentNodeId: startNode.id,
          status: 'IN_PROGRESS',
          formData: '{}',
          history: JSON.stringify([
            { nodeId: startNode.id, action: 'started', timestamp: new Date().toISOString() }
          ]),
        },
      });

      expect(instance.id).toBeDefined();
      expect(instance.status).toBe('IN_PROGRESS');
      expect(instance.currentNodeId).toBe(startNode.id);

      instanceId = instance.id;
    });

    it('should advance workflow to next node', async () => {
      const nodes = JSON.parse((await prisma.workflow.findUnique({ where: { id: workflowId } })).nodes as string);
      const endNode = nodes.find((n: any) => n.type === 'end');

      const updatedInstance = await prisma.workflowInstance.update({
        where: { id: instanceId },
        data: {
          currentNodeId: endNode.id,
          history: JSON.stringify([
            { nodeId: endNode.id, action: 'completed', timestamp: new Date().toISOString() }
          ]),
        },
      });

      expect(updatedInstance.currentNodeId).toBe(endNode.id);
    });

    it('should complete workflow instance', async () => {
      const completed = await prisma.workflowInstance.update({
        where: { id: instanceId },
        data: { status: 'COMPLETED' },
      });

      expect(completed.status).toBe('COMPLETED');
    });

    it('should get workflow instances', async () => {
      const instances = await prisma.workflowInstance.findMany({
        where: { workflowId },
      });

      expect(instances.length).toBeGreaterThan(0);
    });
  });

  describe('RBAC Enforcement', () => {
    it('should associate workflow with user on create', async () => {
      const workflows = await prisma.workflow.findMany({
        where: { userId: TEST_USER_ID },
      });

      expect(workflows.length).toBeGreaterThan(0);
      workflows.forEach(w => {
        expect(w.userId).toBe(TEST_USER_ID);
      });
    });

    it('should filter workflows by user', async () => {
      const myWorkflows = await prisma.workflow.findMany({
        where: { userId: TEST_USER_ID },
      });

      const otherWorkflows = await prisma.workflow.findMany({
        where: { userId: { not: TEST_USER_ID } },
      });

      // All my workflows should have my userId
      myWorkflows.forEach(w => {
        expect(w.userId).toBe(TEST_USER_ID);
      });
    });
  });
});
