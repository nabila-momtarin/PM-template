import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { ApiKeyGuard } from './guards/api-key.guard';
import { TokenService } from './services/token.service';
import { RouteClassifierService } from './services/route-classifier.service';
import { AuthHandlerRegistry } from './services/auth-handler.registry';
import { AdminAuthHandler } from './handlers/admin-auth.handler';
import { UserAuthHandler } from './handlers/user-auth.handler';
import { BusinessAuthHandler } from './handlers/business-auth.handler';
import { RbacPermissionService } from './services/rbac-permission.service';

@Module({
  imports: [
    JwtModule.registerAsync({
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('jwt.secret'),
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [
    JwtAuthGuard,
    ApiKeyGuard,

    // Services
    TokenService,
    RouteClassifierService,
    AuthHandlerRegistry,
    RbacPermissionService,

    // Handlers
    AdminAuthHandler,
    UserAuthHandler,
    BusinessAuthHandler,

    // Registry setup
    {
      provide: 'AUTH_HANDLER_SETUP',
      useFactory: (
        registry: AuthHandlerRegistry,
        adminHandler: AdminAuthHandler,
        userHandler: UserAuthHandler,
        businessHandler: BusinessAuthHandler,
      ) => {
        registry.register(adminHandler);
        registry.register(userHandler);
        registry.register(businessHandler);
        return registry;
      },

      inject: [
        AuthHandlerRegistry,
        AdminAuthHandler,
        UserAuthHandler,
        BusinessAuthHandler,
      ],
    },
  ],
  exports: [
    JwtAuthGuard,
    ApiKeyGuard,
    JwtModule,
    TokenService, // Export TokenService
    RouteClassifierService, // Export RouteClassifierService
    AuthHandlerRegistry, // Export AuthHandlerRegistry
  ],
})
export class AuthModule {}
