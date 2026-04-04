import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';

@Injectable({ providedIn: 'root' })
export class NotificationService {
  constructor(private api: ApiService) {}

  getForUser(userId: string): Observable<any[]> {
    return this.api.get<any[]>(`/notifications?userId=${userId}`);
  }

  getUnreadCount(userId: string): Observable<{ count: number }> {
    return this.api.get<{ count: number }>(`/notifications/unread-count?userId=${userId}`);
  }

  markAsRead(id: string): Observable<void> {
    return this.api.put<void>(`/notifications/${id}/read`, {});
  }

  markAllAsRead(userId: string): Observable<void> {
    return this.api.put<void>('/notifications/read-all', { userId });
  }

  delete(id: string): Observable<void> {
    return this.api.delete<void>(`/notifications/${id}`);
  }
}
