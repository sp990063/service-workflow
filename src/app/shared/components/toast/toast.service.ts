import { Injectable, signal } from '@angular/core';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastAction {
  label: string;
  handler: () => void;
}

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
  actions?: ToastAction[];
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  private toasts = signal<Toast[]>([]);

  getToasts() {
    return this.toasts;
  }

  show(message: string, type: ToastType = 'info', actions?: ToastAction[], duration = 5000) {
    const id = crypto.randomUUID();
    this.toasts.update(t => [...t, { id, message, type, actions }]);

    if (duration > 0) {
      setTimeout(() => this.dismiss(id), duration);
    }

    return id;
  }

  success(message: string, actions?: ToastAction[]) {
    return this.show(message, 'success', actions);
  }

  error(message: string, actions?: ToastAction[]) {
    return this.show(message, 'error', actions, 8000);
  }

  warning(message: string, actions?: ToastAction[]) {
    return this.show(message, 'warning', actions);
  }

  info(message: string, actions?: ToastAction[]) {
    return this.show(message, 'info', actions);
  }

  dismiss(id: string) {
    this.toasts.update(t => t.filter(toast => toast.id !== id));
  }

  dismissAll() {
    this.toasts.set([]);
  }
}
