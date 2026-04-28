// import { Injectable } from '@nestjs/common';
// import { ConfigService } from '@nestjs/config';
// import { BaseClient } from './base.client';
// import { HttpClientService } from '../http-client/http-client.service';

// // ── Request / Response interfaces ─────────────────────────────────────────────

// export type OtpChannel = 'EMAIL' | 'SMS';

// export interface GenerateOtpRequest {
//   recipient: string;   // mobile number e.g. +8801981504997 or email address
//   channel:   OtpChannel;
// }

// export interface GenerateOtpResponse {
//   verificationId: string;
// }

// export interface VerifyOtpRequest {
//   verificationId: string;
//   code:           string;
// }

// export interface VerifyOtpResponse {
//   success: boolean;
// }

// // ─────────────────────────────────────────────────────────────────────────────

// /**
//  * NotificationClient — typed HTTP client for the Notification microservice.
//  *
//  * Usage:
//  *   constructor(private readonly notificationClient: NotificationClient) {}
//  *
//  *   // Send OTP
//  *   const { verificationId } = await this.notificationClient.generateOtp({
//  *     recipient: '+8801981504997',
//  *     channel:   'SMS',
//  *   });
//  *
//  *   // Verify OTP
//  *   const { success } = await this.notificationClient.verifyOtp({
//  *     verificationId,
//  *     code: '123456',
//  *   });
//  */
// @Injectable()
// export class NotificationClient extends BaseClient {
//   constructor(
//     http:          HttpClientService,
//     configService: ConfigService,
//   ) {
//     super(
//       http,
//       configService.get<string>('externalServices.notification') ?? '',
//       'Notification',
//     );
//   }

//   generateOtp(payload: GenerateOtpRequest): Promise<GenerateOtpResponse> {
//     return this.post<GenerateOtpResponse>('/api/v1/notification-svc/otp/generate', payload);
//   }

//   verifyOtp(payload: VerifyOtpRequest): Promise<VerifyOtpResponse> {
//     return this.post<VerifyOtpResponse>('/api/v1/notification-svc/otp/verify', payload);
//   }
// }
