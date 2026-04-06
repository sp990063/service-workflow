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

  async findAllByUser(userId: string) {
    const workflows = await this.prisma.workflow.findMany({
      where: { isActive: true, userId },
      orderBy: { createdAt: 'desc' },
    });
    return workflows.map(w => this.parseJsonFields(w));
  }

  async findById(id: string) {
    const workflow = await this.prisma.workflow.findUnique({ where: { id } });
    return this.parseJsonFields(workflow);
  }

  async findByName(name: string) {
    const workflow = await this.prisma.workflow.findFirst({ where: { name } });
    return this.parseJsonFields(workflow);
  }

  async create(data: { name: string; description?: string; nodes?: any[]; connections?: any[]; userId: string }) {
    return this.prisma.workflow.create({
      data: {
        name: data.name,
        description: data.description ?? null,
        nodes: JSON.stringify(data.nodes ?? []),
        connections: JSON.stringify(data.connections ?? []),
        userId: data.userId,
      },
    });
  }

  async update(id: string, data: { name?: string; nodes?: any[]; connections?: any[] }) {
    const updateData: any = { ...data };
    if (data.nodes !== undefined) updateData.nodes = JSON.stringify(data.nodes ?? []);
    if (data.connections !== undefined) updateData.connections = JSON.stringify(data.connections ?? []);
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

    const nodes = workflow.nodes as any[];
    const startNode = nodes.find((n: any) => n.type === 'start');
    const startIdx = nodes.findIndex((n: any) => n.type === 'start');
    
    // Determine the first actionable node after start
    const firstActionableNode = nodes[startIdx + 1];
    const history = startNode ? [{
      nodeId: startNode.id,
      action: `Started: ${startNode.data?.label || startNode.type}`,
      timestamp: new Date()
    }] : [];

    const instance = await this.prisma.workflowInstance.create({
      data: {
        workflowId,
        userId,
        currentNodeId: firstActionableNode?.id || startNode?.id || null,
        status: 'IN_PROGRESS',
        formData: JSON.stringify({}),
        history: JSON.stringify(history),
      },
    });
    
    // Parse the created instance before returning
    const parsed = this.parseInstanceFields(instance);
    // Ensure history is a proper array for frontend consumption
    if (typeof parsed.history === 'string') {
      parsed.history = JSON.parse(parsed.history);
    }
    return parsed;
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

    // Parse history if it's still a string (from Prisma raw return)
    let existingHistory: any[] = [];
    if (typeof instance.history === 'string') {
      try { existingHistory = JSON.parse(instance.history); } catch { existingHistory = []; }
    } else if (Array.isArray(instance.history)) {
      existingHistory = instance.history;
    }

    const workflow = await this.findById(instance.workflowId);
    if (!workflow) {
      throw new Error('Workflow not found');
    }

    const currentNode = workflow.nodes.find((n: any) => n.id === instance.currentNodeId);
    const nextNode = workflow.nodes.find((n: any) => n.id === nextNodeId);

    const history = [...existingHistory, ...addToHistory];

    let newStatus = instance.status;
    let updatedFormData = instance.formData || {};

    if (nextNode?.type === 'end') {
      newStatus = 'COMPLETED';
    } else if (nextNode?.type === 'sub-workflow' && nextNode.data?.waitForCompletion) {
      newStatus = 'WAITING_FOR_CHILD';
    } else if (nextNode?.type === 'parallel') {
      // Initialize parallel approval state
      const requiredApprovers = nextNode.data?.requiredApprovers || [];
      if (requiredApprovers.length > 0) {
        const parallelApprovals = {
          ...(updatedFormData.parallelApprovals || {}),
          [nextNode.id]: {
            nodeId: nextNode.id,
            requiredApprovers,
            approvals: [],
            status: 'PENDING' as 'PENDING' | 'ALL_APPROVED' | 'REJECTED',
          },
        };
        updatedFormData = { ...updatedFormData, parallelApprovals };
      }
    }

    const updateData: any = {
      currentNodeId: nextNodeId,
      status: newStatus,
      history: JSON.stringify(history),
    };

    // Include formData update if we initialized parallel approval
    if (nextNode?.type === 'parallel' && nextNode.data?.requiredApprovers?.length > 0) {
      updateData.formData = JSON.stringify(updatedFormData);
    }

    const updated = await this.prisma.workflowInstance.update({
      where: { id },
      data: updateData,
    });
    const parsed = this.parseInstanceFields(updated);
    console.log('[DEBUG] advanceInstance returning:', JSON.stringify(parsed).substring(0, 200));
    return parsed;
  }

  async completeInstance(id: string) {
    const updated = await this.prisma.workflowInstance.update({
      where: { id },
      data: {
        status: 'COMPLETED',
        currentNodeId: null,
      },
    });
    return this.parseInstanceFields(updated);
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

  // Parallel Approval Management
  async initParallelApproval(id: string, nodeId: string, requiredApprovers: string[]) {
    const instance = await this.getInstanceById(id);
    if (!instance) {
      throw new Error('Instance not found');
    }

    const formData = instance.formData || {};
    const parallelApprovals = {
      [nodeId]: {
        nodeId,
        requiredApprovers,
        approvals: [],
        status: 'PENDING' as 'PENDING' | 'ALL_APPROVED' | 'REJECTED',
      },
    };

    const updated = await this.prisma.workflowInstance.update({
      where: { id },
      data: {
        formData: JSON.stringify({ ...formData, parallelApprovals }),
      },
    });

    return this.parseInstanceFields(updated);
  }

  async approveParallel(id: string, nodeId: string, approverId: string) {
    const instance = await this.getInstanceById(id);
    if (!instance) {
      throw new Error('Instance not found');
    }

    const workflow = await this.findById(instance.workflowId);
    if (!workflow) {
      throw new Error('Workflow not found');
    }

    const formData = instance.formData || {};
    const allParallelApprovals = formData.parallelApprovals || {};
    const nodeApproval = allParallelApprovals[nodeId];

    if (!nodeApproval) {
      throw new Error('Parallel approval not initialized for this node');
    }

    // Add approver if not already in approvals
    if (!nodeApproval.approvals.includes(approverId)) {
      nodeApproval.approvals.push(approverId);
    }

    // Check if all required approvers have approved
    const allApproved = nodeApproval.requiredApprovers.every(
      (a: string) => nodeApproval.approvals.includes(a)
    );

    if (allApproved) {
      nodeApproval.status = 'ALL_APPROVED';

      // Find next node after parallel (skip join node if present)
      const currentIdx = workflow.nodes.findIndex((n: any) => n.id === nodeId);
      const nextNodeIdx = currentIdx + 1;
      const nextNode = workflow.nodes[nextNodeIdx];

      let nextNodeId = nextNode?.id;
      let newStatus = instance.status;

      if (nextNode?.type === 'end') {
        newStatus = 'COMPLETED';
      }

      // Parse history
      let existingHistory: any[] = [];
      if (typeof instance.history === 'string') {
        try { existingHistory = JSON.parse(instance.history); } catch { existingHistory = []; }
      } else if (Array.isArray(instance.history)) {
        existingHistory = instance.history;
      }

      const historyEntry = {
        nodeId,
        action: `Parallel approved: all ${nodeApproval.approvals.length} approvers approved`,
        timestamp: new Date(),
      };

      const updated = await this.prisma.workflowInstance.update({
        where: { id },
        data: {
          currentNodeId: nextNodeId,
          status: newStatus,
          formData: JSON.stringify({ ...formData, parallelApprovals: allParallelApprovals }),
          history: JSON.stringify([...existingHistory, historyEntry]),
        },
      });

      return { instance: this.parseInstanceFields(updated), allApproved: true };
    }

    // Not all approved yet - just update approvals
    const updated = await this.prisma.workflowInstance.update({
      where: { id },
      data: {
        formData: JSON.stringify({ ...formData, parallelApprovals: allParallelApprovals }),
      },
    });

    return { instance: this.parseInstanceFields(updated), allApproved: false };
  }

  async rejectParallel(id: string, nodeId: string, approverId: string) {
    const instance = await this.getInstanceById(id);
    if (!instance) {
      throw new Error('Instance not found');
    }

    const formData = instance.formData || {};
    const allParallelApprovals = formData.parallelApprovals || {};
    const nodeApproval = allParallelApprovals[nodeId];

    if (!nodeApproval) {
      throw new Error('Parallel approval not initialized for this node');
    }

    nodeApproval.status = 'REJECTED';

    // Parse history
    let existingHistory: any[] = [];
    if (typeof instance.history === 'string') {
      try { existingHistory = JSON.parse(instance.history); } catch { existingHistory = []; }
    } else if (Array.isArray(instance.history)) {
      existingHistory = instance.history;
    }

    const historyEntry = {
      nodeId,
      action: `Parallel rejected by approver: ${approverId}`,
      timestamp: new Date(),
    };

    const updated = await this.prisma.workflowInstance.update({
      where: { id },
      data: {
        status: 'COMPLETED', // Mark as completed (rejected flow ends workflow)
        formData: JSON.stringify({ ...formData, parallelApprovals: allParallelApprovals }),
        history: JSON.stringify([...existingHistory, historyEntry]),
      },
    });

    return { instance: this.parseInstanceFields(updated), rejected: true };
  }
}
