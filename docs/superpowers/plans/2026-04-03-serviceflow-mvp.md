# ServiceFlow MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create a working ServiceFlow MVP - an Angular 19+ workflow platform with Auth, Dashboard, Form Builder, and Workflow Designer

**Architecture:** Angular 19+ standalone components with Signals, localStorage for persistence, CSS variables for theming. Four main modules: Auth (login), Dashboard (stats), Form Builder (drag-drop), Workflow Designer (visual canvas).

**Tech Stack:** Angular 19+, TypeScript, CSS Variables (no Tailwind), localStorage

---

## File Structure

```
/home/cwlai/.openclaw/workspace/service-workflow/
├── src/
│   ├── app/
│   │   ├── core/
│   │   │   ├── services/
│   │   │   │   ├── auth.service.ts
│   │   │   │   ├── storage.service.ts
│   │   │   │   └── forms.service.ts
│   │   │   ├── guards/
│   │   │   │   └── auth.guard.ts
│   │   │   └── models/
│   │   │       └── index.ts
│   │   ├── features/
│   │   │   ├── auth/
│   │   │   │   ├── login.component.ts
│   │   │   │   └── login.component.css
│   │   │   ├── dashboard/
│   │   │   │   ├── dashboard.component.ts
│   │   │   │   └── dashboard.component.css
│   │   │   ├── form-builder/
│   │   │   │   ├── form-builder.component.ts
│   │   │   │   ├── form-builder.component.css
│   │   │   │   ├── element-palette.component.ts
│   │   │   │   └── element-properties.component.ts
│   │   │   └── workflow-designer/
│   │   │       ├── workflow-designer.component.ts
│   │   │       ├── workflow-designer.component.css
│   │   │       ├── node-panel.component.ts
│   │   │       └── canvas.component.ts
│   │   ├── shared/
│   │   │   ├── components/
│   │   │   │   ├── sidebar/
│   │   │   │   └── header/
│   │   │   └── styles/
│   │   │       └── variables.css
│   │   ├── app.component.ts
│   │   ├── app.component.css
│   │   ├── app.config.ts
│   │   └── app.routes.ts
│   ├── index.html
│   ├── main.ts
│   └── styles.css
├── angular.json
├── package.json
├── tsconfig.json
└── SPEC-MVP.md
```

---

## Phase 1: Project Setup

### Task 1: Initialize Angular 19+ Project

**Files:**
- Modify: `package.json` (create)
- Create: `angular.json`
- Create: `tsconfig.json`
- Create: `src/main.ts`
- Create: `src/index.html`
- Create: `src/styles.css`

- [ ] **Step 1: Create package.json with Angular 19 dependencies**

```json
{
  "name": "service-workflow",
  "version": "1.0.0",
  "scripts": {
    "ng": "ng",
    "start": "ng serve",
    "build": "ng build",
    "watch": "ng build --watch --configuration development"
  },
  "private": true,
  "dependencies": {
    "@angular/animations": "^19.0.0",
    "@angular/common": "^19.0.0",
    "@angular/compiler": "^19.0.0",
    "@angular/core": "^19.0.0",
    "@angular/forms": "^19.0.0",
    "@angular/platform-browser": "^19.0.0",
    "@angular/platform-browser-dynamic": "^19.0.0",
    "@angular/router": "^19.0.0",
    "rxjs": "~7.8.0",
    "tslib": "^2.6.0",
    "zone.js": "~0.15.0"
  },
  "devDependencies": {
    "@angular-devkit/build-angular": "^19.0.0",
    "@angular/cli": "^19.0.0",
    "@angular/compiler-cli": "^19.0.0",
    "typescript": "~5.6.0"
  }
}
```

- [ ] **Step 2: Create angular.json**

```json
{
  "$schema": "./node_modules/@angular/cli/lib/config/schema.json",
  "version": 1,
  "newProjectRoot": "projects",
  "projects": {
    "service-workflow": {
      "projectType": "application",
      "root": "",
      "sourceRoot": "src",
      "prefix": "app",
      "architect": {
        "build": {
          "builder": "@angular-devkit/build-angular:application",
          "options": {
            "outputPath": "dist/service-workflow",
            "index": "src/index.html",
            "browser": "src/main.ts",
            "polyfills": ["zone.js"],
            "tsConfig": "tsconfig.json",
            "assets": [],
            "styles": ["src/styles.css"],
            "scripts": []
          },
          "configurations": {
            "production": {
              "budgets": [
                { "type": "initial", "maximumWarning": "500kb", "maximumError": "1mb" }
              ],
              "outputHashing": "all"
            },
            "development": {
              "optimization": false,
              "extractLicenses": false,
              "sourceMap": true
            }
          },
          "defaultConfiguration": "production"
        },
        "serve": {
          "builder": "@angular-devkit/build-angular:dev-server",
          "configurations": {
            "production": { "buildTarget": "service-workflow:build:production" },
            "development": { "buildTarget": "service-workflow:build:development" }
          },
          "defaultConfiguration": "development"
        }
      }
    }
  }
}
```

- [ ] **Step 3: Create tsconfig.json**

```json
{
  "compileOnSave": false,
  "compilerOptions": {
    "outDir": "./dist/out-tsc",
    "forceConsistentCasingInFileNames": true,
    "strict": true,
    "noImplicitOverride": true,
    "noPropertyAccessFromIndexSignature": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "sourceMap": true,
    "declaration": false,
    "experimentalDecorators": true,
    "moduleResolution": "bundler",
    "importHelpers": true,
    "target": "ES2022",
    "module": "ES2022",
    "lib": ["ES2022", "dom"]
  },
  "angularCompilerOptions": {
    "enableI18nLegacyMessageIdFormat": false,
    "strictInjectionParameters": true,
    "strictInputAccessModifiers": true,
    "strictTemplates": true
  }
}
```

- [ ] **Step 4: Create src/index.html**

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>ServiceFlow</title>
  <base href="/">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <link rel="icon" type="image/x-icon" href="favicon.ico">
</head>
<body>
  <app-root></app-root>
</body>
</html>
```

- [ ] **Step 5: Create src/styles.css with CSS variables**

```css
:root {
  --color-primary: #2563eb;
  --color-primary-dark: #1d4ed8;
  --color-secondary: #64748b;
  --color-success: #10b981;
  --color-warning: #f59e0b;
  --color-danger: #ef4444;
  --color-background: #f8fafc;
  --color-surface: #ffffff;
  --color-text: #1e293b;
  --color-text-muted: #64748b;
  --color-border: #e2e8f0;
  
  --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
  --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1);
  --shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1);
  
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;
  
  --transition-fast: 150ms ease;
  --transition-normal: 250ms ease;
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background: var(--color-background);
  color: var(--color-text);
  line-height: 1.5;
}

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.5rem 1rem;
  border: none;
  border-radius: var(--radius-md);
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.btn-primary {
  background: var(--color-primary);
  color: white;
}

.btn-primary:hover {
  background: var(--color-primary-dark);
}

.btn-secondary {
  background: var(--color-surface);
  color: var(--color-text);
  border: 1px solid var(--color-border);
}

.btn-secondary:hover {
  background: var(--color-background);
}

input, select, textarea {
  width: 100%;
  padding: 0.5rem 0.75rem;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  font-size: 0.875rem;
  transition: border-color var(--transition-fast);
}

input:focus, select:focus, textarea:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
}
```

- [ ] **Step 6: Create src/main.ts**

```typescript
import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';

bootstrapApplication(AppComponent, appConfig)
  .catch((err) => console.error(err));
```

- [ ] **Step 7: Create app.config.ts**

```typescript
import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes)
  ]
};
```

- [ ] **Step 8: Create app.routes.ts**

```typescript
import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  { 
    path: 'login', 
    loadComponent: () => import('./features/auth/login.component').then(m => m.LoginComponent) 
  },
  {
    path: 'dashboard',
    loadComponent: () => import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent),
    canActivate: [authGuard]
  },
  {
    path: 'form-builder',
    loadComponent: () => import('./features/form-builder/form-builder.component').then(m => m.FormBuilderComponent),
    canActivate: [authGuard]
  },
  {
    path: 'workflow-designer',
    loadComponent: () => import('./features/workflow-designer/workflow-designer.component').then(m => m.WorkflowDesignerComponent),
    canActivate: [authGuard]
  }
];
```

- [ ] **Step 9: Create basic AppComponent**

```typescript
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
```

- [ ] **Step 10: Create core models**

```typescript
export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'manager' | 'user';
  department?: string;
}

export interface FormElement {
  id: string;
  type: string;
  label: string;
  required: boolean;
  placeholder?: string;
  options?: string[];
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
  };
}

export interface Form {
  id: string;
  name: string;
  description?: string;
  elements: FormElement[];
  createdAt: Date;
  updatedAt: Date;
}

export interface WorkflowNode {
  id: string;
  type: 'start' | 'end' | 'task' | 'condition' | 'approval' | 'parallel' | 'join';
  position: { x: number; y: number };
  data: Record<string, unknown>;
}

export interface WorkflowConnection {
  id: string;
  source: string;
  target: string;
}

export interface Workflow {
  id: string;
  name: string;
  description?: string;
  nodes: WorkflowNode[];
  connections: WorkflowConnection[];
  createdAt: Date;
  updatedAt: Date;
}

export interface DashboardStats {
  totalForms: number;
  totalWorkflows: number;
  pendingApprovals: number;
  completedSubmissions: number;
}
```

- [ ] **Step 11: Create storage service**

```typescript
import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class StorageService {
  private prefix = 'serviceflow_';

  set<T>(key: string, value: T): void {
    localStorage.setItem(this.prefix + key, JSON.stringify(value));
  }

  get<T>(key: string): T | null {
    const item = localStorage.getItem(this.prefix + key);
    return item ? JSON.parse(item) : null;
  }

  remove(key: string): void {
    localStorage.removeItem(this.prefix + key);
  }

  clear(): void {
    Object.keys(localStorage)
      .filter(k => k.startsWith(this.prefix))
      .forEach(k => localStorage.removeItem(k));
  }
}
```

- [ ] **Step 12: Create auth service**

```typescript
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
```

- [ ] **Step 13: Create auth guard**

```typescript
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  
  if (auth.isAuthenticated()) {
    return true;
  }
  return router.createUrlTree(['/login']);
};
```

- [ ] **Step 14: Install and test**

```bash
npm install
npm start
```

---

## Phase 2: Auth Module

### Task 2: Login Component

**Files:**
- Create: `src/app/features/auth/login.component.ts`
- Create: `src/app/features/auth/login.component.css`

- [ ] **Step 1: Create LoginComponent**

```typescript
import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="login-container">
      <div class="login-card">
        <div class="logo">ServiceFlow</div>
        <h1>Welcome back</h1>
        <p class="subtitle">Sign in to continue</p>
        
        <form (ngSubmit)="onSubmit()">
          <div class="form-group">
            <label for="email">Email</label>
            <input 
              type="email" 
              id="email" 
              [(ngModel)]="email" 
              name="email"
              placeholder="Enter your email"
              required
            >
          </div>
          
          <div class="form-group">
            <label for="password">Password</label>
            <input 
              type="password" 
              id="password" 
              [(ngModel)]="password" 
              name="password"
              placeholder="Enter your password"
              required
            >
          </div>
          
          @if (error()) {
            <div class="error">{{ error() }}</div>
          }
          
          <button type="submit" class="btn btn-primary btn-full">
            Sign In
          </button>
        </form>
        
        <p class="hint">Hint: Use any email and password (4+ chars)</p>
      </div>
    </div>
  `,
  styles: [`
    .login-container {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
    }
    .login-card {
      background: var(--color-surface);
      padding: 2.5rem;
      border-radius: var(--radius-lg);
      box-shadow: var(--shadow-lg);
      width: 100%;
      max-width: 400px;
    }
    .logo {
      font-size: 1.5rem;
      font-weight: 700;
      color: var(--color-primary);
      margin-bottom: 1.5rem;
    }
    h1 {
      font-size: 1.5rem;
      font-weight: 600;
      margin-bottom: 0.5rem;
    }
    .subtitle {
      color: var(--color-text-muted);
      margin-bottom: 1.5rem;
    }
    .form-group {
      margin-bottom: 1rem;
    }
    .form-group label {
      display: block;
      font-size: 0.875rem;
      font-weight: 500;
      margin-bottom: 0.5rem;
    }
    .btn-full {
      width: 100%;
      padding: 0.75rem;
      margin-top: 1rem;
    }
    .error {
      color: var(--color-danger);
      font-size: 0.875rem;
      margin-top: 0.5rem;
    }
    .hint {
      margin-top: 1.5rem;
      font-size: 0.75rem;
      color: var(--color-text-muted);
      text-align: center;
    }
  `]
})
export class LoginComponent {
  email = '';
  password = '';
  error = signal('');
  
  constructor(
    private auth: AuthService,
    private router: Router
  ) {}
  
  onSubmit() {
    this.error.set('');
    if (this.auth.login(this.email, this.password)) {
      this.router.navigate(['/dashboard']);
    } else {
      this.error.set('Invalid credentials');
    }
  }
}
```

---

## Phase 3: Dashboard Module

### Task 3: Dashboard Component

**Files:**
- Create: `src/app/features/dashboard/dashboard.component.ts`
- Create: `src/app/features/dashboard/dashboard.component.css`

- [ ] **Step 1: Create DashboardComponent**

```typescript
import { Component, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { StorageService } from '../../core/services/storage.service';
import { Form, Workflow, DashboardStats } from '../../core/models';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="dashboard">
      <header>
        <h1>Dashboard</h1>
        <p>Welcome back! Here's your workflow overview.</p>
      </header>
      
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-icon forms">📋</div>
          <div class="stat-info">
            <span class="stat-value">{{ stats().totalForms }}</span>
            <span class="stat-label">Total Forms</span>
          </div>
        </div>
        
        <div class="stat-card">
          <div class="stat-icon workflows">⚡</div>
          <div class="stat-info">
            <span class="stat-value">{{ stats().totalWorkflows }}</span>
            <span class="stat-label">Workflows</span>
          </div>
        </div>
        
        <div class="stat-card">
          <div class="stat-icon pending">⏳</div>
          <div class="stat-info">
            <span class="stat-value">{{ stats().pendingApprovals }}</span>
            <span class="stat-label">Pending Approvals</span>
          </div>
        </div>
        
        <div class="stat-card">
          <div class="stat-icon completed">✅</div>
          <div class="stat-info">
            <span class="stat-value">{{ stats().completedSubmissions }}</span>
            <span class="stat-label">Completed</span>
          </div>
        </div>
      </div>
      
      <div class="quick-actions">
        <h2>Quick Actions</h2>
        <div class="actions-grid">
          <a routerLink="/form-builder" class="action-card">
            <span class="action-icon">+</span>
            <span class="action-label">New Form</span>
          </a>
          <a routerLink="/workflow-designer" class="action-card">
            <span class="action-icon">⚡</span>
            <span class="action-label">New Workflow</span>
          </a>
        </div>
      </div>
      
      <div class="recent-section">
        <h2>Recent Forms</h2>
        @if (recentForms().length === 0) {
          <p class="empty">No forms yet. Create your first form!</p>
        } @else {
          <div class="list">
            @for (form of recentForms(); track form.id) {
              <div class="list-item">
                <span class="item-name">{{ form.name }}</span>
                <span class="item-date">{{ form.updatedAt | date:'mediumDate' }}</span>
              </div>
            }
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .dashboard header {
      margin-bottom: 2rem;
    }
    .dashboard h1 {
      font-size: 1.75rem;
      font-weight: 600;
      margin-bottom: 0.5rem;
    }
    .dashboard p {
      color: var(--color-text-muted);
    }
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1rem;
      margin-bottom: 2rem;
    }
    .stat-card {
      background: var(--color-surface);
      border-radius: var(--radius-lg);
      padding: 1.5rem;
      display: flex;
      align-items: center;
      gap: 1rem;
      box-shadow: var(--shadow-sm);
    }
    .stat-icon {
      width: 48px;
      height: 48px;
      border-radius: var(--radius-md);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.5rem;
    }
    .stat-icon.forms { background: #dbeafe; }
    .stat-icon.workflows { background: #dcfce7; }
    .stat-icon.pending { background: #fef3c7; }
    .stat-icon.completed { background: #dbeafe; }
    .stat-info {
      display: flex;
      flex-direction: column;
    }
    .stat-value {
      font-size: 1.5rem;
      font-weight: 700;
    }
    .stat-label {
      font-size: 0.875rem;
      color: var(--color-text-muted);
    }
    .quick-actions {
      margin-bottom: 2rem;
    }
    .quick-actions h2 {
      font-size: 1.25rem;
      margin-bottom: 1rem;
    }
    .actions-grid {
      display: flex;
      gap: 1rem;
    }
    .action-card {
      background: var(--color-surface);
      border: 2px dashed var(--color-border);
      border-radius: var(--radius-lg);
      padding: 2rem;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.5rem;
      text-decoration: none;
      color: var(--color-text);
      transition: all var(--transition-fast);
      min-width: 150px;
    }
    .action-card:hover {
      border-color: var(--color-primary);
      background: rgba(37, 99, 235, 0.05);
    }
    .action-icon {
      font-size: 2rem;
      color: var(--color-primary);
    }
    .action-label {
      font-weight: 500;
    }
    .recent-section h2 {
      font-size: 1.25rem;
      margin-bottom: 1rem;
    }
    .list {
      background: var(--color-surface);
      border-radius: var(--radius-lg);
      overflow: hidden;
    }
    .list-item {
      padding: 1rem 1.5rem;
      border-bottom: 1px solid var(--color-border);
      display: flex;
      justify-content: space-between;
    }
    .list-item:last-child {
      border-bottom: none;
    }
    .item-name {
      font-weight: 500;
    }
    .item-date {
      color: var(--color-text-muted);
      font-size: 0.875rem;
    }
    .empty {
      color: var(--color-text-muted);
      padding: 2rem;
      text-align: center;
      background: var(--color-surface);
      border-radius: var(--radius-lg);
    }
  `]
})
export class DashboardComponent implements OnInit {
  stats = signal<DashboardStats>({
    totalForms: 0,
    totalWorkflows: 0,
    pendingApprovals: 3,
    completedSubmissions: 12
  });
  
  recentForms = signal<Form[]>([]);
  
  constructor(private storage: StorageService) {}
  
  ngOnInit() {
    const forms = this.storage.get<Form[]>('forms') || [];
    const workflows = this.storage.get<Workflow[]>('workflows') || [];
    
    this.recentForms.set(forms.slice(0, 5));
    this.stats.set({
      totalForms: forms.length,
      totalWorkflows: workflows.length,
      pendingApprovals: 3,
      completedSubmissions: 12
    });
  }
}
```

---

## Phase 4: Form Builder Module

### Task 4: Form Builder Component

**Files:**
- Create: `src/app/features/form-builder/form-builder.component.ts`
- Create: `src/app/features/form-builder/form-builder.component.css`
- Create: `src/app/features/form-builder/element-palette.component.ts`
- Create: `src/app/features/form-builder/element-properties.component.ts`

- [ ] **Step 1: Create FormBuilderComponent**

```typescript
import { Component, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { StorageService } from '../../core/services/storage.service';
import { Form, FormElement } from '../../core/models';

const ELEMENT_TYPES = [
  { type: 'text', label: 'Single Line Text', icon: 'Aa' },
  { type: 'textarea', label: 'Multi Line Text', icon: '¶' },
  { type: 'number', label: 'Number', icon: '#' },
  { type: 'email', label: 'Email', icon: '@' },
  { type: 'phone', label: 'Phone', icon: '☎' },
  { type: 'date', label: 'Date', icon: '📅' },
  { type: 'daterange', label: 'Date Range', icon: '📆' },
  { type: 'time', label: 'Time', icon: '🕐' },
  { type: 'dropdown', label: 'Dropdown', icon: '▼' },
  { type: 'radio', label: 'Radio Buttons', icon: '◉' },
  { type: 'checkbox', label: 'Checkboxes', icon: '☑' },
  { type: 'multiselect', label: 'Multi-Select', icon: '☰' },
  { type: 'yesno', label: 'Yes/No', icon: '✓' },
  { type: 'file', label: 'File Upload', icon: '📎' },
  { type: 'image', label: 'Image Upload', icon: '🖼' },
  { type: 'signature', label: 'Signature', icon: '✍' },
  { type: 'userpicker', label: 'User Picker', icon: '👤' },
  { type: 'deptpicker', label: 'Department Picker', icon: '🏢' },
  { type: 'richtext', label: 'Rich Text', icon: '📝' },
  { type: 'table', label: 'Table/Grid', icon: '⊞' },
  { type: 'calculated', label: 'Calculated Field', icon: '∑' },
  { type: 'address', label: 'Address', icon: '📍' },
  { type: 'url', label: 'URL', icon: '🔗' }
];

@Component({
  selector: 'app-form-builder',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="form-builder">
      <div class="builder-header">
        <div class="header-left">
          <input 
            type="text" 
            [(ngModel)]="formName" 
            placeholder="Untitled Form"
            class="form-name-input"
          >
        </div>
        <div class="header-actions">
          <button class="btn btn-secondary" (click)="clearForm()">Clear</button>
          <button class="btn btn-primary" (click)="saveForm()">Save Form</button>
        </div>
      </div>
      
      <div class="builder-body">
        <aside class="palette">
          <h3>Elements</h3>
          <div class="element-list">
            @for (el of elementTypes; track el.type) {
              <div 
                class="element-item" 
                draggable="true"
                (dragstart)="onDragStart($event, el.type)"
              >
                <span class="el-icon">{{ el.icon }}</span>
                <span class="el-label">{{ el.label }}</span>
              </div>
            }
          </div>
        </aside>
        
        <main 
          class="canvas"
          (dragover)="onDragOver($event)"
          (drop)="onDrop($event)"
        >
          @if (elements().length === 0) {
            <div class="empty-canvas">
              <p>Drag elements here to build your form</p>
            </div>
          } @else {
            <div class="form-elements">
              @for (el of elements(); track el.id; let i = $index) {
                <div 
                  class="form-element" 
                  [class.selected]="selectedElementId() === el.id"
                  (click)="selectElement(el.id)"
                >
                  <div class="element-header">
                    <span class="element-label">{{ el.label }}</span>
                    <span class="element-type">{{ el.type }}</span>
                    @if (el.required) {
                      <span class="required-badge">Required</span>
                    }
                  </div>
                  <div class="element-preview">
                    @switch (el.type) {
                      @case ('text') {
                        <input type="text" disabled placeholder="Text input">
                      }
                      @case ('textarea') {
                        <textarea disabled placeholder="Multi-line text"></textarea>
                      }
                      @case ('number') {
                        <input type="number" disabled placeholder="Number">
                      }
                      @case ('email') {
                        <input type="email" disabled placeholder="email@example.com">
                      }
                      @case ('phone') {
                        <input type="tel" disabled placeholder="(555) 555-5555">
                      }
                      @case ('date') {
                        <input type="date" disabled>
                      }
                      @case ('dropdown') {
                        <select disabled><option>Select option...</option></select>
                      }
                      @case ('radio') {
                        <div class="radio-preview">○ Option 1 • Option 2</div>
                      }
                      @case ('checkbox') {
                        <div class="checkbox-preview">☐ Option 1 ☐ Option 2</div>
                      }
                      @case ('yesno') {
                        <div class="toggle-preview">○ Yes  ○ No</div>
                      }
                      @default {
                        <div class="default-preview">{{ el.type }}</div>
                      }
                    }
                  </div>
                  <button class="delete-btn" (click)="deleteElement(el.id, $event)">×</button>
                </div>
              }
            </div>
          }
        </main>
        
        <aside class="properties">
          <h3>Properties</h3>
          @if (selectedElement()) {
            <div class="property-form">
              <div class="form-group">
                <label>Label</label>
                <input 
                  type="text" 
                  [(ngModel)]="selectedElement()!.label"
                  (ngModelChange)="updateElement()"
                >
              </div>
              <div class="form-group">
                <label>Type</label>
                <input type="text" [value]="selectedElement()!.type" disabled>
              </div>
              <div class="form-group checkbox-group">
                <label>
                  <input 
                    type="checkbox" 
                    [(ngModel)]="selectedElement()!.required"
                    (ngModelChange)="updateElement()"
                  >
                  Required
                </label>
              </div>
              <div class="form-group">
                <label>Placeholder</label>
                <input 
                  type="text" 
                  [(ngModel)]="selectedElement()!.placeholder"
                  (ngModelChange)="updateElement()"
                >
              </div>
              @if (hasOptions()) {
                <div class="form-group">
                  <label>Options (one per line)</label>
                  <textarea 
                    [(ngModel)]="optionsText"
                    (ngModelChange)="updateOptions()"
                    rows="5"
                  ></textarea>
                </div>
              }
            </div>
          } @else {
            <p class="no-selection">Select an element to edit properties</p>
          }
        </aside>
      </div>
    </div>
  `,
  styles: [`
    .form-builder {
      display: flex;
      flex-direction: column;
      height: calc(100vh - 4rem);
    }
    .builder-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-bottom: 1rem;
      border-bottom: 1px solid var(--color-border);
      margin-bottom: 1rem;
    }
    .form-name-input {
      font-size: 1.25rem;
      font-weight: 600;
      border: none;
      background: transparent;
      width: 300px;
    }
    .form-name-input:focus {
      outline: none;
      border-bottom: 2px solid var(--color-primary);
    }
    .header-actions {
      display: flex;
      gap: 0.5rem;
    }
    .builder-body {
      display: flex;
      flex: 1;
      gap: 1rem;
      overflow: hidden;
    }
    .palette {
      width: 220px;
      background: var(--color-surface);
      border-radius: var(--radius-lg);
      padding: 1rem;
      overflow-y: auto;
    }
    .palette h3, .properties h3 {
      font-size: 0.875rem;
      font-weight: 600;
      color: var(--color-text-muted);
      text-transform: uppercase;
      margin-bottom: 1rem;
    }
    .element-list {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }
    .element-item {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.5rem 0.75rem;
      border-radius: var(--radius-md);
      cursor: grab;
      transition: background var(--transition-fast);
    }
    .element-item:hover {
      background: var(--color-background);
    }
    .el-icon {
      width: 24px;
      height: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--color-background);
      border-radius: var(--radius-sm);
      font-size: 0.75rem;
    }
    .el-label {
      font-size: 0.875rem;
    }
    .canvas {
      flex: 1;
      background: var(--color-surface);
      border-radius: var(--radius-lg);
      padding: 1.5rem;
      overflow-y: auto;
    }
    .empty-canvas {
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      border: 2px dashed var(--color-border);
      border-radius: var(--radius-lg);
      color: var(--color-text-muted);
    }
    .form-elements {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }
    .form-element {
      position: relative;
      padding: 1rem;
      border: 2px solid var(--color-border);
      border-radius: var(--radius-md);
      cursor: pointer;
      transition: all var(--transition-fast);
    }
    .form-element:hover {
      border-color: var(--color-secondary);
    }
    .form-element.selected {
      border-color: var(--color-primary);
    }
    .element-header {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin-bottom: 0.75rem;
    }
    .element-label {
      font-weight: 500;
    }
    .element-type {
      font-size: 0.75rem;
      color: var(--color-text-muted);
      background: var(--color-background);
      padding: 0.125rem 0.5rem;
      border-radius: var(--radius-sm);
    }
    .required-badge {
      font-size: 0.625rem;
      background: var(--color-danger);
      color: white;
      padding: 0.125rem 0.375rem;
      border-radius: var(--radius-sm);
    }
    .element-preview input,
    .element-preview textarea,
    .element-preview select {
      pointer-events: none;
      opacity: 0.7;
    }
    .radio-preview, .checkbox-preview, .toggle-preview {
      color: var(--color-text-muted);
      font-size: 0.875rem;
    }
    .delete-btn {
      position: absolute;
      top: 0.5rem;
      right: 0.5rem;
      width: 24px;
      height: 24px;
      border: none;
      background: var(--color-danger);
      color: white;
      border-radius: 50%;
      cursor: pointer;
      opacity: 0;
      transition: opacity var(--transition-fast);
    }
    .form-element:hover .delete-btn {
      opacity: 1;
    }
    .properties {
      width: 260px;
      background: var(--color-surface);
      border-radius: var(--radius-lg);
      padding: 1rem;
    }
    .property-form {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }
    .form-group label {
      display: block;
      font-size: 0.75rem;
      font-weight: 500;
      margin-bottom: 0.25rem;
    }
    .checkbox-group label {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    .checkbox-group input {
      width: auto;
    }
    .no-selection {
      color: var(--color-text-muted);
      font-size: 0.875rem;
      text-align: center;
      padding: 2rem 1rem;
    }
  `]
})
export class FormBuilderComponent {
  elementTypes = ELEMENT_TYPES;
  formName = 'Untitled Form';
  elements = signal<FormElement[]>([]);
  selectedElementId = signal<string | null>(null);
  optionsText = '';
  
  selectedElement = computed(() => {
    const id = this.selectedElementId();
    return id ? this.elements().find(e => e.id === id) || null : null;
  });
  
  hasOptions = computed(() => {
    const el = this.selectedElement();
    return el && ['dropdown', 'radio', 'checkbox', 'multiselect'].includes(el.type);
  });
  
  constructor(private storage: StorageService) {}
  
  onDragStart(event: DragEvent, type: string) {
    event.dataTransfer?.setData('elementType', type);
  }
  
  onDragOver(event: DragEvent) {
    event.preventDefault();
  }
  
  onDrop(event: DragEvent) {
    event.preventDefault();
    const type = event.dataTransfer?.getData('elementType');
    if (type) {
      const label = this.elementTypes.find(e => e.type === type)?.label || type;
      const newElement: FormElement = {
        id: crypto.randomUUID(),
        type,
        label,
        required: false,
        placeholder: ''
      };
      this.elements.update(els => [...els, newElement]);
    }
  }
  
  selectElement(id: string) {
    this.selectedElementId.set(id);
    const el = this.selectedElement();
    if (el?.options) {
      this.optionsText = el.options.join('\n');
    } else {
      this.optionsText = '';
    }
  }
  
  updateElement() {
    this.elements.update(els => [...els]);
  }
  
  updateOptions() {
    const el = this.selectedElement();
    if (el) {
      el.options = this.optionsText.split('\n').filter(o => o.trim());
      this.updateElement();
    }
  }
  
  deleteElement(id: string, event: Event) {
    event.stopPropagation();
    this.elements.update(els => els.filter(e => e.id !== id));
    if (this.selectedElementId() === id) {
      this.selectedElementId.set(null);
    }
  }
  
  clearForm() {
    this.elements.set([]);
    this.selectedElementId.set(null);
    this.formName = 'Untitled Form';
  }
  
  saveForm() {
    const forms = this.storage.get<Form[]>('forms') || [];
    const form: Form = {
      id: crypto.randomUUID(),
      name: this.formName,
      elements: this.elements(),
      createdAt: new Date(),
      updatedAt: new Date()
    };
    forms.push(form);
    this.storage.set('forms', forms);
    alert('Form saved!');
  }
}
```

---

## Phase 5: Workflow Designer Module

### Task 5: Workflow Designer Component

**Files:**
- Create: `src/app/features/workflow-designer/workflow-designer.component.ts`
- Create: `src/app/features/workflow-designer/workflow-designer.component.css`

- [ ] **Step 1: Create WorkflowDesignerComponent**

```typescript
import { Component, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { StorageService } from '../../core/services/storage.service';
import { Workflow, WorkflowNode, WorkflowConnection } from '../../core/models';

const NODE_TYPES = [
  { type: 'start', label: 'Start', icon: '▶', color: '#10b981' },
  { type: 'end', label: 'End', icon: '■', color: '#ef4444' },
  { type: 'task', label: 'Task', icon: '⬡', color: '#6366f1' },
  { type: 'condition', label: 'Condition', icon: '◇', color: '#f59e0b' },
  { type: 'approval', label: 'Approval', icon: '✓', color: '#8b5cf6' },
  { type: 'parallel', label: 'Parallel', icon: '∥', color: '#06b6d4' },
  { type: 'join', label: 'Join', icon: '⊥', color: '#06b6d4' }
];

@Component({
  selector: 'app-workflow-designer',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="workflow-designer">
      <div class="designer-header">
        <div class="header-left">
          <input 
            type="text" 
            [(ngModel)]="workflowName" 
            placeholder="Untitled Workflow"
            class="workflow-name-input"
          >
        </div>
        <div class="header-actions">
          <button class="btn btn-secondary" (click)="clearWorkflow()">Clear</button>
          <button class="btn btn-secondary" (click)="addStartNode()">+ Start</button>
          <button class="btn btn-primary" (click)="saveWorkflow()">Save Workflow</button>
        </div>
      </div>
      
      <div class="designer-body">
        <aside class="node-panel">
          <h3>Nodes</h3>
          <div class="node-list">
            @for (nodeType of nodeTypes; track nodeType.type) {
              <div 
                class="node-item" 
                draggable="true"
                (dragstart)="onDragStart($event, nodeType)"
              >
                <span class="node-icon" [style.background]="nodeType.color">
                  {{ nodeType.icon }}
                </span>
                <span class="node-label">{{ nodeType.label }}</span>
              </div>
            }
          </div>
        </aside>
        
        <main 
          class="canvas-container"
          (dragover)="onDragOver($event)"
          (drop)="onDrop($event)"
          (click)="deselectAll()"
        >
          <svg class="connections-layer">
            @for (conn of connections(); track conn.id) {
              <line 
                [attr.x1]="getNodeCenter(conn.source).x"
                [attr.y1]="getNodeCenter(conn.source).y"
                [attr.x2]="getNodeCenter(conn.target).x"
                [attr.y2]="getNodeCenter(conn.target).y"
                class="connection-line"
              />
            }
          </svg>
          
          @if (nodes().length === 0) {
            <div class="empty-canvas">
              <p>Drag nodes here to create your workflow</p>
              <p class="hint">Start with a Start node</p>
            </div>
          } @else {
            <div class="nodes-container">
              @for (node of nodes(); track node.id) {
                <div 
                  class="workflow-node"
                  [class.selected]="selectedNodeId() === node.id"
                  [style.left.px]="node.position.x"
                  [style.top.px]="node.position.y"
                  (click)="selectNode(node.id, $event)"
                  (mousedown)="startDrag($event, node)"
                >
                  <div class="node-header" [style.background]="getNodeColor(node.type)">
                    {{ getNodeLabel(node.type) }}
                  </div>
                  <div class="node-body">
                    {{ node.data.label || node.type }}
                  </div>
                  <div class="node-handles">
                    <div class="handle handle-in"></div>
                    <div class="handle handle-out" (mousedown)="startConnection($event, node)"></div>
                  </div>
                </div>
              }
            </div>
          }
        </main>
        
        <aside class="properties">
          <h3>Properties</h3>
          @if (selectedNode()) {
            <div class="property-form">
              <div class="form-group">
                <label>Node Type</label>
                <input type="text" [value]="selectedNode()!.type" disabled>
              </div>
              <div class="form-group">
                <label>Label</label>
                <input 
                  type="text" 
                  [(ngModel)]="selectedNode()!.data['label']"
                  (ngModelChange)="updateNode()"
                  placeholder="Enter label"
                >
              </div>
              @if (selectedNode()!.type === 'task' || selectedNode()!.type === 'approval') {
                <div class="form-group">
                  <label>Description</label>
                  <textarea 
                    [(ngModel)]="selectedNode()!.data['description']"
                    (ngModelChange)="updateNode()"
                    rows="3"
                  ></textarea>
                </div>
              }
              @if (selectedNode()!.type === 'condition') {
                <div class="form-group">
                  <label>Field</label>
                  <input 
                    type="text" 
                    [(ngModel)]="selectedNode()!.data['field']"
                    (ngModelChange)="updateNode()"
                  >
                </div>
                <div class="form-group">
                  <label>Value</label>
                  <input 
                    type="text" 
                    [(ngModel)]="selectedNode()!.data['value']"
                    (ngModelChange)="updateNode()"
                  >
                </div>
              }
              <button class="btn btn-danger" (click)="deleteNode()">Delete Node</button>
            </div>
          } @else {
            <p class="no-selection">Select a node to edit</p>
          }
          
          @if (connectingFrom()) {
            <div class="connection-hint">
              Click on another node to connect
            </div>
          }
        </aside>
      </div>
    </div>
  `,
  styles: [`
    .workflow-designer {
      display: flex;
      flex-direction: column;
      height: calc(100vh - 4rem);
    }
    .designer-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-bottom: 1rem;
      border-bottom: 1px solid var(--color-border);
      margin-bottom: 1rem;
    }
    .workflow-name-input {
      font-size: 1.25rem;
      font-weight: 600;
      border: none;
      background: transparent;
      width: 300px;
    }
    .workflow-name-input:focus {
      outline: none;
      border-bottom: 2px solid var(--color-primary);
    }
    .header-actions {
      display: flex;
      gap: 0.5rem;
    }
    .designer-body {
      display: flex;
      flex: 1;
      gap: 1rem;
      overflow: hidden;
    }
    .node-panel {
      width: 180px;
      background: var(--color-surface);
      border-radius: var(--radius-lg);
      padding: 1rem;
    }
    .node-panel h3, .properties h3 {
      font-size: 0.875rem;
      font-weight: 600;
      color: var(--color-text-muted);
      text-transform: uppercase;
      margin-bottom: 1rem;
    }
    .node-list {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }
    .node-item {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.5rem;
      border-radius: var(--radius-md);
      cursor: grab;
      transition: background var(--transition-fast);
    }
    .node-item:hover {
      background: var(--color-background);
    }
    .node-icon {
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: var(--radius-md);
      color: white;
      font-size: 0.875rem;
    }
    .node-label {
      font-size: 0.875rem;
      font-weight: 500;
    }
    .canvas-container {
      flex: 1;
      background: var(--color-surface);
      border-radius: var(--radius-lg);
      position: relative;
      overflow: hidden;
      background-image: radial-gradient(circle, var(--color-border) 1px, transparent 1px);
      background-size: 20px 20px;
    }
    .connections-layer {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
    }
    .connection-line {
      stroke: var(--color-secondary);
      stroke-width: 2;
    }
    .empty-canvas {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      text-align: center;
      color: var(--color-text-muted);
    }
    .empty-canvas .hint {
      font-size: 0.875rem;
      margin-top: 0.5rem;
    }
    .nodes-container {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
    }
    .workflow-node {
      position: absolute;
      width: 140px;
      background: var(--color-surface);
      border: 2px solid var(--color-border);
      border-radius: var(--radius-md);
      cursor: move;
      user-select: none;
    }
    .workflow-node.selected {
      border-color: var(--color-primary);
      box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.2);
    }
    .node-header {
      padding: 0.5rem;
      color: white;
      font-size: 0.75rem;
      font-weight: 600;
      text-align: center;
      border-radius: var(--radius-sm) var(--radius-sm) 0 0;
    }
    .node-body {
      padding: 0.75rem;
      text-align: center;
      font-size: 0.875rem;
    }
    .node-handles {
      position: absolute;
      top: 50%;
      width: 100%;
    }
    .handle {
      position: absolute;
      width: 12px;
      height: 12px;
      background: var(--color-secondary);
      border-radius: 50%;
      cursor: crosshair;
    }
    .handle-in {
      left: -6px;
      top: -6px;
    }
    .handle-out {
      right: -6px;
      top: -6px;
    }
    .properties {
      width: 260px;
      background: var(--color-surface);
      border-radius: var(--radius-lg);
      padding: 1rem;
    }
    .property-form {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }
    .form-group label {
      display: block;
      font-size: 0.75rem;
      font-weight: 500;
      margin-bottom: 0.25rem;
    }
    .btn-danger {
      background: var(--color-danger);
      color: white;
      border: none;
      padding: 0.5rem 1rem;
      border-radius: var(--radius-md);
      cursor: pointer;
    }
    .no-selection {
      color: var(--color-text-muted);
      font-size: 0.875rem;
      text-align: center;
      padding: 2rem 1rem;
    }
    .connection-hint {
      margin-top: 1rem;
      padding: 0.75rem;
      background: var(--color-primary);
      color: white;
      border-radius: var(--radius-md);
      font-size: 0.875rem;
      text-align: center;
    }
  `]
})
export class WorkflowDesignerComponent {
  nodeTypes = NODE_TYPES;
  workflowName = 'Untitled Workflow';
  nodes = signal<WorkflowNode[]>([]);
  connections = signal<WorkflowConnection[]>([]);
  selectedNodeId = signal<string | null>(null);
  connectingFrom = signal<string | null>(null);
  
  private dragNode: WorkflowNode | null = null;
  private dragOffset = { x: 0, y: 0 };
  
  selectedNode = computed(() => {
    const id = this.selectedNodeId();
    return id ? this.nodes().find(n => n.id === id) || null : null;
  });
  
  constructor(private storage: StorageService) {}
  
  getNodeColor(type: string): string {
    return this.nodeTypes.find(n => n.type === type)?.color || '#64748b';
  }
  
  getNodeLabel(type: string): string {
    return this.nodeTypes.find(n => n.type === type)?.label || type;
  }
  
  getNodeCenter(nodeId: string): { x: number; y: number } {
    const node = this.nodes().find(n => n.id === nodeId);
    if (!node) return { x: 0, y: 0 };
    return {
      x: node.position.x + 70,
      y: node.position.y + 40
    };
  }
  
  onDragStart(event: DragEvent, nodeType: typeof NODE_TYPES[0]) {
    event.dataTransfer?.setData('nodeType', JSON.stringify(nodeType));
  }
  
  onDragOver(event: DragEvent) {
    event.preventDefault();
  }
  
  onDrop(event: DragEvent) {
    event.preventDefault();
    const data = event.dataTransfer?.getData('nodeType');
    if (data) {
      const nodeType = JSON.parse(data);
      const rect = (event.target as HTMLElement).getBoundingClientRect();
      const newNode: WorkflowNode = {
        id: crypto.randomUUID(),
        type: nodeType.type as WorkflowNode['type'],
        position: {
          x: event.clientX - rect.left - 70,
          y: event.clientY - rect.top - 40
        },
        data: { label: nodeType.label }
      };
      this.nodes.update(ns => [...ns, newNode]);
    }
  }
  
  selectNode(id: string, event: Event) {
    event.stopPropagation();
    if (this.connectingFrom()) {
      this.createConnection(this.connectingFrom()!, id);
      this.connectingFrom.set(null);
    } else {
      this.selectedNodeId.set(id);
    }
  }
  
  deselectAll() {
    if (!this.connectingFrom()) {
      this.selectedNodeId.set(null);
    }
  }
  
  startDrag(event: MouseEvent, node: WorkflowNode) {
    if ((event.target as HTMLElement).classList.contains('handle-out')) return;
    this.dragNode = node;
    this.dragOffset = {
      x: event.clientX - node.position.x,
      y: event.clientY - node.position.y
    };
    this.selectedNodeId.set(node.id);
    
    const onMouseMove = (e: MouseEvent) => {
      if (this.dragNode) {
        this.dragNode.position = {
          x: e.clientX - this.dragOffset.x,
          y: e.clientY - this.dragOffset.y
        };
        this.nodes.update(ns => [...ns]);
      }
    };
    
    const onMouseUp = () => {
      this.dragNode = null;
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
    
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }
  
  startConnection(event: MouseEvent, node: WorkflowNode) {
    event.stopPropagation();
    this.connectingFrom.set(node.id);
  }
  
  createConnection(sourceId: string, targetId: string) {
    if (sourceId === targetId) return;
    const exists = this.connections().some(
      c => c.source === sourceId && c.target === targetId
    );
    if (!exists) {
      this.connections.update(cs => [...cs, {
        id: crypto.randomUUID(),
        source: sourceId,
        target: targetId
      }]);
    }
  }
  
  updateNode() {
    this.nodes.update(ns => [...ns]);
  }
  
  deleteNode() {
    const id = this.selectedNodeId();
    if (id) {
      this.nodes.update(ns => ns.filter(n => n.id !== id));
      this.connections.update(cs => cs.filter(c => c.source !== id && c.target !== id));
      this.selectedNodeId.set(null);
    }
  }
  
  addStartNode() {
    const startNode: WorkflowNode = {
      id: crypto.randomUUID(),
      type: 'start',
      position: { x: 100, y: 100 },
      data: { label: 'Start' }
    };
    this.nodes.update(ns => [...ns, startNode]);
  }
  
  clearWorkflow() {
    this.nodes.set([]);
    this.connections.set([]);
    this.selectedNodeId.set(null);
    this.workflowName = 'Untitled Workflow';
  }
  
  saveWorkflow() {
    const workflows = this.storage.get<Workflow[]>('workflows') || [];
    const workflow: Workflow = {
      id: crypto.randomUUID(),
      name: this.workflowName,
      nodes: this.nodes(),
      connections: this.connections(),
      createdAt: new Date(),
      updatedAt: new Date()
    };
    workflows.push(workflow);
    this.storage.set('workflows', workflows);
    alert('Workflow saved!');
  }
}
```

---

## Verification

- [ ] **Step 1: Build the project**

```bash
npm run build
```

- [ ] **Step 2: Start the dev server**

```bash
npm start
```

- [ ] **Step 3: Verify all pages load**

Navigate to:
- http://localhost:4200/login - Login page
- http://localhost:4200/dashboard - Dashboard with stats
- http://localhost:4200/form-builder - Form Builder with drag-drop
- http://localhost:4200/workflow-designer - Workflow Designer with canvas

---

## Plan Complete

**Plan complete and saved to `docs/superpowers/plans/2026-04-03-serviceflow-mvp.md`.**

Two execution options:

1. **Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

2. **Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

Which approach?
