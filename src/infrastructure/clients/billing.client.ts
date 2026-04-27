import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BaseClient } from './base.client';
import { HttpClientService } from '../http-client/http-client.service';

export interface Invoice {
  id:        string;
  userId:    string;
  amount:    number;
  currency:  string;
  status:    'pending' | 'paid' | 'cancelled';
  createdAt: string;
}

/**
 * BillingClient — typed HTTP client for the Billing microservice.
 *
 * Usage:
 *   constructor(private readonly billingClient: BillingClient) {}
 *
 *   const invoice = await this.billingClient.getInvoice(id);
 */
@Injectable()
export class BillingClient extends BaseClient {
  constructor(
    http:          HttpClientService,
    configService: ConfigService,
  ) {
    super(
      http,
      configService.get<string>('externalServices.billing') ?? '',
      'Billing',
    );
  }

  getInvoice(id: string): Promise<Invoice> {
    return this.get<Invoice>(`/invoices/${id}`);
  }

  getUserInvoices(userId: string): Promise<Invoice[]> {
    return this.get<Invoice[]>(`/invoices`, { params: { userId } });
  }
}
