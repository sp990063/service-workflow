/**
 * HTTP Exception Filter Unit Tests
 */

import { GlobalExceptionFilter } from '../http-exception.filter';
import { HttpException, HttpStatus } from '@nestjs/common';

describe('GlobalExceptionFilter', () => {
  let filter: GlobalExceptionFilter;

  beforeEach(() => {
    filter = new GlobalExceptionFilter();
  });

  describe('catch', () => {
    it('should handle HttpException with string message', () => {
      const jsonMock = jest.fn();
      const statusMock = jest.fn().mockReturnValue({ json: jsonMock });
      
      const mockHost = {
        switchToHttp: () => ({
          getResponse: () => ({ status: statusMock, json: jsonMock }),
          getRequest: () => ({ url: '/api/test', method: 'GET' }),
        }),
      } as any;

      const exception = new HttpException('Not Found', HttpStatus.NOT_FOUND);
      filter.catch(exception, mockHost);

      expect(statusMock).toHaveBeenCalledWith(404);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 404,
          error: 'Not Found',
          message: 'Not Found',
          path: '/api/test',
        })
      );
    });

    it('should handle validation errors with array messages', () => {
      const jsonMock = jest.fn();
      const statusMock = jest.fn().mockReturnValue({ json: jsonMock });
      
      const mockHost = {
        switchToHttp: () => ({
          getResponse: () => ({ status: statusMock, json: jsonMock }),
          getRequest: () => ({ url: '/api/users', method: 'POST' }),
        }),
      } as any;

      const exception = new HttpException(
        { message: ['email must be valid', 'name is required'] },
        HttpStatus.BAD_REQUEST
      );
      filter.catch(exception, mockHost);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 400,
          message: 'Validation failed',
          details: expect.arrayContaining([
            { field: 'email', message: 'email must be valid' },
            { field: 'name', message: 'name is required' },
          ]),
        })
      );
    });

    it('should handle unexpected exceptions with 500', () => {
      const jsonMock = jest.fn();
      const statusMock = jest.fn().mockReturnValue({ json: jsonMock });
      
      const mockHost = {
        switchToHttp: () => ({
          getResponse: () => ({ status: statusMock, json: jsonMock }),
          getRequest: () => ({ url: '/api/test', method: 'GET' }),
        }),
      } as any;

      const exception = new Error('Database connection failed');
      filter.catch(exception, mockHost);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 500,
          error: 'Internal Server Error',
          message: 'An unexpected error occurred',
        })
      );
    });

    it('should include timestamp in response', () => {
      const jsonMock = jest.fn();
      const statusMock = jest.fn().mockReturnValue({ json: jsonMock });
      
      const mockHost = {
        switchToHttp: () => ({
          getResponse: () => ({ status: statusMock, json: jsonMock }),
          getRequest: () => ({ url: '/api/test', method: 'GET' }),
        }),
      } as any;

      const exception = new HttpException('Test', HttpStatus.BAD_REQUEST);
      filter.catch(exception, mockHost);

      const call = jsonMock.mock.calls[0][0];
      expect(call.timestamp).toBeDefined();
      expect(new Date(call.timestamp).toISOString()).toBe(call.timestamp);
    });
  });
});
