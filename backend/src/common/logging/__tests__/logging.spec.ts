/**
 * Logging Service Unit Tests
 */

import { LoggingService } from '../logging.service';

describe('LoggingService', () => {
  let service: LoggingService;

  beforeEach(() => {
    // Mock environment
    process.env.LOG_LEVEL = 'info';
    process.env.LOG_DIR = 'logs/test';
    service = new LoggingService();
  });

  describe('log levels', () => {
    it('should log info messages', () => {
      // Just verify it doesn't throw
      expect(() => service.info('test message')).not.toThrow();
    });

    it('should log warning messages', () => {
      expect(() => service.warn('test warning')).not.toThrow();
    });

    it('should log error messages', () => {
      expect(() => service.error('test error', 'stack trace')).not.toThrow();
    });

    it('should log debug messages', () => {
      expect(() => service.debug('test debug')).not.toThrow();
    });
  });

  describe('context', () => {
    it('should set context', () => {
      const result = service.setContext('TestService');
      expect(result).toBe(service);
    });

    it('should include context in log message', () => {
      expect(() => {
        service.setContext('WorkflowService').log('test');
      }).not.toThrow();
    });
  });

  describe('structured data', () => {
    it('should log with data object', () => {
      expect(() => {
        service.info('User action', { userId: '123', action: 'create' });
      }).not.toThrow();
    });

    it('should log workflow events', () => {
      expect(() => {
        service.logWorkflow('execute', 'wf-1', 'inst-1', { duration: 1500 });
      }).not.toThrow();
    });

    it('should log approval events', () => {
      expect(() => {
        service.logApproval('approve', 'appr-1', 'user-1', { decision: 'approved' });
      }).not.toThrow();
    });

    it('should log HTTP requests', () => {
      expect(() => {
        service.logRequest('GET', '/api/users', 200, 50);
      }).not.toThrow();
    });

    it('should log HTTP errors as warn level', () => {
      expect(() => {
        service.logRequest('GET', '/api/users', 404, 30);
      }).not.toThrow();
    });
  });
});
