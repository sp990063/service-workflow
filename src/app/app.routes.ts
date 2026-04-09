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
    path: 'admin/users',
    loadComponent: () => import('./features/admin/admin-users.component').then(m => m.AdminUsersComponent),
    canActivate: [authGuard]
  },
  {
    path: 'admin/settings',
    loadComponent: () => import('./features/admin/admin-settings.component').then(m => m.AdminSettingsComponent),
    canActivate: [authGuard]
  },
  // Delegations feature disabled until implemented
  // {
  //   path: 'delegations',
  //   loadComponent: () => import('./features/delegations/delegations.component').then(m => m.DelegationsComponent),
  //   canActivate: [authGuard]
  // },
  {
    path: 'analytics',
    loadComponent: () => import('./features/analytics/analytics.component').then(m => m.AnalyticsComponent),
    canActivate: [authGuard]
  },
  {
    path: 'form-builder',
    loadComponent: () => import('./features/form-builder/form-builder.component').then(m => m.FormBuilderComponent),
    canActivate: [authGuard]
  },
  {
    path: 'forms',
    loadComponent: () => import('./features/forms/forms-list.component').then(m => m.FormsListComponent),
    canActivate: [authGuard]
  },
  {
    path: 'form-fill/:id',
    loadComponent: () => import('./features/form-fill/form-fill.component').then(m => m.FormFillComponent),
    canActivate: [authGuard]
  },
  {
    path: 'workflow-designer',
    loadComponent: () => import('./features/workflow-designer/workflow-designer.component').then(m => m.WorkflowDesignerComponent),
    canActivate: [authGuard]
  },
  {
    path: 'workflows',
    loadComponent: () => import('./features/workflows/workflows-list.component').then(m => m.WorkflowsListComponent),
    canActivate: [authGuard]
  },
  {
    path: 'workflow-player/:id/:instanceId?',
    loadComponent: () => import('./features/workflow-player/workflow-player.component').then(m => m.WorkflowPlayerComponent),
    canActivate: [authGuard]
  },
  {
    path: 'workflow-instance/:id',
    loadComponent: () => import('./features/workflow-instance-detail/workflow-instance-detail.component').then(m => m.WorkflowInstanceDetailComponent),
    canActivate: [authGuard]
  }
];
