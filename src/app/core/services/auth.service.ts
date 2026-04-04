import { Injectable, signal, computed } from '@angular/core';
import { Router } from '@angular/router';
import { ApiService } from './api.service';
import { StorageService } from './storage.service';
import { User } from '../models';

interface LoginResponse {
  access_token: string;
  user: User;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private currentUser = signal<User | null>(null);

  readonly isAuthenticated = computed(() => this.currentUser() !== null);
  readonly user = computed(() => this.currentUser());

  constructor(
    private api: ApiService,
    private storage: StorageService,
    private router: Router
  ) {
    // Restore session from stored token
    const token = this.storage.get<string>('token');
    const savedUser = this.storage.get<User>('user');
    if (token && savedUser) {
      this.api.setToken(token);
      this.currentUser.set(savedUser);
    }
  }

  async login(email: string, password: string): Promise<boolean> {
    try {
      const response = await new Promise<LoginResponse>((resolve, reject) => {
        this.api.post<LoginResponse>('/auth/login', { email, password })
          .subscribe({
            next: resolve,
            error: reject
          });
      });

      this.api.setToken(response.access_token);
      this.storage.set('token', response.access_token);
      this.storage.set('user', response.user);
      this.currentUser.set(response.user);
      return true;
    } catch {
      return false;
    }
  }

  logout(): void {
    this.api.setToken(null);
    this.storage.remove('token');
    this.currentUser.set(null);
    this.storage.remove('user');
    this.router.navigate(['/login']);
  }
}
