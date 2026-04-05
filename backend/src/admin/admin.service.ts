import { Injectable, Logger } from '@nestjs/common';
import { ConfigService, SmtpConfig, LdapConfig } from '../config/configuration';
import { EmailService } from '../notifications/email.service';
import { LdapService } from '../config/ldap.service';

export interface SystemSettings {
  smtp: SmtpConfig;
  ldap: LdapConfig;
  server: {
    uploadDir: string;
    maxFileSize: number;
    sessionTimeout: number;
  };
  features: {
    ldapEnabled: boolean;
    smtpEnabled: boolean;
    ssoEnabled: boolean;
  };
}

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    private configService: ConfigService,
    private emailService: EmailService,
    private ldapService: LdapService,
  ) {}

  getSystemSettings(): SystemSettings {
    const smtpConfig = this.configService.getSmtpConfig();
    const ldapConfig = this.configService.getLdapConfig();
    const serverConfig = this.configService.getServerConfig();

    // Mask sensitive data
    const maskedSmtp = {
      ...smtpConfig,
      password: smtpConfig.password ? '********' : '',
    };

    const maskedLdap = {
      ...ldapConfig,
      bindPassword: ldapConfig.bindPassword ? '********' : '',
    };

    return {
      smtp: maskedSmtp as SmtpConfig,
      ldap: maskedLdap as LdapConfig,
      server: serverConfig,
      features: {
        ldapEnabled: this.configService.isLdapEnabled(),
        smtpEnabled: this.configService.isSmtpEnabled(),
        ssoEnabled: this.configService.isSSOEnabled(),
      },
    };
  }

  async testSmtpConnection(): Promise<{ success: boolean; message: string }> {
    const config = this.configService.getSmtpConfig();
    
    if (!config.enabled) {
      return { success: false, message: 'SMTP is not enabled' };
    }

    try {
      const result = await this.emailService.sendEmail({
        to: config.user,
        subject: 'ServiceFlow SMTP Test',
        html: '<p>This is a test email from ServiceFlow.</p><p>If you receive this, SMTP is configured correctly.</p>',
      });

      return {
        success: result,
        message: result ? 'Test email sent successfully' : 'Failed to send test email',
      };
    } catch (error) {
      return { success: false, message: `SMTP error: ${error.message}` };
    }
  }

  async testLdapConnection(): Promise<{ success: boolean; message: string }> {
    const config = this.configService.getLdapConfig();

    if (!config.enabled) {
      return { success: false, message: 'LDAP is not enabled' };
    }

    try {
      const users = await this.ldapService.syncUsers();
      return {
        success: true,
        message: `LDAP connection successful. Found ${users.length} users.`,
      };
    } catch (error) {
      return { success: false, message: `LDAP error: ${error.message}` };
    }
  }

  async testLdapAuthentication(username: string, password: string): Promise<{ success: boolean; message: string }> {
    const config = this.configService.getLdapConfig();

    if (!config.enabled) {
      return { success: false, message: 'LDAP is not enabled' };
    }

    try {
      const user = await this.ldapService.authenticate(username, password);
      
      if (user) {
        return {
          success: true,
          message: `LDAP authentication successful for ${username}`,
        };
      } else {
        return {
          success: false,
          message: 'Invalid LDAP credentials',
        };
      }
    } catch (error) {
      return { success: false, message: `LDAP error: ${error.message}` };
    }
  }

  getSystemInfo() {
    return {
      version: '1.0.0',
      environment: process.env['NODE_ENV'] || 'development',
      nodeVersion: process.version,
      platform: process.platform,
      uptime: process.uptime(),
      memory: process.memoryUsage(),
    };
  }

  async getHealthCheck() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      services: {
        database: await this.checkDatabase(),
        smtp: this.configService.isSmtpEnabled(),
        ldap: this.configService.isLdapEnabled(),
      },
    };
  }

  private async checkDatabase(): Promise<boolean> {
    try {
      // Simple database check would go here
      return true;
    } catch {
      return false;
    }
  }
}
