import { Injectable, Logger } from '@nestjs/common';
import { WorkflowDefinition } from './interfaces';
import { ConditionEvaluatorService } from './condition-evaluator.service';

export interface SimulationStep {
  stepNumber: number;
  timestamp: string;
  nodeId: string;
  nodeLabel: string;
  nodeType: string;
  action: 'entered' | 'paused' | 'completed' | 'branched' | 'joined' | 'decided';
  inputData: Record<string, any>;
  outputData?: Record<string, any>;
  decision?: { condition: string; result: boolean };
  parallelBranches?: string[];
  logMessages: string[];
}

export interface SimulationResult {
  completed: boolean;
  finalData: Record<string, any>;
  finalStatus: 'completed' | 'rejected' | 'cancelled' | 'deadlocked';
  steps: SimulationStep[];
  notificationsSent: string[];
  errors: string[];
}

@Injectable()
export class SimulationEngineService {
  private readonly logger = new Logger(SimulationEngineService.name);

  constructor(private readonly conditionEvaluator: ConditionEvaluatorService) {}

  async simulate(
    definition: WorkflowDefinition,
    initialData: Record<string, any>,
    options?: { maxSteps?: number; breakOnNodeIds?: string[] },
  ): Promise<SimulationResult> {
    const steps: SimulationStep[] = [];
    const notificationsSent: string[] = [];
    const errors: string[] = [];
    let currentData = { ...initialData };
    let stepNumber = 0;
    const maxSteps = options?.maxSteps ?? 200;
    const breakOnNodeIds = new Set(options?.breakOnNodeIds ?? []);

    const startNode = definition.nodes.find(n => n.type === 'start');
    if (!startNode) {
      return { completed: false, finalData: currentData, finalStatus: 'deadlocked', steps, notificationsSent, errors: ['No Start node found'] };
    }

    const firstConnection = definition.connections.find(c => c.sourceNodeId === startNode.id);
    if (!firstConnection) {
      return { completed: false, finalData: currentData, finalStatus: 'deadlocked', steps, notificationsSent, errors: ['Start node has no outgoing connection'] };
    }

    let currentNodeId = firstConnection.targetNodeId;

    while (stepNumber < maxSteps) {
      stepNumber++;
      const node = definition.nodes.find(n => n.id === currentNodeId);
      if (!node) {
        errors.push(`Node not found: ${currentNodeId}`);
        break;
      }

      const step: SimulationStep = {
        stepNumber,
        timestamp: new Date().toISOString(),
        nodeId: node.id,
        nodeLabel: node.label,
        nodeType: node.type,
        action: 'entered',
        inputData: { ...currentData },
        logMessages: [],
      };

      if (breakOnNodeIds.has(node.id)) {
        step.action = 'paused';
        steps.push(step);
        return {
          completed: false,
          finalData: currentData,
          finalStatus: 'cancelled',
          steps,
          notificationsSent,
          errors: [`Simulation paused at breakpoint: ${node.label}`],
        };
      }

      try {
        switch (node.type) {
          case 'end':
            step.action = 'completed';
            step.outputData = currentData;
            steps.push(step);
            return {
              completed: true,
              finalData: currentData,
              finalStatus: 'completed',
              steps,
              notificationsSent,
              errors: [],
            };

          case 'form':
          case 'task':
          case 'approval':
            step.action = 'paused';
            step.logMessages.push(`[SIMULATE] ${node.type} node "${node.label}" — would pause for user action`);
            step.logMessages.push(`[SIMULATE] Auto-advancing with current data for simulation`);
            currentNodeId = this.getNextNodeId(node.id, definition, currentData);
            break;

          case 'condition': {
            step.action = 'decided';
            const config = node.config;
            if (config?.conditionConfig) {
              const result = this.conditionEvaluator.evaluate(config.conditionConfig, currentData);
              const branch = result ? 'true' : 'false';
              step.decision = { condition: JSON.stringify(config.conditionConfig), result };
              step.logMessages.push(`[SIMULATE] Condition evaluated to ${result}`);
              const conn = definition.connections.find(c => c.sourceNodeId === node.id && c.sourceHandle === branch);
              currentNodeId = conn?.targetNodeId ?? '';
              step.outputData = { ...currentData, _conditionResult: result };
            } else {
              errors.push(`Condition node "${node.label}" has no conditionConfig`);
              currentNodeId = '';
            }
            break;
          }

          case 'parallel': {
            step.action = 'branched';
            const branches = (node.config?.branches as string[]) ?? [];
            step.parallelBranches = branches;
            step.logMessages.push(`[SIMULATE] Parallel node — spawning ${branches.length} branches`);
            currentNodeId = branches[0] ?? '';
            break;
          }

          case 'join': {
            step.action = 'joined';
            const joinType = node.config?.joinType ?? 'AND';
            step.logMessages.push(`[SIMULATE] Join node (${joinType}) — waiting for branches`);
            currentNodeId = this.getNextNodeId(node.id, definition, currentData);
            break;
          }

          case 'script': {
            step.action = 'completed';
            const scriptConfig = node.config;
            if (scriptConfig?.script && scriptConfig?.outputField) {
              const result = this.evaluateScript(scriptConfig.script, currentData);
              currentData[scriptConfig.outputField] = result;
              step.outputData = { [scriptConfig.outputField]: result };
              step.logMessages.push(`[SIMULATE] Script set ${scriptConfig.outputField} = ${result}`);
            }
            currentNodeId = this.getNextNodeId(node.id, definition, currentData);
            break;
          }

          case 'setvalue': {
            const setConfig = node.config;
            currentData[setConfig.field] = setConfig.value;
            step.outputData = { [setConfig.field]: setConfig.value };
            step.logMessages.push(`[SIMULATE] Set ${setConfig.field} = ${JSON.stringify(setConfig.value)}`);
            currentNodeId = this.getNextNodeId(node.id, definition, currentData);
            break;
          }

          default:
            currentNodeId = this.getNextNodeId(node.id, definition, currentData);
        }
      } catch (err: any) {
        errors.push(`Error at node "${node.label}": ${err.message}`);
        step.action = 'completed';
        steps.push(step);
        break;
      }

      if (!currentNodeId) {
        errors.push(`No outgoing connection from node "${node.label}"`);
        break;
      }

      steps.push(step);
    }

    return {
      completed: false,
      finalData: currentData,
      finalStatus: errors.length > 0 ? 'cancelled' : 'deadlocked',
      steps,
      notificationsSent,
      errors,
    };
  }

  private evaluateScript(script: string, data: Record<string, any>): any {
    const ALLOWED = /^[0-9+\-*/().<>=!&|%\s\w"']+$/;
    if (!ALLOWED.test(script)) {
      throw new Error(`Script contains disallowed characters: ${script}`);
    }

    const ctx = { ...data, formData: data.formData, workflowData: data.workflowData };
    try {
      const fn = new Function('formData', 'workflowData', `return ${script}`);
      return fn(ctx.formData, ctx.workflowData);
    } catch {
      throw new Error(`Failed to evaluate script: ${script}`);
    }
  }

  private getNextNodeId(nodeId: string, definition: WorkflowDefinition, data: Record<string, any>): string {
    const conns = definition.connections.filter(c => c.sourceNodeId === nodeId);
    if (conns.length === 0) return '';
    return conns[0].targetNodeId;
  }
}