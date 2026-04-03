import { Component } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from './core/services/auth.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="app-container">
      @if (authService.isAuthenticated()) {
        <aside class="sidebar">
          <div class="logo">ServiceFlow</div>
          <nav>
            <a routerLink="/dashboard" routerLinkActive="active">Dashboard</a>
            <a routerLink="/form-builder" routerLinkActive="active">Form Builder</a>
            <a routerLink="/forms" routerLinkActive="active">Forms</a>
            <a routerLink="/workflow-designer" routerLinkActive="active">Workflows</a>
          </nav>
          <button class="logout-btn" (click)="logout()">Logout</button>
        </aside>
      }
      <main class="main-content">
        <router-outlet></router-outlet>
      </main>
    </div>
  `,
  styles: [`
    .app-container {
      display: flex;
      min-height: 100vh;
    }
    .sidebar {
      width: 240px;
      background: var(--color-surface);
      border-right: 1px solid var(--color-border);
      padding: 1.5rem;
      display: flex;
      flex-direction: column;
    }
    .logo {
      font-size: 1.5rem;
      font-weight: 700;
      color: var(--color-primary);
      margin-bottom: 2rem;
    }
    .sidebar nav {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }
    .sidebar nav a {
      padding: 0.75rem 1rem;
      border-radius: var(--radius-md);
      color: var(--color-text);
      text-decoration: none;
      transition: all var(--transition-fast);
    }
    .sidebar nav a:hover {
      background: var(--color-background);
    }
    .sidebar nav a.active {
      background: var(--color-primary);
      color: white;
    }
    .logout-btn {
      margin-top: auto;
      padding: 0.75rem;
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      background: transparent;
      cursor: pointer;
    }
    .logout-btn:hover {
      background: var(--color-background);
    }
    .main-content {
      flex: 1;
      padding: 2rem;
      overflow-y: auto;
    }
  `]
})
export class AppComponent {
  constructor(public authService: AuthService) {}
  
  logout() {
    this.authService.logout();
  }
}
