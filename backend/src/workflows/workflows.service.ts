import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class WorkflowsService {
  constructor(private prisma: PrismaService) {}

  private parseJsonFields(workflow: any) {
    if (!workflow) return workflow;
    return {
      ...workflow,
      nodes: typeof workflow.nodes === 'string' ? JSON.parse(workflow.nodes) : workflow.nodes,
      connections: typeof workflow.connections === 'string' ? JSON.parse(workflow.connections) : workflow.connections,
    };
  }

  private parseInstanceFields(instance: any) {
    if (!instance) return instance;
    return {
      ...instance,
      formData: typeof instance.formData === 'string' ? JSON.parse(instance.formData) : instance.formData,
      history: typeof instance.history === 'string' ? JSON.parse(instance.history) : instance.history,
    };
  }

  async findAll() {
    const workflows = await this.prisma.workflow.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
    });
    return workflows.map(w => this.parseJsonFields(w));
  }

  async findById(id: string) {
    const workflow = await this.prisma.workflow.findUnique({ where: { id } });
    return this.parseJsonFields(workflow);
  }

  async create(data: { name: string; description?: string; nodes: any[]; connections: any[] }) {
    return this.prisma.workflow.create({
      data: {
        name: data.name,
        description: data.description,
        nodes: JSON.stringify(data.nodes),
        connections: JSON.stringify(data.connections),
      },
    });
  }

  async update(id: string, data: { name?: string; nodes?: any[]; connections?: any[] }) {
    const updateData: any = { ...data };
    if (data.nodes !== undefined) updateData.nodes = JSON.stringify(data.nodes);
    if (data.connections !== undefined) updateData.connections = JSON.stringify(data.connections);
    return this.prisma.workflow.update({ where: { id }, data: updateData });
  }

  async delete(id: string) {
    return this.prisma.workflow.update({ where: { id }, data: { isActive: false } });
  }

  // Instance management
  async startInstance(workflowId: string, userId: string) {
    const workflow = await this.findById(workflowId);
    if (!workflow) {
      throw new Error('Workflow not found');
    }

    const startNode = workflow.nodes.find((n: any) => n.type === 'start');

    return this.prisma.workflowInstance.create({
      data: {
        workflowId,
        userId,
        currentNodeId: startNode?.id || null,
        status: 'PENDING',
        formData: JSON.stringify({}),
        history: JSON.stringify([]),
      },
    });
  }

  async getInstance(id: string) {
    const instance = await this.prisma.workflowInstance.findUnique({
      where: { id },
      include: {
        workflow: true,
        user: { select: { id: true, name: true, email: true } },
      },
    });
    if (instance) {
      return {
        ...instance,
        workflow: this.parseJsonFields(instance.workflow),
        ...this.parseInstanceFields(instance),
      };
    }
    return instance;
  }

  async getInstanceById(id: string) {
    const instance = await this.prisma.workflowInstance.findUnique({ where: { id } });
    return this.parseInstanceFields(instance);
  }

  async updateInstance(id: string, data: any) {
    const instance = await this.getInstanceById(id);
    if (!instance) {
      throw new Error('Instance not found');
    }

    const updateData: any = {};
    if (data.currentNodeId !== undefined) updateData.currentNodeId = data.currentNodeId;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.formData !== undefined) updateData.formData = JSON.stringify(data.formData);
    if (data.history !== undefined) updateData.history = JSON.stringify(data.history);
    if (data.childInstanceId !== undefined) updateData.childInstanceId = data.childInstanceId;

    const updated = await this.prisma.workflowInstance.update({
      where: { id },
      data: updateData,
    });

    return this.parseInstanceFields(updated);
  }

  async getInstances(workflowId?: string) {
    const instances = await this.prisma.workflowInstance.findMany({
      where: workflowId ? { workflowId } : undefined,
      include: {
        workflow: { select: { id: true, name: true } },
        user: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return instances.map(i => ({
      ...i,
      workflow: this.parseJsonFields(i.workflow),
      ...this.parseInstanceFields(i),
    }));
  }

  async getAllInstances() {
    const instances = await this.prisma.workflowInstance.findMany({
      include: {
        workflow: { select: { id: true, name: true } },
        user: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return instances.map(i => ({
      ...i,
      workflow: this.parseJsonFields(i.workflow),
      ...this.parseInstanceFields(i),
    }));
  }

  async advanceInstance(id: string, nextNodeId: string, addToHistory: any) {
    const instance = await this.getInstanceById(id);
    if (!instance) {
      throw new Error('Instance not found');
    }

    const workflow = await this.findById(instance.workflowId);
    if (!workflow) {
      throw new Error('Workflow not found');
    }

    const currentNode = workflow.nodes.find((n: any) => n.id === instance.currentNodeId);
    const nextNode = workflow.nodes.find((n: any) => n.id === nextNodeId);

    const history = [...instance.history, ...addToHistory];

    let newStatus = instance.status;
    if (nextNode?.type === 'end') {
      newStatus = 'COMPLETED';
    } else if (nextNode?.type === 'sub-workflow' && nextNode.data?.waitForCompletion) {
      newStatus = 'WAITING_FOR_CHILD';
    }

    return this.prisma.workflowInstance.update({
      where: { id },
      data: {
        currentNodeId: nextNodeId,
        status: newStatus,
        history: JSON.stringify(history),
      },
    });
  }

  async completeInstance(id: string) {
    return this.prisma.workflowInstance.update({
      where: { id },
      data: {
        status: 'COMPLETED',
        currentNodeId: null,
      },
    });
  }

  async createChildInstance(parentId: string, childWorkflowId: string, userId: string, formData: any) {
    const childWorkflow = await this.findById(childWorkflowId);
    if (!childWorkflow) {
      throw new Error('Child workflow not found');
    }

    const startNode = childWorkflow.nodes.find((n: any) => n.type === 'start');

    return this.prisma.workflowInstance.create({
      data: {
        workflowId: childWorkflowId,
        userId,
        currentNodeId: startNode?.id || null,
        status: 'IN_PROGRESS',
        formData: JSON.stringify(formData),
        history: JSON.stringify(startNode ? [{ nodeId: startNode.id, action: `Started: ${startNode.data?.label || startNode.type}`, timestamp: new Date() }] : []),
        parentInstanceId: parentId,
      },
    });
  }

  async getChildInstances(parentId: string) {
    const instances = await this.prisma.workflowInstance.findMany({
      where: { parentInstanceId: parentId },
    });
    return instances.map(i => this.parseInstanceFields(i));
  }
}
