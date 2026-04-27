import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthHandler } from './auth-handler.interface';
import { DecodedToken, RouteContext, RouteType } from '../types/auth.types';
import { RbacPermissionService } from '../services/rbac-permission.service';

@Injectable()
export class AdminAuthHandler implements AuthHandler {
  private readonly rbacEnabled: boolean;

  constructor(
    private readonly rbacPermissionService: RbacPermissionService,
    private readonly configService: ConfigService,
  ) {
    this.rbacEnabled = this.configService.get('rbac.enabled') === true;
  }

  canHandle(routeType: RouteType): boolean {
    return routeType === RouteType.ADMIN;
  }

  async handle(context: RouteContext, decoded: DecodedToken): Promise<boolean> {
    const adminRole = decoded.roles?.adminRole;

    if (!adminRole) {
      return false;
    }

    const hasPermission = this.rbacEnabled
      ? await this.rbacPermissionService
          .hasPermission({
            roles: [adminRole],
            endpoint: context.url,
            method: context.method,
          })
          .catch(() => false)
      : true;

    console.log(`Admin Route Access: ${hasPermission} for role ${adminRole}`);

    return hasPermission;
  }
}
