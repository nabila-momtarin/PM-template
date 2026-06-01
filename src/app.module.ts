import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { envValidationSchema } from './config/env.validation';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import configuration from './config/configuration';
import { DatabaseModule } from './infrastructure/database/database.module';

// ─── Feature Modules ────────────────────────────────────────────────────────
import { ProjectModule } from './modules/project/project.module';
import { PermissionModule } from './modules/permission/permission.module';
import { RoleModule } from './modules/role/role.module';
import { UserModule } from './modules/user/user.module';
import { AuthModule } from './modules/auth/auth.module';
import { JwtAuthGuard } from './infrastructure/auth/guards/jwt-auth.guard';
import { AuthInfrastructureModule } from './infrastructure/auth/auth-infrastructure.module';
import { TicketModule } from './modules/ticket/ticket.module';
import { TaskModule } from './modules/task/task.module';
import { SeedModule } from './modules/seed/service/seed.module';


@Module({
  imports: [
    // ── Configuration ──────────────────────────────────────────────────────
    ConfigModule.forRoot({
      load: [configuration],
      isGlobal: true,
      // envFilePath: ['.env.local', '.env'],
      // cache: true,
      validationSchema: envValidationSchema,
      // validationOptions: { abortEarly: false },
    }),

    // ── Infrastructure ─────────────────────────────────────────────────────
    // AuthModule,
    DatabaseModule, // ← uncomment when DB is available

    // ── Feature Modules ────────────────────────────────────────────────────
    // Add new feature modules here following the UserModule pattern.
    // UserModule, // ← requires DatabaseModule
    PermissionModule,
    RoleModule,
    UserModule,
    ProjectModule,
    AuthModule,
    AuthInfrastructureModule,
    TicketModule,
    TaskModule,
    SeedModule,

  ],
  controllers: [AppController],
  providers: [
    AppService,

    // ── Global Exception Filter ─────────────────────────────────────────────
    // Registered via DI so it can inject services (e.g. Logger) in the future.
    // { provide: APP_FILTER, useClass: HttpExceptionFilter },

    // ── Global Interceptors ─────────────────────────────────────────────────
    // Order: logging runs first (wraps the full handler), response wrapping runs inside it.
    // { provide: APP_INTERCEPTOR, useClass: LoggingInterceptor },
    { provide: APP_INTERCEPTOR, useClass: ResponseInterceptor, },
    { provide: APP_GUARD, useClass: JwtAuthGuard, },
  ],
})
// export class AppModule implements NestModule {
//   configure(consumer: MiddlewareConsumer) {
//     consumer.apply(LoggingMiddleware, MetricsMiddleware).forRoutes('*');
//   }
// }

export class AppModule { }