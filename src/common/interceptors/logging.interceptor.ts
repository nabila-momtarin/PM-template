import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { Request, Response } from 'express';

const SENSITIVE_FIELDS = new Set([
  'password', 'confirmPassword', 'currentPassword', 'newPassword',
  'token', 'accessToken', 'refreshToken',
  'secret', 'apiKey', 'privateKey',
  'cardNumber', 'cvv', 'pin', 'otp',
]);

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req      = context.switchToHttp().getRequest<Request>();
    const res      = context.switchToHttp().getResponse<Response>();
    const { method, originalUrl } = req;

    // NestJS-aware context — not available in middleware
    const controllerName = context.getClass().name;
    const handlerName    = context.getHandler().name;
    const userId         = (req as any).user?.sub ?? (req as any).user?.id ?? '-';
    const payload        = this.sanitize(req.body);

    const startTime = Date.now();

    return next.handle().pipe(
      tap(() => {
        const duration    = Date.now() - startTime;
        const statusCode  = res.statusCode;
        this.logger.log(
          `${method} ${originalUrl} [${controllerName}.${handlerName}] user:${userId} → ${statusCode} ${this.formatDuration(duration)} | payload:${payload}`,
        );
      }),
      catchError((error) => {
        const duration   = Date.now() - startTime;
        const statusCode = error?.status ?? 500;
        this.logger.error(
          `${method} ${originalUrl} [${controllerName}.${handlerName}] user:${userId} → ${statusCode} ${this.formatDuration(duration)} — ${error?.message} | payload:${payload}`,
        );
        return throwError(() => error);
      }),
    );
  }

  private sanitize(body: unknown): string {
    if (!body || typeof body !== 'object' || Array.isArray(body)) return '-';

    const sanitized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(body as Record<string, unknown>)) {
      sanitized[key] = SENSITIVE_FIELDS.has(key) ? '***' : value;
    }
    return JSON.stringify(sanitized);
  }

  private formatDuration(ms: number): string {
    if (ms < 100)  return `${ms}ms ⚡`;
    if (ms < 500)  return `${ms}ms ✓`;
    if (ms < 1000) return `${ms}ms ⚠`;
    return `${ms}ms 🐌`;
  }
}
