import { Test, TestingModule } from '@nestjs/testing';
import { LdapService } from './ldap.service';
import { ConfigService } from './configuration';

describe('LdapService', () => {
  let service: LdapService;
  let mockConfigService: any;

  const mockLdapConfig = {
    enabled: true,
    url: 'ldap://localhost:389',
    bindDN: 'cn=admin,dc=example,dc=com',
    bindPassword: 'admin_password',
    searchBase: 'dc=example,dc=com',
    searchFilter: '(uid={{username}})',
  };

  beforeEach(async () => {
    mockConfigService = {
      getLdapConfig: jest.fn().mockReturnValue(mockLdapConfig),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LdapService,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<LdapService>(LdapService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('authenticate', () => {
    it('should return null when LDAP is disabled', async () => {
      mockConfigService.getLdapConfig.mockReturnValue({ ...mockLdapConfig, enabled: false });

      const result = await service.authenticate('testuser', 'password');

      expect(result).toBeNull();
    });
  });

  describe('findUser', () => {
    it('should return null when LDAP is disabled', async () => {
      mockConfigService.getLdapConfig.mockReturnValue({ ...mockLdapConfig, enabled: false });

      const result = await service.findUser('testuser');

      expect(result).toBeNull();
    });
  });

  describe('syncUsers', () => {
    it('should return empty array when LDAP is disabled', async () => {
      mockConfigService.getLdapConfig.mockReturnValue({ ...mockLdapConfig, enabled: false });

      const result = await service.syncUsers();

      expect(result).toEqual([]);
    });
  });

  describe('config integration', () => {
    it('should use config service to get LDAP settings', async () => {
      await service.authenticate('testuser', 'password');

      expect(mockConfigService.getLdapConfig).toHaveBeenCalled();
    });

    it('should call getLdapConfig for findUser', async () => {
      await service.findUser('testuser');

      expect(mockConfigService.getLdapConfig).toHaveBeenCalled();
    });

    it('should call getLdapConfig for syncUsers', async () => {
      await service.syncUsers();

      expect(mockConfigService.getLdapConfig).toHaveBeenCalled();
    });
  });
});
