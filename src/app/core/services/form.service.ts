import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { Form } from '../models';

@Injectable({ providedIn: 'root' })
export class FormService {
  constructor(private api: ApiService) {}

  getAll(): Observable<Form[]> {
    return this.api.get<Form[]>('/forms');
  }

  getById(id: string): Observable<Form> {
    return this.api.get<Form>(`/forms/${id}`);
  }

  create(data: { name: string; description?: string; elements: any[] }): Observable<Form> {
    return this.api.post<Form>('/forms', data);
  }

  update(id: string, data: { name?: string; description?: string; elements?: any[] }): Observable<Form> {
    return this.api.put<Form>(`/forms/${id}`, data);
  }

  delete(id: string): Observable<void> {
    return this.api.delete<void>(`/forms/${id}`);
  }

  submit(formId: string, userId: string, formData: Record<string, any>): Observable<any> {
    return this.api.post<any>(`/forms/${formId}/submit`, { userId, data: formData });
  }

  getSubmissions(formId: string): Observable<any[]> {
    return this.api.get<any[]>(`/forms/${formId}/submissions`);
  }

  getSubmission(id: string): Observable<any> {
    return this.api.get<any>(`/form-submissions/${id}`);
  }

  updateSubmissionStatus(id: string, status: 'PENDING' | 'APPROVED' | 'REJECTED'): Observable<any> {
    return this.api.put<any>(`/form-submissions/${id}/status`, { status });
  }
}
