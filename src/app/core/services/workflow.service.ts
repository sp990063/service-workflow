import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { ApiService } from './api.service';
import { Workflow } from '../models';

@Injectable({ providedIn: 'root' })
export class WorkflowService {
  constructor(private api: ApiService) {}

  getAll(): Observable<Workflow[]> {
    return this.api.get<Workflow[]>('/workflows');
  }

  getById(id: string): Observable<Workflow> {
    return this.api.get<Workflow>(`/workflows/${id}`);
  }

  create(data: { name: string; description?: string; nodes: any[]; connections: any[] }): Observable<Workflow> {
    return this.api.post<Workflow>('/workflows', data);
  }

  update(id: string, data: { name?: string; nodes?: any[]; connections?: any[] }): Observable<Workflow> {
    return this.api.put<Workflow>(`/workflows/${id}`, data);
  }

  delete(id: string): Observable<void> {
    return this.api.delete<void>(`/workflows/${id}`);
  }

  startInstance(workflowId: string, userId: string): Observable<any> {
    return this.api.post<any>(`/workflows/${workflowId}/start`, { userId });
  }

  getInstances(workflowId: string): Observable<any[]> {
    return this.api.get<any[]>(`/workflows/${workflowId}/instances`);
  }

  getAllInstances(): Observable<any[]> {
    return this.api.get<any[]>('/workflow-instances');
  }

  getInstance(id: string): Observable<any> {
    return this.api.get<any>(`/workflow-instances/${id}`);
  }

  updateInstance(id: string, data: { formData?: Record<string, any> }): Observable<any> {
    return this.api.put<any>(`/workflow-instances/${id}`, data);
  }

  advanceInstance(id: string, nextNodeId: string, addToHistory: any[]): Observable<any> {
    return this.api.post<any>(`/workflow-instances/${id}/advance`, { nextNodeId, addToHistory });
  }

  completeInstance(id: string): Observable<any> {
    return this.api.post<any>(`/workflow-instances/${id}/complete`, {});
  }

  rejectInstance(id: string): Observable<any> {
    return this.api.post<any>(`/workflow-instances/${id}/reject`, {});
  }

  createChildInstance(id: string, childWorkflowId: string, userId: string, formData: any): Observable<any> {
    return this.api.post<any>(`/workflow-instances/${id}/child`, { childWorkflowId, userId, formData });
  }

  getChildInstances(id: string): Observable<any[]> {
    return this.api.get<any[]>(`/workflow-instances/${id}/children`);
  }

  initParallelApproval(id: string, nodeId: string, requiredApprovers: string[]): Observable<any> {
    return this.api.post<any>(`/workflow-instances/${id}/parallel-init`, { nodeId, requiredApprovers });
  }

  approveParallel(id: string, nodeId: string, approverId: string): Observable<{ instance: any; allApproved: boolean }> {
    return this.api.post<{ instance: any; allApproved: boolean }>(`/workflow-instances/${id}/parallel-approve`, { nodeId, approverId });
  }

  rejectParallel(id: string, nodeId: string, approverId: string): Observable<{ instance: any; rejected: boolean }> {
    return this.api.post<{ instance: any; rejected: boolean }>(`/workflow-instances/${id}/parallel-reject`, { nodeId, approverId });
  }

  /**
   * Get step status from workflow instance history
   * Returns: COMPLETED, IN_PROGRESS, or PENDING
   */
  getStepStatus(instance: any, workflow: any, nodeId: string): 'COMPLETED' | 'IN_PROGRESS' | 'PENDING' {
    // If current node, it's IN_PROGRESS
    if (instance.currentNodeId === nodeId) {
      return 'IN_PROGRESS';
    }

    // If in history, it's COMPLETED
    if (instance.history.some((h: any) => h.nodeId === nodeId)) {
      return 'COMPLETED';
    }

    // For nodes before current (based on order)
    const currentIdx = workflow.nodes.findIndex((n: any) => n.id === instance.currentNodeId);
    const nodeIdx = workflow.nodes.findIndex((n: any) => n.id === nodeId);

    if (nodeIdx < currentIdx && currentIdx >= 0) {
      return 'COMPLETED';
    }

    return 'PENDING';
  }
  
  getInstanceComments(instanceId: string): Observable<any[]> {
    return this.api.get<any[]>(`/instances/${instanceId}/thread`);
  }
  
  addInstanceComment(instanceId: string, comment: { content: string; authorId: string; parentCommentId?: string | null }): Observable<any> {
    return this.api.post<any>(`/instances/${instanceId}/thread`, comment);
  }
  
  getMyPending(): Observable<any[]> {
    return this.api.get<any[]>('/workflow-instances/my-pending');
  }
  
  getMySubmitted(): Observable<any[]> {
    return this.api.get<any[]>('/workflow-instances/my-submitted');
  }
}
