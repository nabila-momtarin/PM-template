import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  StreamableFile,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiResponse } from '../types/response.types';

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, ApiResponse<T> | StreamableFile> {
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<ApiResponse<T> | StreamableFile> {
    const req = context.switchToHttp().getRequest();

    // Prometheus scraper expects plain text — skip JSON wrapping
    if (req.url?.startsWith('/metrics')) return next.handle();

    return next.handle().pipe(
      map((data: T) => {
        // File downloads — never wrap, pass through as-is
        if (data instanceof StreamableFile) return data;

        // Already formatted by the controller (has success flag)
        // e.g. return { success: true, message: 'User created', data: user, pagination }
        if (data !== null && typeof data === 'object' && 'success' in data) {
          return data as ApiResponse<T>;
        }

        // Plain return — wrap it
        // e.g. return user  →  { success: true, data: user }
        return { success: true as const, ...data };
      }),
    );
  }
}
