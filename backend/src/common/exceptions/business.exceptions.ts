/**
 * Business Exceptions
 * 
 * Custom exceptions for specific business logic errors.
 */

import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * Thrown when a requested resource is not found
 */
export class ResourceNotFoundException extends HttpException {
  constructor(resource: string, identifier?: string | number) {
    const message = identifier 
      ? `${resource} with ID '${identifier}' not found`
      : `${resource} not found`;
    super(
      {
        error: 'Not Found',
        message,
      },
      HttpStatus.NOT_FOUND
    );
  }
}

/**
 * Thrown when a business rule is violated
 */
export class BusinessException extends HttpException {
  constructor(message: string, details?: any) {
    super(
      {
        error: 'Business Rule Violation',
        message,
        details,
      },
      HttpStatus.UNPROCESSABLE_ENTITY
    );
  }
}

/**
 * Thrown when user tries to perform an unauthorized action
 */
export class ForbiddenException extends HttpException {
  constructor(message = 'You do not have permission to perform this action') {
    super(
      {
        error: 'Forbidden',
        message,
      },
      HttpStatus.FORBIDDEN
    );
  }
}

/**
 * Thrown when there's a conflict with current state
 */
export class ConflictException extends HttpException {
  constructor(message: string) {
    super(
      {
        error: 'Conflict',
        message,
      },
      HttpStatus.CONFLICT
    );
  }
}

/**
 * Thrown when validation fails with field-level details
 */
export class ValidationException extends HttpException {
  constructor(details: Array<{ field: string; message: string }>) {
    super(
      {
        error: 'Validation Failed',
        message: 'One or more fields have invalid values',
        details,
      },
      HttpStatus.BAD_REQUEST
    );
  }
}
