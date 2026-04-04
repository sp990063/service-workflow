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

  advanceInstance(id: string, nextNodeId: string, addToHistory: any[]): Observable<any> {
    return this.api.post<any>(`/workflow-instances/${id}/advance`, { nextNodeId, addToHistory });
  }

  completeInstance(id: string): Observable<any> {
    return this.api.post<any>(`/workflow-instances/${id}/complete`, {});
  }

  createChildInstance(id: string, childWorkflowId: string, userId: string, formData: any): Observable<any> {
    return this.api.post<any>(`/workflow-instances/${id}/child`, { childWorkflowId, userId, formData });
  }

  getChildInstances(id: string): Observable<any[]> {
    return this.api.get<any[]>(`/workflow-instances/${id}/children`);
  }
}
