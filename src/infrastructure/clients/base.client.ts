import { NotFoundException } from '@nestjs/common';
import { HttpClientService, ApiRequestOptions } from '../http-client/http-client.service';

/**
 * BaseClient — abstract base for all external service HTTP clients.
 *
 * Every service client extends this and gets:
 *   - baseUrl pre-configured from ConfigService
 *   - serviceName automatically injected into error messages
 *   - Typed get/post/put/patch/delete helpers
 *   - Automatic 404 → NotFoundException mapping via mapError
 *
 * Extending:
 *   @Injectable()
 *   export class BillingClient extends BaseClient {
 *     constructor(http: HttpClientService, configService: ConfigService) {
 *       super(http, configService.get('externalServices.billing'), 'Billing');
 *     }
 *
 *     async getInvoice(id: string): Promise<Invoice> {
 *       return this.get<Invoice>(`/invoices/${id}`);
 *     }
 *   }
 */
export abstract class BaseClient {
  constructor(
    private readonly http: HttpClientService,
    protected readonly baseUrl: string,
    protected readonly serviceName: string,
  ) {}

  /**
   * Maps upstream HTTP errors to appropriate NestJS exceptions.
   * Only 404 is remapped — all other errors stay as 502 BadGateway
   * because they indicate transport/config failures, not resource state.
   * Override in subclasses for service-specific mappings.
   */
  protected mapError(error: any): never {
    if (error?.response?.upstreamStatus === 404) {
      throw new NotFoundException(error?.response?.message ?? 'Resource not found');
    }
    throw error;
  }

  protected async get<T>(path: string, options?: ApiRequestOptions): Promise<T> {
    try {
      return await this.http.get<T>(`${this.baseUrl}${path}`, {
        ...options,
        serviceName: this.serviceName,
      });
    } catch (error) {
      return this.mapError(error);
    }
  }

  protected async post<T>(path: string, data?: unknown, options?: ApiRequestOptions): Promise<T> {
    try {
      return await this.http.post<T>(`${this.baseUrl}${path}`, data, {
        ...options,
        serviceName: this.serviceName,
      });
    } catch (error) {
      return this.mapError(error);
    }
  }

  protected async put<T>(path: string, data?: unknown, options?: ApiRequestOptions): Promise<T> {
    try {
      return await this.http.put<T>(`${this.baseUrl}${path}`, data, {
        ...options,
        serviceName: this.serviceName,
      });
    } catch (error) {
      return this.mapError(error);
    }
  }

  protected async patch<T>(path: string, data?: unknown, options?: ApiRequestOptions): Promise<T> {
    try {
      return await this.http.patch<T>(`${this.baseUrl}${path}`, data, {
        ...options,
        serviceName: this.serviceName,
      });
    } catch (error) {
      return this.mapError(error);
    }
  }

  protected async delete<T>(path: string, options?: ApiRequestOptions): Promise<T> {
    try {
      return await this.http.delete<T>(`${this.baseUrl}${path}`, {
        ...options,
        serviceName: this.serviceName,
      });
    } catch (error) {
      return this.mapError(error);
    }
  }
}
