import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';

// Rate limiting — uncomment + install express-rate-limit to enable
// import rateLimit from 'express-rate-limit';

export function setupSecurity(app: INestApplication, configService: ConfigService): void {
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc:   ["'self'", "'unsafe-inline'"],
          scriptSrc:  ["'self'"],
          imgSrc:     ["'self'", 'data:', 'https:'],
        },
      },
      crossOriginEmbedderPolicy: false,
    }),
  );

  const corsOrigin = configService.get<string>('CORS_ORIGIN') || '*';
  app.enableCors({
    origin:         corsOrigin,
    credentials:    true,
    methods:        ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'x-businessid'],
  });

  // const rateLimitWindowMs = configService.get<number>('RATE_LIMIT_WINDOW_MS') || 15 * 60 * 1000;
  // const rateLimitMax      = configService.get<number>('RATE_LIMIT_MAX') || 100;
  // app.use(
  //   rateLimit({
  //     windowMs:        Number(rateLimitWindowMs),
  //     max:             Number(rateLimitMax),
  //     message:         'Too many requests from this IP, please try again later.',
  //     standardHeaders: true,
  //     legacyHeaders:   false,
  //   }),
  // );
}
