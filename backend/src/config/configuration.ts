import { Injectable, Logger } from '@nestjs/common';

export interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  password: string;
  from: string;
  enabled: boolean;
}

export interface LdapConfig {
  url: string;
  bindDN: string;
  bindPassword: string;
  searchBase: string;
  searchFilter: string;
  enabled: boolean;
}

export interface ServerConfig {
  uploadDir: string;
  maxFileSize: number;
  sessionTimeout: number;
}

@Injectable()
export class ConfigService {
  private readonly logger = new Logger(ConfigService.name);

  // ============ SMTP Configuration ============
  getSmtpConfig(): SmtpConfig {
    return {
      host: process.env['SMTP_HOST'] || '',
      port: parseInt(process.env['SMTP_PORT'] || '587', 10),
      secure: process.env['SMTP_SECURE'] === 'true',
      user: process.env['SMTP_USER'] || '',
      password: process.env['SMTP_PASSWORD'] || '',
      from: process.env['SMTP_FROM'] || 'noreply@serviceflow.local',
      enabled: process.env['SMTP_ENABLED'] === 'true',
    };
  }

  // ============ LDAP Configuration ============
  getLdapConfig(): LdapConfig {
    return {
      url: process.env['LDAP_URL'] || '',
      bindDN: process.env['LDAP_BIND_DN'] || '',
      bindPassword: process.env['LDAP_BIND_PASSWORD'] || '',
      searchBase: process.env['LDAP_SEARCH_BASE'] || '',
      searchFilter: process.env['LDAP_SEARCH_FILTER'] || '(uid={{username}})',
      enabled: process.env['LDAP_ENABLED'] === 'true',
    };
  }

  // ============ Server Configuration ============
  getServerConfig(): ServerConfig {
    return {
      uploadDir: process.env['UPLOAD_DIR'] || '/tmp/uploads',
      maxFileSize: parseInt(process.env['MAX_FILE_SIZE'] || '10485760', 10), // 10MB default
      sessionTimeout: parseInt(process.env['SESSION_TIMEOUT'] || '86400', 10), // 24h default
    };
  }

  // ============ Feature Flags ============
  isLdapEnabled(): boolean {
    return process.env['LDAP_ENABLED'] === 'true';
  }

  isSmtpEnabled(): boolean {
    return process.env['SMTP_ENABLED'] === 'true';
  }

  isSSOEnabled(): boolean {
    return process.env['SSO_ENABLED'] === 'true';
  }
}
