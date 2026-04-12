import { Test, TestingModule } from '@nestjs/testing';
import { AdminController } from '../admin.controller';
import { AdminService } from '../admin.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';

describe('AdminController', () => {
  let controller: AdminController;
  let mockAdminService: any;

  const mockSettings = {
    smtp: { host: 'smtp.example.com', port: 587, from: 'noreply@example.com' },
    ldap: { enabled: true, url: 'ldap://ldap.example.com' },
    sso: { enabled: false },
  };

  const mockSystemInfo = {
    version: '1.0.0',
    nodeVersion: '18.x',
    platform: 'linux',
    uptime: 123456,
  };

  const mockHealth = {
    status: 'healthy',
    timestamp: new Date(),
    services: {
      database: 'up',
      email: 'up',
      ldap: 'up',
    },
  };

  beforeEach(async () => {
    mockAdminService = {
      getSystemSettings: jest.fn().mockReturnValue(mockSettings),
      testSmtpConnection: jest.fn().mockResolvedValue({ success: true, message: 'SMTP connection successful' }),
      testLdapConnection: jest.fn().mockResolvedValue({ success: true, message: 'LDAP connection successful' }),
      testLdapAuthentication: jest.fn().mockResolvedValue({ success: true, message: 'LDAP authentication successful' }),
      syncLdapUsers: jest.fn().mockResolvedValue({ synced: 5, errors: [] }),
      getSystemInfo: jest.fn().mockReturnValue(mockSystemInfo),
      getHealthCheck: jest.fn().mockResolvedValue(mockHealth),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminController],
      providers: [
        { provide: AdminService, useValue: mockAdminService },
      ],
    })
      .overrideGuard(JwtAuthGuard).useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard).useValue({ canActivate: () => true })
      .compile();

    controller = module.get<AdminController>(AdminController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getSystemSettings', () => {
    it('should return system settings', async () => {
      const result = await controller.getSystemSettings();

      expect(result).toEqual(mockSettings);
      expect(mockAdminService.getSystemSettings).toHaveBeenCalled();
    });
  });

  describe('testSmtp', () => {
    it('should return success when SMTP connection works', async () => {
      const result = await controller.testSmtp();

      expect(result).toEqual({ success: true, message: 'SMTP connection successful' });
      expect(mockAdminService.testSmtpConnection).toHaveBeenCalled();
    });

    it('should return failure when SMTP connection fails', async () => {
      mockAdminService.testSmtpConnection.mockResolvedValue({ success: false, message: 'SMTP connection failed' });
      const result = await controller.testSmtp();

      expect(result).toEqual({ success: false, message: 'SMTP connection failed' });
    });
  });

  describe('testLdap', () => {
    it('should return success when LDAP connection works', async () => {
      const result = await controller.testLdap();

      expect(result).toEqual({ success: true, message: 'LDAP connection successful' });
      expect(mockAdminService.testLdapConnection).toHaveBeenCalled();
    });

    it('should return failure when LDAP connection fails', async () => {
      mockAdminService.testLdapConnection.mockResolvedValue({ success: false, message: 'LDAP connection failed' });
      const result = await controller.testLdap();

      expect(result).toEqual({ success: false, message: 'LDAP connection failed' });
    });
  });

  describe('testLdapAuth', () => {
    it('should return success when LDAP authentication works', async () => {
      const body = { username: 'testuser', password: 'testpass' };
      const result = await controller.testLdapAuth(body);

      expect(result).toEqual({ success: true, message: 'LDAP authentication successful' });
      expect(mockAdminService.testLdapAuthentication).toHaveBeenCalledWith('testuser', 'testpass');
    });

    it('should return failure when LDAP authentication fails', async () => {
      mockAdminService.testLdapAuthentication.mockResolvedValue({ success: false, message: 'Invalid credentials' });
      const body = { username: 'testuser', password: 'wrongpass' };
      const result = await controller.testLdapAuth(body);

      expect(result).toEqual({ success: false, message: 'Invalid credentials' });
    });
  });

  describe('syncLdap', () => {
    it('should return sync results', async () => {
      const result = await controller.syncLdap();

      expect(result).toEqual({ synced: 5, errors: [] });
      expect(mockAdminService.syncLdapUsers).toHaveBeenCalled();
    });

    it('should return errors when sync partially fails', async () => {
      mockAdminService.syncLdapUsers.mockResolvedValue({ synced: 3, errors: ['Failed to sync user2'] });
      const result = await controller.syncLdap();

      expect(result).toEqual({ synced: 3, errors: ['Failed to sync user2'] });
    });
  });

  describe('getSystemInfo', () => {
    it('should return system info', async () => {
      const result = await controller.getSystemInfo();

      expect(result).toEqual(mockSystemInfo);
      expect(mockAdminService.getSystemInfo).toHaveBeenCalled();
    });
  });

  describe('getHealth', () => {
    it('should return health status', async () => {
      const result = await controller.getHealth();

      expect(result).toEqual(mockHealth);
      expect(mockAdminService.getHealthCheck).toHaveBeenCalled();
    });

    it('should return unhealthy status when services are down', async () => {
      mockAdminService.getHealthCheck.mockResolvedValue({
        status: 'unhealthy',
        timestamp: new Date(),
        services: {
          database: 'up',
          email: 'down',
          ldap: 'up',
        },
      });
      const result = await controller.getHealth();

      expect(result.status).toBe('unhealthy');
    });
  });
});
