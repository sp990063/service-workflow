import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class WorkflowsService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.workflow.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: string) {
    return this.prisma.workflow.findUnique({ where: { id } });
  }

  async create(data: { name: string; description?: string; nodes: any[]; connections: any[] }) {
    return this.prisma.workflow.create({
      data: {
        name: data.name,
        description: data.description,
        nodes: data.nodes,
        connections: data.connections,
      },
    });
  }

  async update(id: string, data: { name?: string; nodes?: any[]; connections?: any[] }) {
    return this.prisma.workflow.update({ where: { id }, data });
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

    const nodes = workflow.nodes as any[];
    const startNode = nodes.find((n) => n.type === 'start');

    return this.prisma.workflowInstance.create({
      data: {
        workflowId,
        userId,
        currentNodeId: startNode?.id || null,
        status: 'PENDING',
        formData: {},
        history: [],
      },
    });
  }

  async getInstance(id: string) {
    return this.prisma.workflowInstance.findUnique({
      where: { id },
      include: {
        workflow: true,
        user: { select: { id: true, name: true, email: true } },
      },
    });
  }

  async getInstanceById(id: string) {
    return this.prisma.workflowInstance.findUnique({ where: { id } });
  }

  async updateInstance(id: string, data: any) {
    const instance = await this.prisma.workflowInstance.findUnique({ where: { id } });
    if (!instance) {
      throw new Error('Instance not found');
    }

    const updated = await this.prisma.workflowInstance.update({
      where: { id },
      data: {
        currentNodeId: data.currentNodeId ?? instance.currentNodeId,
        status: data.status ?? instance.status,
        formData: data.formData ?? instance.formData,
        history: data.history ?? instance.history,
        childInstanceId: data.childInstanceId ?? instance.childInstanceId,
      },
    });

    return updated;
  }

  async getInstances(workflowId?: string) {
    return this.prisma.workflowInstance.findMany({
      where: workflowId ? { workflowId } : undefined,
      include: {
        workflow: { select: { id: true, name: true } },
        user: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getAllInstances() {
    return this.prisma.workflowInstance.findMany({
      include: {
        workflow: { select: { id: true, name: true } },
        user: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
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

    const nodes = workflow.nodes as any[];
    const currentNode = nodes.find((n) => n.id === instance.currentNodeId);
    const nextNode = nodes.find((n) => n.id === nextNodeId);

    const history = [...(instance.history as any[]), ...addToHistory];

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
        history,
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

    const nodes = childWorkflow.nodes as any[];
    const startNode = nodes.find((n) => n.type === 'start');

    return this.prisma.workflowInstance.create({
      data: {
        workflowId: childWorkflowId,
        userId,
        currentNodeId: startNode?.id || null,
        status: 'IN_PROGRESS',
        formData,
        history: startNode ? [{ nodeId: startNode.id, action: `Started: ${startNode.data?.label || startNode.type}`, timestamp: new Date() }] : [],
        parentInstanceId: parentId,
      },
    });
  }

  async getChildInstances(parentId: string) {
    return this.prisma.workflowInstance.findMany({
      where: { parentInstanceId: parentId },
    });
  }
}
