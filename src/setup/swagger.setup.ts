import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

export function setupSwagger(app: INestApplication, configService: ConfigService): void {
  if (configService.get<string>('SWAGGER_ENABLED') !== 'true') return;

  const config = new DocumentBuilder()
    .setTitle('Template Service API')
    .setDescription('NestJS template — MongoDB · Kafka · Redis · JWT · Swagger')
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('Users')
    .build();

  SwaggerModule.setup('docs', app, SwaggerModule.createDocument(app, config));
}
