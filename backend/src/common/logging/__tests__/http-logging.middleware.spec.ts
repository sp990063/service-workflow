import { HttpLoggingMiddleware } from '../http-logging.middleware';
import { LoggingService } from '../logging.service';
import { Request, Response } from 'express';

describe('HttpLoggingMiddleware', () => {
  let middleware: HttpLoggingMiddleware;
  let mockLoggingService: jest.Mocked<LoggingService>;
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: jest.Mock;
  let mockOn: jest.Mock;

  beforeEach(() => {
    mockOn = jest.fn();
    mockLoggingService = {
      logRequest: jest.fn(),
    } as any;

    mockReq = {
      method: 'GET',
      originalUrl: '/api/users',
      headers: {},
      ip: '127.0.0.1',
    } as any;

    mockRes = {
      statusCode: 200,
      on: mockOn,
    } as any;

    mockNext = jest.fn();

    middleware = new HttpLoggingMiddleware(mockLoggingService);
  });

  it('should be defined', () => {
    expect(middleware).toBeDefined();
  });

  it('should call next()', () => {
    middleware.use(mockReq as Request, mockRes as Response, mockNext);

    expect(mockNext).toHaveBeenCalledTimes(1);
  });

  it('should generate request ID when x-request-id header is missing', () => {
    middleware.use(mockReq as Request, mockRes as Response, mockNext);

    expect((mockReq as any).requestId).toMatch(/^req-\d+$/);
  });

  it('should use existing request ID from header', () => {
    mockReq.headers = { 'x-request-id': 'custom-request-id' };

    middleware.use(mockReq as Request, mockRes as Response, mockNext);

    expect((mockReq as any).requestId).toBe('custom-request-id');
  });

  it('should register finish listener on response', () => {
    middleware.use(mockReq as Request, mockRes as Response, mockNext);

    expect(mockRes.on).toHaveBeenCalledWith('finish', expect.any(Function));
  });

  describe('finish listener', () => {
    it('should call loggingService.logRequest with correct parameters', () => {
      middleware.use(mockReq as Request, mockRes as Response, mockNext);

      const finishCallback = mockOn.mock.calls[0][1];
      finishCallback();

      expect(mockLoggingService.logRequest).toHaveBeenCalledWith(
        'GET',
        '/api/users',
        200,
        expect.any(Number),
        expect.objectContaining({
          requestId: (mockReq as any).requestId,
          userId: undefined,
          userAgent: undefined,
          ip: '127.0.0.1',
        }),
      );
    });

    it('should capture user ID from authenticated request', () => {
      mockReq.user = { id: 42 };

      middleware.use(mockReq as Request, mockRes as Response, mockNext);

      const finishCallback = mockOn.mock.calls[0][1];
      finishCallback();

      expect(mockLoggingService.logRequest).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        expect.any(Number),
        expect.any(Number),
        expect.objectContaining({
          userId: 42,
        }),
      );
    });

    it('should capture user agent from headers', () => {
      mockReq.headers = { 'user-agent': 'Mozilla/5.0' };

      middleware.use(mockReq as Request, mockRes as Response, mockNext);

      const finishCallback = mockOn.mock.calls[0][1];
      finishCallback();

      expect(mockLoggingService.logRequest).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        expect.any(Number),
        expect.any(Number),
        expect.objectContaining({
          userAgent: 'Mozilla/5.0',
        }),
      );
    });

    it('should use status code from response', () => {
      mockRes.statusCode = 201;

      middleware.use(mockReq as Request, mockRes as Response, mockNext);

      const finishCallback = mockOn.mock.calls[0][1];
      finishCallback();

      expect(mockLoggingService.logRequest).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        201,
        expect.any(Number),
        expect.any(Object),
      );
    });
  });
});
