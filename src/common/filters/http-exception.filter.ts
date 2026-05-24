import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Inject,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

import { ErrorResponse } from '../types/response.types';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {

  constructor(@Inject(Logger) private readonly logger : Logger) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx      = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request  = ctx.getRequest<Request>();

    let status:  number = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string = 'Internal server error';
    let error:   string | undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        // throw new BadRequestException('some message')
        message = exceptionResponse;
      } else if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        const resp = exceptionResponse as Record<string, any>;

        // message: 'User not found'  ← UI-safe
        if (Array.isArray(resp.message)) {
          message = resp.message.join(', ');
        } else if (typeof resp.message === 'string') {
          message = resp.message;
        } else {
          message = exception.message;
        }

        // error: 'UserService failed due to: ...'  ← debug context
        if (typeof resp.error === 'string' && resp.error !== message) {
          error = resp.error;
        }
      } else {
        message = exception.message;
      }
    } else if (exception instanceof Error) {
      message = exception.message;
      status  = HttpStatus.INTERNAL_SERVER_ERROR;
    } else if (
      typeof exception === 'object' &&
      exception !== null &&
      ('message' in exception || 'status' in exception)
    ) {
      const ex = exception as Record<string, any>;

      if (typeof ex.status === 'number') status = ex.status;

      if (Array.isArray(ex.message)) {
        message = ex.message.join(', ');
      } else if (typeof ex.message === 'string') {
        message = ex.message;
      }

      if (typeof ex.error === 'string') error = ex.error;
    }

    const logPayload = {
      statusCode: status,
      message:    error ?? message,
      stack:      exception instanceof Error ? exception.stack : undefined,
      path:       request.url,
      method:     request.method,
      userId:     (request as any).user?.id ?? null,
    };

    // 4xx = client error → warn  |  5xx = server error → error
    if (status >= 500) {
      this.logger.error('Server exception', logPayload);
    } else {
      this.logger.warn('Client exception', logPayload);
    }

    const body: ErrorResponse = { success: false, message };
    if (error) body.error = error;

    response.status(status).json(body);
  }
}
