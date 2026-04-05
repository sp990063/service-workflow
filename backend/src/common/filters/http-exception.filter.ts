/**
 * Global HTTP Exception Filter
 * 
 * Provides consistent error response format across all endpoints.
 * Never exposes internal error details or stack traces.
 */

import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

interface ErrorResponse {
  statusCode: number;
  error: string;
  message: string | string[];
  details?: Array<{ field: string; message: string }>;
  timestamp: string;
  path: string;
}

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status: number;
    let errorResponse: Partial<ErrorResponse>;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        const resp = exceptionResponse as any;
        
        // Handle validation errors from class-validator
        if (Array.isArray(resp.message)) {
          const details = this.extractValidationDetails(resp.message);
          errorResponse = {
            statusCode: status,
            error: this.getErrorName(status),
            message: 'Validation failed',
            details,
          };
        } else {
          errorResponse = {
            statusCode: status,
            error: resp.error || this.getErrorName(status),
            message: resp.message || exception.message,
          };
        }
      } else {
        errorResponse = {
          statusCode: status,
          error: this.getErrorName(status),
          message: exceptionResponse as string,
        };
      }

      // Log client errors at warn level
      if (status >= 400 && status < 500) {
        this.logger.warn(
          `${request.method} ${request.url} - ${status}: ${JSON.stringify(errorResponse.message)}`
        );
      } else {
        // Log server errors at error level
        this.logger.error(
          `${request.method} ${request.url} - ${status}`,
          exception instanceof Error ? exception.stack : undefined
        );
      }
    } else {
      // Unexpected errors - never expose details to client
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      errorResponse = {
        statusCode: status,
        error: 'Internal Server Error',
        message: 'An unexpected error occurred',
      };

      // Log full error details internally
      this.logger.error(
        `Unhandled exception on ${request.method} ${request.url}`,
        exception instanceof Error ? exception.stack : undefined
      );
    }

    response.status(status).json({
      ...errorResponse,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }

  /**
   * Extract field-level validation details from validation error messages
   */
  private extractValidationDetails(messages: string[]): Array<{ field: string; message: string }> {
    return messages.map(msg => {
      // Handle class-validator format: "fieldname must be a valid email"
      const match = msg.match(/^(\w+)\s/i);
      if (match) {
        return {
          field: match[1],
          message: msg,
        };
      }
      return {
        field: 'unknown',
        message: msg,
      };
    });
  }

  /**
   * Get HTTP error name from status code
   */
  private getErrorName(status: number): string {
    const errorNames: Record<number, string> = {
      400: 'Bad Request',
      401: 'Unauthorized',
      403: 'Forbidden',
      404: 'Not Found',
      405: 'Method Not Allowed',
      409: 'Conflict',
      422: 'Unprocessable Entity',
      429: 'Too Many Requests',
      500: 'Internal Server Error',
      502: 'Bad Gateway',
      503: 'Service Unavailable',
    };
    return errorNames[status] || 'Error';
  }
}
