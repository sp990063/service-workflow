/**
 * HTTP Request Logging Middleware
 */

import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { LoggingService } from './logging.service';

@Injectable()
export class HttpLoggingMiddleware implements NestMiddleware {
  constructor(private loggingService: LoggingService) {}

  use(req: Request, res: Response, next: NextFunction) {
    const { method, originalUrl } = req;
    const startTime = Date.now();

    // Generate request ID
    const requestId = req.headers['x-request-id'] as string || `req-${Date.now()}`;
    (req as any).requestId = requestId;

    // Log when response finishes
    res.on('finish', () => {
      const { statusCode } = res;
      const duration = Date.now() - startTime;

      // Get user ID if authenticated
      const userId = (req as any).user?.id;
      
      this.loggingService.logRequest(method, originalUrl, statusCode, duration, {
        requestId,
        userId,
        userAgent: req.headers['user-agent'],
        ip: req.ip,
      });
    });

    next();
  }
}
