import { ThrottlerExceptionFilter } from '../throttler-exception.filter';
import { ThrottlerException } from '@nestjs/throttler';
import { HttpStatus } from '@nestjs/common';
import { Response } from 'express';

describe('ThrottlerExceptionFilter', () => {
  let filter: ThrottlerExceptionFilter;
  let mockResponse: Partial<Response>;
  let mockArgumentsHost: any;

  beforeEach(() => {
    filter = new ThrottlerExceptionFilter();

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    mockArgumentsHost = {
      switchToHttp: () => ({
        getResponse: () => mockResponse,
      }),
    };
  });

  it('should be defined', () => {
    expect(filter).toBeDefined();
  });

  it('should return 429 status with rate limit message', () => {
    const exception = new ThrottlerException('Rate limit exceeded');

    filter.catch(exception, mockArgumentsHost);

    expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.TOO_MANY_REQUESTS);
    expect(mockResponse.json).toHaveBeenCalledWith({
      statusCode: HttpStatus.TOO_MANY_REQUESTS,
      message: 'Too many requests. Please try again later.',
      retryAfter: 60,
    });
  });

  it('should ignore exception message and use fixed message', () => {
    const exception = new ThrottlerException('Custom throttler message');

    filter.catch(exception, mockArgumentsHost);

    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.not.objectContaining({ message: 'Custom throttler message' }),
    );
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Too many requests. Please try again later.' }),
    );
  });

  it('should always set retryAfter to 60', () => {
    const exception = new ThrottlerException('Rate limit');

    filter.catch(exception, mockArgumentsHost);

    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({ retryAfter: 60 }),
    );
  });
});
