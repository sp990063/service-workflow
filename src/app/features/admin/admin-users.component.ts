import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';

interface User {
  id: string;
  email: string;
  name: string;
  role: 'ADMIN' | 'MANAGER' | 'USER';
  department: string | null;
  createdAt: string;
}

@Component({
  selector: 'app-admin-users',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="admin-users">
      <div class="page-header">
        <h1>User Management</h1>
        <p class="subtitle">Manage user roles and permissions</p>
      </div>

      @if (loading()) {
        <div class="loading">Loading users...</div>
      } @else if (error()) {
        <div class="error-message">
          <p>{{ error() }}</p>
          <button class="btn btn-primary" (click)="loadUsers()">Retry</button>
        </div>
      } @else {
        <div class="users-table-container">
          <table class="users-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Department</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              @for (user of users(); track user.id) {
                <tr>
                  <td>{{ user.name }}</td>
                  <td>{{ user.email }}</td>
                  <td>
                    <span class="role-badge" [class]="'role-' + user.role.toLowerCase()">
                      {{ user.role }}
                    </span>
                  </td>
                  <td>{{ user.department || '-' }}</td>
                  <td>{{ user.createdAt | date:'short' }}</td>
                  <td>
                    @if (currentUserId() !== user.id) {
                      <select 
                        class="role-select" 
                        [value]="user.role" 
                        (change)="onRoleChange(user.id, $event)">
                        <option value="USER">USER</option>
                        <option value="MANAGER">MANAGER</option>
                        <option value="ADMIN">ADMIN</option>
                      </select>
                    } @else {
                      <span class="current-user-label">(You)</span>
                    }
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
    </div>
  `,
  styles: [`
    .admin-users {
      padding: 2rem;
      max-width: 1200px;
      margin: 0 auto;
    }

    .page-header {
      margin-bottom: 2rem;
    }

    .page-header h1 {
      margin: 0 0 0.5rem 0;
      color: #333;
    }

    .subtitle {
      color: #666;
      margin: 0;
    }

    .loading, .error-message {
      text-align: center;
      padding: 3rem;
      background: white;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }

    .error-message {
      color: #dc3545;
    }

    .error-message button {
      margin-top: 1rem;
    }

    .users-table-container {
      background: white;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      overflow: hidden;
    }

    .users-table {
      width: 100%;
      border-collapse: collapse;
    }

    .users-table th {
      background: #f8f9fa;
      padding: 1rem;
      text-align: left;
      font-weight: 600;
      color: #333;
      border-bottom: 2px solid #dee2e6;
    }

    .users-table td {
      padding: 1rem;
      border-bottom: 1px solid #dee2e6;
    }

    .users-table tr:last-child td {
      border-bottom: none;
    }

    .role-badge {
      display: inline-block;
      padding: 0.25rem 0.75rem;
      border-radius: 12px;
      font-size: 0.875rem;
      font-weight: 500;
    }

    .role-admin {
      background: #dc3545;
      color: white;
    }

    .role-manager {
      background: #ffc107;
      color: #333;
    }

    .role-user {
      background: #28a745;
      color: white;
    }

    .role-select {
      padding: 0.5rem;
      border: 1px solid #ced4da;
      border-radius: 4px;
      background: white;
      font-size: 0.875rem;
      cursor: pointer;
    }

    .role-select:hover {
      border-color: #007bff;
    }

    .current-user-label {
      color: #6c757d;
      font-style: italic;
    }

    .btn {
      padding: 0.5rem 1rem;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 0.875rem;
    }

    .btn-primary {
      background: #007bff;
      color: white;
    }

    .btn-primary:hover {
      background: #0056b3;
    }
  `]
})
export class AdminUsersComponent implements OnInit {
  users = signal<User[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);
  currentUserId = signal<string | null>(null);

  constructor(
    private api: ApiService,
    private auth: AuthService
  ) {}

  ngOnInit() {
    const token = this.api.getToken();
    if (token) {
      const payload = JSON.parse(atob(token.split('.')[1]));
      this.currentUserId.set(payload.sub);
    }
    this.loadUsers();
  }

  loadUsers() {
    this.loading.set(true);
    this.error.set(null);

    this.api.get<User[]>('/users').subscribe({
      next: (users) => {
        this.users.set(users);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set('Failed to load users. Please ensure you have admin privileges.');
        this.loading.set(false);
      }
    });
  }

  onRoleChange(userId: string, event: Event) {
    const select = event.target as HTMLSelectElement;
    const newRole = select.value as 'ADMIN' | 'MANAGER' | 'USER';
    
    this.api.put(`/users/${userId}/role`, { role: newRole }).subscribe({
      next: () => {
        // Update local state
        this.users.update(users => 
          users.map(u => u.id === userId ? { ...u, role: newRole } : u)
        );
      },
      error: (err) => {
        alert('Failed to update role. Please try again.');
        this.loadUsers(); // Reload to reset select
      }
    });
  }
}
