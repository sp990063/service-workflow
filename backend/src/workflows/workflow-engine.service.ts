/**
 * Workflow Execution Engine Service
 * 
 * Handles workflow execution logic including:
 * - Sequential node execution
 * - Parallel node execution (AND/OR)
 * - Condition evaluation
 * - Sub-workflow invocation
 * - Join node handling
 */

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { ConditionEvaluatorService } from './condition-evaluator.service';
import { ConditionConfig } from './interfaces/condition-config.interface';

export interface WorkflowNode {
  id: string;
  type: string;
  data: Record<string, any>;
}

export interface ExecutionResult {
  success: boolean;
  nextNodeId: string | null;
  actionRequired?: {
    type: 'approval' | 'form_fill' | 'subworkflow';
    nodeId: string;
    message: string;
  };
  parallelBranches?: string[];
  error?: string;
}

export interface HistoryEntry {
  nodeId: string;
  nodeType: string;
  action: 'started' | 'completed' | 'approved' | 'rejected' | 'skipped';
  timestamp: string;
  userId?: string;
  comment?: string;
  data?: Record<string, any>;
}

@Injectable()
export class WorkflowEngineService {
  constructor(private prisma: PrismaService) {}

  /**
   * Parse JSON fields in workflow data
   */
  private parseJsonFields(workflow: any) {
    if (!workflow) return workflow;
    return {
      ...workflow,
      nodes: typeof workflow.nodes === 'string' ? JSON.parse(workflow.nodes) : workflow.nodes,
      connections: typeof workflow.connections === 'string' ? JSON.parse(workflow.connections) : workflow.connections,
    };
  }

  /**
   * Parse instance fields
   */
  private parseInstanceFields(instance: any) {
    if (!instance) return instance;
    return {
      ...instance,
      formData: typeof instance.formData === 'string' ? JSON.parse(instance.formData) : instance.formData,
      history: typeof instance.history === 'string' ? JSON.parse(instance.history) : instance.history,
    };
  }

  /**
   * Get workflow by ID
   */
  async getWorkflow(workflowId: string) {
    const workflow = await this.prisma.workflow.findUnique({ where: { id: workflowId } });
    return this.parseJsonFields(workflow);
  }

  /**
   * Get workflow by name
   */
  async getWorkflowByName(workflowName: string) {
    const workflow = await this.prisma.workflow.findFirst({ where: { name: workflowName, isActive: true } });
    return this.parseJsonFields(workflow);
  }

  /**
   * Get instance by ID
   */
  async getInstance(instanceId: string) {
    const instance = await this.prisma.workflowInstance.findUnique({ where: { id: instanceId } });
    return this.parseInstanceFields(instance);
  }

  /**
   * Evaluate a condition node
   * Supports both new ConditionConfig format and legacy format
   */
  evaluateCondition(node: WorkflowNode, formData: Record<string, any>): boolean {
    if (node.type !== 'condition') {
      return true;
    }

    // New ConditionConfig format
    if (node.data?.conditionConfig) {
      const evaluator = new ConditionEvaluatorService();
      return evaluator.evaluate(node.data.conditionConfig as ConditionConfig, formData);
    }

    // Legacy format support
    if (!node.data?.conditions) {
      return true; // No conditions means proceed
    }

    const conditions = node.data.conditions;
    const operator = node.data.operator || 'AND';

    const results = conditions.map((cond: any) => {
      const fieldValue = formData[cond.field];
      const compareValue = cond.value;

      switch (cond.operator) {
        case 'equals':
          return fieldValue == compareValue;
        case 'not_equals':
          return fieldValue != compareValue;
        case 'contains':
          return String(fieldValue).includes(String(compareValue));
        case 'greater_than':
          return Number(fieldValue) > Number(compareValue);
        case 'less_than':
          return Number(fieldValue) < Number(compareValue);
        case 'greater_than_or_equals':
          return Number(fieldValue) >= Number(compareValue);
        case 'less_than_or_equals':
          return Number(fieldValue) <= Number(compareValue);
        case 'is_empty':
          return fieldValue === null || fieldValue === undefined || fieldValue === '';
        case 'is_not_empty':
          return fieldValue !== null && fieldValue !== undefined && fieldValue !== '';
        default:
          return true;
      }
    });

    if (operator === 'AND') {
      return results.every(r => r === true);
    } else {
      return results.some(r => r === true);
    }
  }

  /**
   * Get next node based on connections
   */
  getNextNode(currentNodeId: string, connections: any[], formData?: Record<string, any>, currentNode?: WorkflowNode): string | null {
    const outgoingConnections = connections.filter(c => c.sourceNodeId === currentNodeId);

    if (outgoingConnections.length === 0) {
      return null;
    }

    // If it's a condition node, evaluate and pick the right branch
    if (currentNode?.type === 'condition') {
      const conditionMet = this.evaluateCondition(currentNode, formData || {});

      const trueBranch = outgoingConnections.find(c => c.sourceHandle === 'true');
      const falseBranch = outgoingConnections.find(c => c.sourceHandle === 'false');

      if (conditionMet && trueBranch) {
        return trueBranch.targetNodeId;
      } else if (!conditionMet && falseBranch) {
        return falseBranch.targetNodeId;
      }
      return null;
    }

    // Default: return first connection's target
    return outgoingConnections[0].targetNodeId;
  }

  /**
   * Execute the current node and advance
   */
  async executeCurrentNode(instanceId: string): Promise<ExecutionResult> {
    const instance = await this.getInstance(instanceId);
    if (!instance) {
      return { success: false, nextNodeId: null, error: 'Instance not found' };
    }

    const workflow = await this.getWorkflow(instance.workflowId);
    if (!workflow) {
      return { success: false, nextNodeId: null, error: 'Workflow not found' };
    }

    const currentNode = workflow.nodes.find((n: any) => n.id === instance.currentNodeId);
    if (!currentNode) {
      return { success: false, nextNodeId: null, error: 'Current node not found' };
    }

    const connections = workflow.connections;
    const formData = instance.formData || {};

    // Handle different node types
    switch (currentNode.type) {
      case 'start':
        // Just advance to next node
        break;

      case 'end':
        // Complete the workflow
        await this.completeInstance(instanceId, currentNode);
        return { success: true, nextNodeId: null };

      case 'form':
        // Form nodes require user input - wait
        return {
          success: true,
          nextNodeId: instance.currentNodeId,
          actionRequired: {
            type: 'form_fill',
            nodeId: currentNode.id,
            message: `Please fill in the form: ${currentNode.data?.label || 'Form'}`,
          },
        };

      case 'approval':
        // Approval nodes require approver decision
        return {
          success: true,
          nextNodeId: instance.currentNodeId,
          actionRequired: {
            type: 'approval',
            nodeId: currentNode.id,
            message: `Approval required: ${currentNode.data?.label || 'Approval'}`,
          },
        };

      case 'task':
        // Tasks are auto-advanced after marking complete
        break;

      case 'condition':
        // Evaluate and branch
        const conditionMet = this.evaluateCondition(currentNode, formData);
        const nextNodeId = this.getNextNode(currentNode.id, connections, formData, currentNode);
        
        await this.addHistory(instanceId, {
          nodeId: currentNode.id,
          nodeType: 'condition',
          action: 'completed',
          timestamp: new Date().toISOString(),
          data: { conditionMet, chosenBranch: nextNodeId },
        });

        if (!nextNodeId) {
          await this.completeInstance(instanceId, currentNode);
          return { success: true, nextNodeId: null };
        }

        await this.advanceTo(instanceId, nextNodeId);
        return { success: true, nextNodeId };

      case 'parallel':
        // Parallel nodes fork into branches
        const parallelResult = await this.executeParallelNode(instance, currentNode, workflow);
        return parallelResult;

      case 'join':
        // Join nodes wait for parallel branches to complete
        const joinResult = await this.executeJoinNode(instance, currentNode);
        return joinResult;

      case 'sub-workflow':
        // Sub-workflow nodes create child instances
        const subResult = await this.executeSubWorkflow(instance, currentNode);
        return subResult;

      default:
        // Unknown node type - just try to advance
        break;
    }

    // Advance to next node
    const nextNodeId = this.getNextNode(currentNode.id, connections, formData, currentNode);
    
    if (!nextNodeId) {
      await this.completeInstance(instanceId, currentNode);
      return { success: true, nextNodeId: null };
    }

    await this.advanceTo(instanceId, nextNodeId);
    return { success: true, nextNodeId };
  }

  /**
   * Execute a parallel node
   */
  async executeParallelNode(instance: any, node: WorkflowNode, workflow: any): Promise<ExecutionResult> {
    const branches = node.data?.branches || [];
    const joinType = node.data?.joinType || 'AND';

    // Find the join node (should come after parallel)
    const connections = workflow.connections;
    const parallelOutConnections = connections.filter((c: any) => c.sourceNodeId === node.id);
    
    if (parallelOutConnections.length === 0) {
      return { success: false, nextNodeId: null, error: 'Parallel node has no outgoing connections' };
    }

    // Store parallel execution state
    await this.addHistory(instance.id, {
      nodeId: node.id,
      nodeType: 'parallel',
      action: 'started',
      timestamp: new Date().toISOString(),
      data: { branches, joinType, branchCount: branches.length },
    });

    // For AND join, we need to track all branches
    // For OR join, we just proceed after first branch
    if (joinType === 'OR') {
      const firstBranch = parallelOutConnections[0]?.targetNodeId;
      if (firstBranch) {
        await this.advanceTo(instance.id, firstBranch);
        return { success: true, nextNodeId: firstBranch, parallelBranches: branches };
      }
    }

    // For AND join, we proceed to the join node
    const joinNodeId = parallelOutConnections[0]?.targetNodeId;
    if (joinNodeId) {
      // Mark that we're waiting for parallel completion
      await this.addHistory(instance.id, {
        nodeId: node.id,
        nodeType: 'parallel',
        action: 'completed',
        timestamp: new Date().toISOString(),
        data: { allBranchesStarted: true },
      });

      await this.advanceTo(instance.id, joinNodeId);
      return { success: true, nextNodeId: joinNodeId, parallelBranches: branches };
    }

    return { success: false, nextNodeId: null, error: 'Parallel node has no valid target' };
  }

  /**
   * Execute a join node
   */
  async executeJoinNode(instance: any, node: WorkflowNode): Promise<ExecutionResult> {
    const joinType = node.data?.joinType || 'AND';

    // Get parallel status from instance metadata or history
    const history = instance.history || [];
    const parallelStartEntry = history.filter((h: any) => 
      h.nodeType === 'parallel' && h.action === 'started'
    ).pop();

    if (joinType === 'OR') {
      // OR join: just proceed immediately
      const nextNodeId = this.getNextNode(node.id, instance.workflow?.connections || []);
      
      await this.addHistory(instance.id, {
        nodeId: node.id,
        nodeType: 'join',
        action: 'completed',
        timestamp: new Date().toISOString(),
        data: { joinType: 'OR' },
      });

      if (!nextNodeId) {
        await this.completeInstance(instance.id, node);
        return { success: true, nextNodeId: null };
      }

      await this.advanceTo(instance.id, nextNodeId);
      return { success: true, nextNodeId };
    }

    // AND join: check if all parallel branches are done
    // This is simplified - in real implementation, we'd track branch statuses
    const nextNodeId = this.getNextNode(node.id, instance.workflow?.connections || []);
    
    await this.addHistory(instance.id, {
      nodeId: node.id,
      nodeType: 'join',
      action: 'completed',
      timestamp: new Date().toISOString(),
      data: { joinType: 'AND', allBranchesJoined: true },
    });

    if (!nextNodeId) {
      await this.completeInstance(instance.id, node);
      return { success: true, nextNodeId: null };
    }

    await this.advanceTo(instance.id, nextNodeId);
    return { success: true, nextNodeId };
  }

  /**
   * Execute a sub-workflow node
   */
  async executeSubWorkflow(instance: any, node: WorkflowNode): Promise<ExecutionResult> {
    const subWorkflowId = node.data?.subWorkflowId;
    const subWorkflowName = node.data?.subWorkflowName;
    const inputMapping = node.data?.inputMapping || {};
    const waitForCompletion = node.data?.waitForCompletion !== false;

    // Resolve sub-workflow: use ID directly or look up by name
    let subWorkflow;
    let resolvedSubWorkflowId = subWorkflowId;

    if (subWorkflowId) {
      subWorkflow = await this.getWorkflow(subWorkflowId);
    } else if (subWorkflowName) {
      subWorkflow = await this.getWorkflowByName(subWorkflowName);
      if (subWorkflow) {
        resolvedSubWorkflowId = subWorkflow.id;
      }
    }

    if (!subWorkflow) {
      return { success: false, nextNodeId: null, error: subWorkflowId ? 'Sub-workflow not found' : 'Sub-workflow not found (by ID or name)' };
    }

    // Create input data from parent instance
    const parentData = instance.formData || {};
    const childInputData: Record<string, any> = {};
    
    for (const [childField, parentField] of Object.entries(inputMapping)) {
      childInputData[childField] = parentData[parentField as string];
    }

    const startNode = subWorkflow.nodes.find((n: any) => n.type === 'start');

    const childInstance = await this.prisma.workflowInstance.create({
      data: {
        workflowId: resolvedSubWorkflowId,
        userId: instance.userId,
        currentNodeId: startNode?.id || null,
        status: waitForCompletion ? 'WAITING_FOR_CHILD' : 'IN_PROGRESS',
        formData: JSON.stringify(childInputData),
        history: JSON.stringify([{
          nodeId: startNode?.id,
          nodeType: 'start',
          action: 'started',
          timestamp: new Date().toISOString(),
          data: { source: 'sub-workflow', parentInstanceId: instance.id },
        }]),
        parentInstanceId: instance.id,
      },
    });

    // Record in parent history
    await this.addHistory(instance.id, {
      nodeId: node.id,
      nodeType: 'sub-workflow',
      action: 'started',
      timestamp: new Date().toISOString(),
      data: { 
        childInstanceId: childInstance.id,
        subWorkflowName: subWorkflow.name,
        waitForCompletion,
      },
    });

    if (!waitForCompletion) {
      // Just advance to next node in parent
      const nextNodeId = this.getNextNode(node.id, instance.workflow?.connections || []);
      
      if (!nextNodeId) {
        await this.completeInstance(instance.id, node);
        return { success: true, nextNodeId: null };
      }

      await this.advanceTo(instance.id, nextNodeId);
      return { success: true, nextNodeId };
    }

    // Update parent instance to waiting state
    await this.prisma.workflowInstance.update({
      where: { id: instance.id },
      data: { status: 'WAITING_FOR_CHILD' },
    });

    return {
      success: true,
      nextNodeId: node.id,
      actionRequired: {
        type: 'subworkflow',
        nodeId: node.id,
        message: `Sub-workflow "${subWorkflow.name}" started, waiting for completion`,
      },
    };
  }

  /**
   * Advance instance to a new node
   */
  private async advanceTo(instanceId: string, nextNodeId: string) {
    const instance = await this.getInstance(instanceId);
    const workflow = await this.getWorkflow(instance.workflowId);
    const currentNode = workflow.nodes.find((n: any) => n.id === instance.currentNodeId);
    const nextNode = workflow.nodes.find((n: any) => n.id === nextNodeId);

    const historyEntry: HistoryEntry = {
      nodeId: nextNodeId,
      nodeType: nextNode?.type || 'unknown',
      action: 'started',
      timestamp: new Date().toISOString(),
    };

    await this.prisma.workflowInstance.update({
      where: { id: instanceId },
      data: {
        currentNodeId: nextNodeId,
        history: JSON.stringify([...instance.history, historyEntry]),
      },
    });
  }

  /**
   * Add history entry
   */
  private async addHistory(instanceId: string, entry: HistoryEntry) {
    const instance = await this.getInstance(instanceId);
    await this.prisma.workflowInstance.update({
      where: { id: instanceId },
      data: {
        history: JSON.stringify([...instance.history, entry]),
      },
    });
  }

  /**
   * Complete an instance
   */
  private async completeInstance(instanceId: string, node: WorkflowNode) {
    await this.prisma.workflowInstance.update({
      where: { id: instanceId },
      data: {
        status: 'COMPLETED',
        currentNodeId: null,
      },
    });
  }

  /**
   * Start a new workflow instance
   */
  async startInstance(workflowId: string, userId: string, initialData?: Record<string, any>): Promise<any> {
    const workflow = await this.getWorkflow(workflowId);
    if (!workflow) {
      throw new Error('Workflow not found');
    }

    const startNode = workflow.nodes.find((n: any) => n.type === 'start');
    
    const instance = await this.prisma.workflowInstance.create({
      data: {
        workflowId,
        userId,
        currentNodeId: startNode?.id || null,
        status: 'IN_PROGRESS',
        formData: JSON.stringify(initialData || {}),
        history: JSON.stringify([{
          nodeId: startNode?.id,
          nodeType: 'start',
          action: 'started',
          timestamp: new Date().toISOString(),
          data: { workflowName: workflow.name },
        }]),
      },
    });

    // Auto-advance from start node
    if (startNode) {
      const result = await this.executeCurrentNode(instance.id);
      return { ...instance, executionResult: result };
    }

    return instance;
  }

  /**
   * Submit approval decision
   */
  async submitApproval(
    instanceId: string,
    approverId: string,
    decision: 'approve' | 'reject',
    comment?: string
  ): Promise<ExecutionResult> {
    const instance = await this.getInstance(instanceId);
    if (!instance) {
      return { success: false, nextNodeId: null, error: 'Instance not found' };
    }

    const workflow = await this.getWorkflow(instance.workflowId);
    const currentNode = workflow.nodes.find((n: any) => n.id === instance.currentNodeId);

    if (currentNode?.type !== 'approval') {
      return { success: false, nextNodeId: null, error: 'Current node is not an approval node' };
    }

    // Add approval to history
    await this.addHistory(instanceId, {
      nodeId: currentNode.id,
      nodeType: 'approval',
      action: decision === 'approve' ? 'approved' : 'rejected',
      timestamp: new Date().toISOString(),
      userId: approverId,
      comment,
    });

    if (decision === 'reject') {
      // Rejection ends the workflow
      await this.prisma.workflowInstance.update({
        where: { id: instanceId },
        data: { status: 'REJECTED' },
      });
      return { success: true, nextNodeId: null };
    }

    // Approved - advance to next node
    const nextNodeId = this.getNextNode(currentNode.id, workflow.connections, instance.formData, currentNode);
    
    if (!nextNodeId) {
      await this.completeInstance(instanceId, currentNode);
      return { success: true, nextNodeId: null };
    }

    await this.advanceTo(instanceId, nextNodeId);
    return { success: true, nextNodeId };
  }

  /**
   * Submit form data
   */
  async submitFormData(instanceId: string, formData: Record<string, any>): Promise<ExecutionResult> {
    const instance = await this.getInstance(instanceId);
    if (!instance) {
      return { success: false, nextNodeId: null, error: 'Instance not found' };
    }

    const workflow = await this.getWorkflow(instance.workflowId);
    const currentNode = workflow.nodes.find((n: any) => n.id === instance.currentNodeId);

    if (currentNode?.type !== 'form') {
      return { success: false, nextNodeId: null, error: 'Current node is not a form node' };
    }

    // Merge form data
    const updatedFormData = { ...instance.formData, ...formData };
    
    await this.prisma.workflowInstance.update({
      where: { id: instanceId },
      data: { formData: JSON.stringify(updatedFormData) },
    });

    // Add to history
    await this.addHistory(instanceId, {
      nodeId: currentNode.id,
      nodeType: 'form',
      action: 'completed',
      timestamp: new Date().toISOString(),
      data: { fieldsSubmitted: Object.keys(formData) },
    });

    // Advance to next node
    const nextNodeId = this.getNextNode(currentNode.id, workflow.connections, updatedFormData, currentNode);
    
    if (!nextNodeId) {
      await this.completeInstance(instanceId, currentNode);
      return { success: true, nextNodeId: null };
    }

    await this.advanceTo(instanceId, nextNodeId);
    return { success: true, nextNodeId };
  }

  /**
   * Get available actions for an instance
   */
  async getAvailableActions(instanceId: string): Promise<any[]> {
    const instance = await this.getInstance(instanceId);
    if (!instance) return [];

    if (instance.status === 'COMPLETED' || instance.status === 'REJECTED') {
      return [];
    }

    const workflow = await this.getWorkflow(instance.workflowId);
    const currentNode = workflow.nodes.find((n: any) => n.id === instance.currentNodeId);

    if (!currentNode) return [];

    const actions = [];

    switch (currentNode.type) {
      case 'approval':
        actions.push({ action: 'approve', label: 'Approve' });
        actions.push({ action: 'reject', label: 'Reject' });
        break;
      case 'form':
        actions.push({ action: 'submit_form', label: 'Submit Form' });
        break;
      case 'task':
        actions.push({ action: 'complete_task', label: 'Complete Task' });
        break;
    }

    return actions;
  }
}
