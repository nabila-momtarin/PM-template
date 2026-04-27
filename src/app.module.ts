import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { envValidationSchema } from './config/env.validation';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { LoggerModule } from './common/logger/logger.module';
import { LoggingMiddleware } from './common/middleware/logging.middleware';
import configuration from './config/configuration';
import { MetricsModule } from './infrastructure/metrics/metrics.module';
import { MetricsMiddleware } from './infrastructure/metrics/metrics.middleware';
import { AuthModule } from './infrastructure/auth/auth.module';
import { ClientsModule } from './infrastructure/clients/clients.module';
import { DatabaseModule } from './infrastructure/database/database.module';
import { HttpClientModule } from './infrastructure/http-client/http-client.module';
import { KafkaModule } from './infrastructure/kafka/kafka.module';
import { RedisModule } from './infrastructure/redis/redis.module';

// ─── Feature Modules ────────────────────────────────────────────────────────
import { UserModule } from './modules/user/user.module'; // ← requires DatabaseModule
import { BusinessModule } from './modules/business/business.module'; // ← requires DatabaseModule
import { EnrolledBusinessModule } from './modules/enrolled-business/enrolled-business.module'; // ← requires DatabaseModule

@Module({
  imports: [
    // ── Configuration ──────────────────────────────────────────────────────
    ConfigModule.forRoot({
      load: [configuration],
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
      cache: true,
      validationSchema: envValidationSchema,
      validationOptions: { abortEarly: false },
    }),

    // // ── Logger ─────────────────────────────────────────────────────────────
    // LoggerModule,

    // // ── Metrics ────────────────────────────────────────────────────────────
    // MetricsModule,

    // ── Infrastructure ─────────────────────────────────────────────────────
    AuthModule,
    DatabaseModule, // ← uncomment when DB is available
    HttpClientModule,
    // KafkaModule,
    // RedisModule,
    // ClientsModule,

    // ── Feature Modules ────────────────────────────────────────────────────
    // Add new feature modules here following the UserModule pattern.
    UserModule, // ← requires DatabaseModule
    BusinessModule, // ← requires DatabaseModule
    EnrolledBusinessModule, // ← requires DatabaseModule
  ],
  controllers: [AppController],
  providers: [
    AppService,

    // ── Global Exception Filter ─────────────────────────────────────────────
    // Registered via DI so it can inject services (e.g. Logger) in the future.
    { provide: APP_FILTER, useClass: HttpExceptionFilter },

    // ── Global Interceptors ─────────────────────────────────────────────────
    // Order: logging runs first (wraps the full handler), response wrapping runs inside it.
    { provide: APP_INTERCEPTOR, useClass: LoggingInterceptor },
    { provide: APP_INTERCEPTOR, useClass: ResponseInterceptor },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(LoggingMiddleware, MetricsMiddleware).forRoutes('*');
  }
}
