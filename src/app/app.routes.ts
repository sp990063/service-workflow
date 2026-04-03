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
  }
];
