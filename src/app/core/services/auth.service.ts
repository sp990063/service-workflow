import { Injectable, signal, computed } from '@angular/core';
import { Router } from '@angular/router';
import { StorageService } from './storage.service';
import { User } from '../models';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private currentUser = signal<User | null>(null);
  
  readonly isAuthenticated = computed(() => this.currentUser() !== null);
  readonly user = computed(() => this.currentUser());

  constructor(
    private storage: StorageService,
    private router: Router
  ) {
    const saved = this.storage.get<User>('user');
    if (saved) this.currentUser.set(saved);
  }

  login(email: string, password: string): boolean {
    if (email && password.length >= 4) {
      const user: User = {
        id: crypto.randomUUID(),
        email,
        name: email.split('@')[0],
        role: email.includes('admin') ? 'admin' : 'user'
      };
      this.currentUser.set(user);
      this.storage.set('user', user);
      return true;
    }
    return false;
  }

  logout(): void {
    this.currentUser.set(null);
    this.storage.remove('user');
    this.router.navigate(['/login']);
  }
}
