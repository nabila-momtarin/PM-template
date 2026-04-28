// import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
// import { Request, Response, NextFunction } from 'express';

// // Responsibility: log the inbound request with IP (HTTP-layer info not available in interceptors).
// // Outbound logging (status, duration, controller, handler, user) is handled by LoggingInterceptor.
// @Injectable()
// export class LoggingMiddleware implements NestMiddleware {
//   private readonly logger = new Logger('HTTP');

//   use(req: Request, _res: Response, next: NextFunction) {
//     const ip = this.getClientIp(req);
//     this.logger.log(`→ ${req.method} ${req.originalUrl} from ${ip}`);
//     next();
//   }

//   private getClientIp(req: Request): string {
//     const xForwardedFor = req.headers['x-forwarded-for'] as string;
//     if (xForwardedFor) return xForwardedFor.split(',')[0].trim();

//     return (
//       (req.headers['cf-connecting-ip'] as string) ??  // Cloudflare
//       (req.headers['true-client-ip']   as string) ??  // Akamai
//       (req.headers['x-real-ip']        as string) ??
//       req.ip ??
//       req.socket?.remoteAddress ??
//       'unknown'
//     );
//   }
// }
5