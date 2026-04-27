import { HttpService } from '@nestjs/axios';
import { BadGatewayException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AxiosRequestConfig } from 'axios';
import { catchError, firstValueFrom, retry, throwError, timer, timeout } from 'rxjs';

export interface ApiRequestOptions {
  headers?: Record<string, string>;
  params?: Record<string, any>;
  timeout?: number;
  retries?: number;
  serviceName?: string;
}

@Injectable()
export class HttpClientService {
  private readonly httpLogger = new Logger(HttpClientService.name);

  constructor(
    protected readonly httpService: HttpService,
    protected readonly configService: ConfigService,
  ) {}

  async request<T = any>(
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
    url: string,
    data?: any,
    options: ApiRequestOptions = {},
  ): Promise<T> {
    const { retries = 3, timeout: requestTimeout = 30000, ...otherOptions } = options;

    const config: AxiosRequestConfig = {
      method,
      url,
      data,
      headers: otherOptions.headers || {},
      params: otherOptions.params || {},
      timeout: requestTimeout,
    };

    try {
      this.httpLogger.log(`Making ${method} request to ${url}`);

      const response = await firstValueFrom(
        this.httpService.request<T>(config).pipe(
          timeout(requestTimeout),
          retry({
            count: retries,
            delay: (error) => {
              const status = error?.response?.status;
              // Only retry on network errors (no status) or 5xx — never retry 4xx
              if (status && status < 500) return throwError(() => error);
              return timer(1000);
            },
          }),
          catchError((error) => {
            this.httpLogger.error(`${method} request to ${url} failed: ${error.message}`);
            throw error;
          }),
        ),
      );

      this.httpLogger.log(`${method} request to ${url} completed successfully`);
      return response.data;
    } catch (err) {
      const error = err as any;
      // The raw message coming from the downstream service (or network error).
      const downstreamMessage: string =
        error?.response?.data?.message ?? error.message ?? 'Unknown error';

      // message  → UI-safe, shown to the end user as-is.
      // error    → debug context for logs / developer tools.
      const userMessage   = downstreamMessage;
      const debugContext  = options.serviceName
        ? `${options.serviceName} service failed due to: ${downstreamMessage}`
        : downstreamMessage;

      this.httpLogger.error(debugContext, error?.stack);

      throw new BadGatewayException({ message: userMessage, error: debugContext, upstreamStatus: error?.response?.status });
    }
  }

  async get<T = any>(url: string, options?: ApiRequestOptions): Promise<T> {
    return this.request<T>('GET', url, undefined, options);
  }

  async post<T = any>(url: string, data?: any, options?: ApiRequestOptions): Promise<T> {
    return this.request<T>('POST', url, data, options);
  }

  async put<T = any>(url: string, data?: any, options?: ApiRequestOptions): Promise<T> {
    return this.request<T>('PUT', url, data, options);
  }

  async patch<T = any>(url: string, data?: any, options?: ApiRequestOptions): Promise<T> {
    return this.request<T>('PATCH', url, data, options);
  }

  async delete<T = any>(url: string, options?: ApiRequestOptions): Promise<T> {
    return this.request<T>('DELETE', url, undefined, options);
  }
}
