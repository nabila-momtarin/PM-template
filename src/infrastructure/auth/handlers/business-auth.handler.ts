import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthHandler } from './auth-handler.interface';
import { DecodedToken, RouteContext, RouteType } from '../types/auth.types';
import { RbacPermissionService } from '../services/rbac-permission.service';

@Injectable()
export class BusinessAuthHandler implements AuthHandler {
  private readonly rbacEnabled: boolean;

  constructor(
    private rbacPermissionService: RbacPermissionService,
    private configService: ConfigService,
  ) {
    this.rbacEnabled = this.configService.get('rbac.enabled') === true;
  }

  canHandle(routeType: RouteType): boolean {
    return routeType === RouteType.BUSINESS;
  }

  async handle(context: RouteContext, decoded: DecodedToken): Promise<boolean> {
    // 1. Required: Check x-businessId header

    if (!context.businessId) {
      throw new BadRequestException(`x-businessId header is required for business routes`);
    }

    console.log(`BusinessId from header: ${context.businessId}`);
    console.log(`User roles: ${decoded.roles}`);

    // 2. Find role for this specific business
    const businessInfo = decoded?.roles?.businessRoles?.find(
      (role) => role?.businessId === context?.businessId,
    );

    if (!businessInfo?.role) {
      throw new ForbiddenException(`User has no role for business ${context.businessId}`);
    }

    // 3. Check RBAC permissions for this business role
    const hasPermission = this.rbacEnabled
      ? await this.rbacPermissionService.hasPermission({
          roles: [businessInfo.role],
          endpoint: context.url,
          method: context.method,
        })
      : true;

    console.log(`Business Route Access: ${hasPermission} for role ${businessInfo.role}`);
    return hasPermission;
  }
}
