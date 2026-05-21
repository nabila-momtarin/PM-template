import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { setupCompression } from './setup/compression.setup';
import { setupPipes } from './setup/pipes.setup';
import { setupSecurity } from './setup/security.setup';
import { setupSwagger } from './setup/swagger.setup';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import * as express from 'express';
import { join } from 'path';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  try {
    const app = await NestFactory.create(AppModule);

    const configService = app.get(ConfigService);

    setupSecurity(app, configService);
    setupCompression(app);
    setupPipes(app);
    setupSwagger(app, configService);

    // All routes follow the pattern: api/v1/{controller-path}/...
    // Swagger /docs, /health, and /metrics are excluded so they stay at root level.
    app.setGlobalPrefix('api/v1', { exclude: ['docs', 'docs/(.*)', 'health', 'metrics'] });

    const port = configService.get<number>('port')!;
    // const nodeEnv         = configService.get<string>('NODE_ENV');
    // const swaggerEnabled  = configService.get<string>('SWAGGER_ENABLED') === 'true';

    await app.listen(port);
    console.log(`\n\nServer running on http://localhost:${port}/api/v1\n\n`);

    app.use('/uploads', express.static(join(process.cwd(), 'uploads')));
    // logger.log(`Application running on: http://localhost:${port}`);
    // logger.log(`Environment: ${nodeEnv}`);
    // if (swaggerEnabled) logger.log(`Swagger docs:   http://localhost:${port}/docs`);
    // logger.log(`Metrics:        http://localhost:${port}/metrics`);
  } catch (error) {
    // logger.error('Error starting application', error);
    process.exit(1);
  }
}

bootstrap();
