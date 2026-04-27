import { INestApplication, ValidationPipe } from '@nestjs/common';
import { TrimPipe } from '../common/pipes';

export function setupPipes(app: INestApplication): void {
  // TrimPipe must run BEFORE ValidationPipe so strings are trimmed
  // before class-validator runs (prevents " admin " passing @IsEmail etc.)
  app.useGlobalPipes(
    new TrimPipe(),
    new ValidationPipe({
      whitelist:              true,
      forbidNonWhitelisted:   true,
      transform:              true,
      transformOptions:       { enableImplicitConversion: true },
      disableErrorMessages:   process.env.NODE_ENV === 'production',
    }),
  );
}
