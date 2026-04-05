/**
 * Logging Service - Centralized logging for ServiceFlow
 */

import { Injectable, LoggerService } from '@nestjs/common';
import * as winston from 'winston';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const DailyRotateFile = require('winston-daily-rotate-file');

@Injectable()
export class LoggingService implements LoggerService {
  private logger: winston.Logger;
  private context?: string;

  constructor() {
    const logLevel = process.env.LOG_LEVEL || 'info';
    const logDir = process.env.LOG_DIR || 'logs';

    // Custom format for structured logging
    const structuredFormat = winston.format.combine(
      winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
      winston.format.errors({ stack: true }),
      winston.format((info) => {
        return {
          timestamp: info.timestamp,
          level: info.level,
          context: info.context || 'Application',
          message: info.message,
          data: info.data,
          requestId: info.requestId,
        };
      })(),
      winston.format.json()
    );

    // Console format for development
    const consoleFormat = winston.format.combine(
      winston.format.colorize(),
      winston.format.timestamp({ format: 'HH:mm:ss' }),
      winston.format.printf(({ timestamp, level, context, message, ...rest }) => {
        let msg = `${timestamp} [${level}] ${context || 'App'}: ${message}`;
        if (Object.keys(rest).length > 0 && rest.data) {
          msg += ` ${JSON.stringify(rest.data)}`;
        }
        return msg;
      })
    );

    this.logger = winston.createLogger({
      level: logLevel,
      format: structuredFormat,
      defaultMeta: { service: 'ServiceFlow-API' },
      transports: [
        // Console - always enabled
        new winston.transports.Console({
          format: process.env.NODE_ENV === 'production' 
            ? structuredFormat 
            : consoleFormat,
        }),
        // File - rotate daily, keep 14 days
        new DailyRotateFile({
          dirname: logDir,
          filename: 'serviceflow-%DATE%.log',
          datePattern: 'YYYY-MM-DD',
          maxSize: '20m',
          maxFiles: '14d',
          format: structuredFormat,
        }),
        // Error file
        new DailyRotateFile({
          dirname: logDir,
          filename: 'serviceflow-error-%DATE%.log',
          datePattern: 'YYYY-MM-DD',
          level: 'error',
          maxSize: '20m',
          maxFiles: '14d',
          format: structuredFormat,
        }),
      ],
    });
  }

  setContext(context: string) {
    this.context = context;
    return this;
  }

  log(message: string, data?: any) {
    this.logger.info(message, { context: this.context, data });
  }

  info(message: string, data?: any) {
    this.logger.info(message, { context: this.context, data });
  }

  warn(message: string, data?: any) {
    this.logger.warn(message, { context: this.context, data });
  }

  error(message: string, trace?: string, data?: any) {
    this.logger.error(message, { context: this.context, trace, data });
  }

  debug(message: string, data?: any) {
    this.logger.debug(message, { context: this.context, data });
  }

  verbose(message: string, data?: any) {
    this.logger.verbose(message, { context: this.context, data });
  }

  // HTTP Request logging helper
  logRequest(method: string, url: string, statusCode: number, duration: number, data?: any) {
    const level = statusCode >= 400 ? 'warn' : 'info';
    this.logger.log(level, `${method} ${url} ${statusCode} - ${duration}ms`, {
      context: 'HTTP',
      data: { method, url, statusCode, duration, ...data },
    });
  }

  // Workflow logging helper
  logWorkflow(action: string, workflowId: string, instanceId?: string, data?: any) {
    this.logger.info(`Workflow ${action}`, {
      context: 'Workflow',
      data: { workflowId, instanceId, action, ...data },
    });
  }

  // Approval logging helper
  logApproval(action: string, approvalId: string, userId: string, data?: any) {
    this.logger.info(`Approval ${action}`, {
      context: 'Approval',
      data: { approvalId, userId, action, ...data },
    });
  }
}
