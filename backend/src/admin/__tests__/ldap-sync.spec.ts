/**
 * LDAP Sync Unit Tests
 */

import { AdminService } from '../admin.service';
import { LdapService, LdapUser } from '../../config/ldap.service';

describe('AdminService - LDAP Sync', () => {
  let adminService: AdminService;
  let mockPrisma: any;
  let mockLdapService: any;

  beforeEach(() => {
    mockPrisma = {
      user: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
    };

    mockLdapService = {
      syncUsers: jest.fn(),
      authenticate: jest.fn(),
    };

    // Create a minimal mock for ConfigService
    const mockConfigService: any = {
      isLdapEnabled: jest.fn().mockReturnValue(true),
      getLdapConfig: jest.fn().mockReturnValue({ enabled: true }),
      isSmtpEnabled: jest.fn().mockReturnValue(false),
    };

    const mockEmailService: any = {};

    adminService = new AdminService(
      mockConfigService,
      mockEmailService,
      mockLdapService,
      mockPrisma,
    );
  });

  describe('syncLdapUsers', () => {
    it('should return error when LDAP is disabled', async () => {
      const mockConfigService: any = {
        isLdapEnabled: jest.fn().mockReturnValue(false),
      };

      const mockEmailService: any = {};
      const mockLdapService: any = {};
      const mockPrisma: any = {};

      const adminService = new AdminService(
        mockConfigService,
        mockEmailService,
        mockLdapService,
        mockPrisma,
      );

      const result = await adminService.syncLdapUsers();

      expect(result.success).toBe(false);
      expect(result.message).toBe('LDAP is not enabled');
    });

    it('should sync new LDAP users to database', async () => {
      const ldapUsers: LdapUser[] = [
        { dn: 'uid=user1,dc=example,dc=com', uid: 'user1', email: 'user1@example.com', name: 'User One', groups: [] },
        { dn: 'uid=user2,dc=example,dc=com', uid: 'user2', email: 'user2@example.com', name: 'User Two', groups: [] },
      ];

      mockLdapService.syncUsers.mockResolvedValue(ldapUsers);
      mockPrisma.user.findUnique.mockResolvedValue(null); // No existing user
      mockPrisma.user.create.mockResolvedValue({ email: 'user1@example.com' });

      const result = await adminService.syncLdapUsers();

      expect(result.success).toBe(true);
      expect(result.synced).toBe(2);
      expect(result.errors).toBe(0);
      expect(mockPrisma.user.create).toHaveBeenCalledTimes(2);
    });

    it('should update existing LDAP users', async () => {
      const ldapUsers: LdapUser[] = [
        { dn: 'uid=user1,dc=example,dc=com', uid: 'user1', email: 'user1@example.com', name: 'User One Updated', groups: [] },
      ];

      mockLdapService.syncUsers.mockResolvedValue(ldapUsers);
      mockPrisma.user.findUnique.mockResolvedValue({ id: '1', email: 'user1@example.com', name: 'User One Old' });
      mockPrisma.user.update.mockResolvedValue({ id: '1', email: 'user1@example.com', name: 'User One Updated' });

      const result = await adminService.syncLdapUsers();

      expect(result.success).toBe(true);
      expect(result.synced).toBe(1);
      expect(mockPrisma.user.update).toHaveBeenCalled();
    });

    it('should handle sync errors gracefully', async () => {
      const ldapUsers: LdapUser[] = [
        { dn: 'uid=user1,dc=example,dc=com', uid: 'user1', email: 'user1@example.com', name: 'User One', groups: [] },
      ];

      mockLdapService.syncUsers.mockResolvedValue(ldapUsers);
      mockPrisma.user.findUnique.mockRejectedValue(new Error('Database error'));

      const result = await adminService.syncLdapUsers();

      // Sync operation succeeds even with individual errors
      expect(result.success).toBe(true);
      expect(result.synced).toBe(0); // This user failed, not counted
      expect(result.errors).toBe(1);
    });
  });
});
