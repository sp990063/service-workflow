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
