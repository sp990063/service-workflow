import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';

interface SystemSettings {
  smtp: { host: string; port: number; secure: boolean; user: string; password: string; from: string; enabled: boolean; };
  ldap: { url: string; bindDN: string; bindPassword: string; searchBase: string; searchFilter: string; enabled: boolean; };
  server: { uploadDir: string; maxFileSize: number; sessionTimeout: number; };
  features: { ldapEnabled: boolean; smtpEnabled: boolean; ssoEnabled: boolean; };
}

@Component({
  selector: 'app-admin-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-settings.component.html',
  styleUrls: ['./admin-settings.component.css']
})
export class AdminSettingsComponent implements OnInit {
  settings = signal<SystemSettings | null>(null);
  loading = signal(true);
  error = signal<string | null>(null);
  activeTab = 'smtp';

  smtpEnabled = false;
  smtpSettings = { host: '', port: 587, secure: false, user: '', password: '', from: '' };

  ldapEnabled = false;
  ldapSettings = { url: '', bindDN: '', bindPassword: '', searchBase: '', searchFilter: '(uid={username})' };

  testingSmtp = signal(false);
  testingLdap = signal(false);
  smtpTestResult = signal<{ success: boolean; message: string } | null>(null);
  ldapTestResult = signal<{ success: boolean; message: string } | null>(null);

  ldapTestUsername = '';
  ldapTestPassword = '';

  systemInfo = signal<any>(null);
  healthCheck = signal<any>(null);

  constructor(private api: ApiService) {}

  ngOnInit() {
    this.loadSettings();
    this.loadSystemInfo();
  }

  loadSettings() {
    this.loading.set(true);
    this.error.set(null);
    this.api.get<SystemSettings>('/admin/settings').subscribe({
      next: (settings) => {
        this.settings.set(settings);
        this.smtpEnabled = settings.smtp.enabled;
        this.smtpSettings = { 
          host: settings.smtp.host, 
          port: settings.smtp.port, 
          secure: settings.smtp.secure, 
          user: settings.smtp.user, 
          password: settings.smtp.password, 
          from: settings.smtp.from 
        };
        this.ldapEnabled = settings.ldap.enabled;
        this.ldapSettings = { 
          url: settings.ldap.url, 
          bindDN: settings.ldap.bindDN, 
          bindPassword: settings.ldap.bindPassword, 
          searchBase: settings.ldap.searchBase, 
          searchFilter: settings.ldap.searchFilter 
        };
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Failed to load settings. Admin access required.');
        this.loading.set(false);
      }
    });
  }

  loadSystemInfo() {
    this.api.get<any>('/admin/system-info').subscribe({ 
      next: (info) => this.systemInfo.set(info), 
      error: () => {} 
    });
  }

  testSmtp() {
    this.testingSmtp.set(true);
    this.smtpTestResult.set(null);
    this.api.post<any>('/admin/settings/test-smtp', {}).subscribe({
      next: (result) => { 
        this.smtpTestResult.set(result); 
        this.testingSmtp.set(false); 
      },
      error: () => { 
        this.smtpTestResult.set({ success: false, message: 'Failed to test SMTP connection' }); 
        this.testingSmtp.set(false); 
      }
    });
  }

  testLdap() {
    this.testingLdap.set(true);
    this.ldapTestResult.set(null);
    this.api.post<any>('/admin/settings/test-ldap', {}).subscribe({
      next: (result) => { 
        this.ldapTestResult.set(result); 
        this.testingLdap.set(false); 
      },
      error: () => { 
        this.ldapTestResult.set({ success: false, message: 'Failed to test LDAP connection' }); 
        this.testingLdap.set(false); 
      }
    });
  }

  testLdapAuth() {
    if (!this.ldapTestUsername || !this.ldapTestPassword) {
      this.ldapTestResult.set({ success: false, message: 'Please enter both username and password' });
      return;
    }
    this.testingLdap.set(true);
    this.ldapTestResult.set(null);
    this.api.post<any>('/admin/settings/test-ldap-auth', { 
      username: this.ldapTestUsername, 
      password: this.ldapTestPassword 
    }).subscribe({
      next: (result) => { 
        this.ldapTestResult.set(result); 
        this.testingLdap.set(false); 
      },
      error: () => { 
        this.ldapTestResult.set({ success: false, message: 'LDAP authentication failed' }); 
        this.testingLdap.set(false); 
      }
    });
  }

  checkHealth() {
    this.api.get<any>('/admin/health').subscribe({ 
      next: (health) => this.healthCheck.set(health), 
      error: () => this.healthCheck.set({ error: 'Failed to check health' }) 
    });
  }

  formatUptime(seconds: number | undefined): string {
    if (!seconds) return 'N/A';
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return days + 'd ' + hours + 'h ' + minutes + 'm';
  }
}
