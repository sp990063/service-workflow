import {
  ResourceNotFoundException,
  BusinessException,
  ForbiddenException,
  ConflictException,
  ValidationException,
} from '../business.exceptions';

describe('BusinessExceptions', () => {
  describe('ResourceNotFoundException', () => {
    it('should create exception with resource name only', () => {
      const exception = new ResourceNotFoundException('User');
      const response = exception.getResponse() as any;

      expect(response.error).toBe('Not Found');
      expect(response.message).toBe('User not found');
      expect(exception.getStatus()).toBe(404);
    });

    it('should create exception with resource name and identifier', () => {
      const exception = new ResourceNotFoundException('User', 123);
      const response = exception.getResponse() as any;

      expect(response.error).toBe('Not Found');
      expect(response.message).toBe("User with ID '123' not found");
    });

    it('should create exception with string identifier', () => {
      const exception = new ResourceNotFoundException('Workflow', 'abc-123');
      const response = exception.getResponse() as any;

      expect(response.message).toBe("Workflow with ID 'abc-123' not found");
    });
  });

  describe('BusinessException', () => {
    it('should create exception with message only', () => {
      const exception = new BusinessException('Cannot delete active workflow');
      const response = exception.getResponse() as any;

      expect(response.error).toBe('Business Rule Violation');
      expect(response.message).toBe('Cannot delete active workflow');
      expect(response.details).toBeUndefined();
      expect(exception.getStatus()).toBe(422);
    });

    it('should create exception with message and details', () => {
      const details = { field: 'status', reason: 'must be inactive' };
      const exception = new BusinessException('Invalid state', details);
      const response = exception.getResponse() as any;

      expect(response.message).toBe('Invalid state');
      expect(response.details).toEqual(details);
    });
  });

  describe('ForbiddenException', () => {
    it('should create exception with default message', () => {
      const exception = new ForbiddenException();
      const response = exception.getResponse() as any;

      expect(response.error).toBe('Forbidden');
      expect(response.message).toBe('You do not have permission to perform this action');
      expect(exception.getStatus()).toBe(403);
    });

    it('should create exception with custom message', () => {
      const exception = new ForbiddenException('Access denied to this resource');
      const response = exception.getResponse() as any;

      expect(response.message).toBe('Access denied to this resource');
    });
  });

  describe('ConflictException', () => {
    it('should create exception with message', () => {
      const exception = new ConflictException('Email already in use');
      const response = exception.getResponse() as any;

      expect(response.error).toBe('Conflict');
      expect(response.message).toBe('Email already in use');
      expect(exception.getStatus()).toBe(409);
    });
  });

  describe('ValidationException', () => {
    it('should create exception with field-level details', () => {
      const details = [
        { field: 'email', message: 'Invalid email format' },
        { field: 'name', message: 'Name is required' },
      ];
      const exception = new ValidationException(details);
      const response = exception.getResponse() as any;

      expect(response.error).toBe('Validation Failed');
      expect(response.message).toBe('One or more fields have invalid values');
      expect(response.details).toEqual(details);
      expect(exception.getStatus()).toBe(400);
    });

    it('should handle empty details array', () => {
      const exception = new ValidationException([]);
      const response = exception.getResponse() as any;

      expect(response.details).toEqual([]);
    });
  });
});
