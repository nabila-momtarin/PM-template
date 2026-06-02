// import { CanActivate,  ExecutionContext, ForbiddenException,  Inject, Injectable, Logger,
// } from '@nestjs/common';
// import { Reflector } from '@nestjs/core';
// import { CACHE_MANAGER } from '@nestjs/cache-manager';
// import { Cache } from 'cache-manager';
// import { InjectModel } from '@nestjs/mongoose';
// import { Model } from 'mongoose';
// import { Role, RoleDocument } from 'src/modules/role/entities/role.schema';
// import { IS_PUBLIC } from '../decorators/public.decorator';

// const API_PREFIX = '/api/v1';   // must match the global prefix in main.ts

// @Injectable()
// export class RbacGuard implements CanActivate {
//   private readonly logger = new Logger(RbacGuard.name);

//   constructor(
//     private readonly reflector: Reflector,
//     @Inject(CACHE_MANAGER) private cacheManager: Cache,
//     @InjectModel(Role.name) private readonly roleModel: Model<RoleDocument>,
//   ) {}

//   async canActivate(context: ExecutionContext): Promise<boolean> {
//     // Skip RBAC check for public routes (@Public() decorator)
//     const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, [
//       context.getHandler(),
//       context.getClass(),
//     ]);
//     if (isPublic) return true;

//     const request = context.switchToHttp().getRequest();
//     const user = request.user;

//     // Fetch role from cache, fall back to database
//     const cacheKey = `role:${user.roleId}`;
//     let role = await this.cacheManager.get<RoleDocument>(cacheKey) ?? undefined;

//     if (!role) {
//       this.logger.debug(`Cache miss for ${cacheKey}, querying DB`);
//       role = await this.roleModel
//         .findOne({ _id: user.roleId, isDeleted: false })
//         .lean()
//         .exec() ?? undefined;

//       if (!role) {
//         this.logger.warn(`Role not found or deleted: ${user.roleId}`);
//         throw new ForbiddenException('Your role no longer exists. Please contact an administrator.');
//       }

//       // Store in cache for next request (TTL set in CacheModule.register)
//       await this.cacheManager.set(cacheKey, role);
//     }

//     // Super Admin bypass — no permission check needed
//     if (role.isSuperAdmin) {
//       this.logger.debug(`Super Admin bypass for user ${user.userId}`);
//       return true;
//     }

//     // Build the full path with API prefix (e.g. "/api/v1/users/:id")
//     const method: string = request.method;
//     const routePath: string = request.route?.path ?? '';
//     const fullPath = `${API_PREFIX}${routePath}`;

//     // Check if the role's permissions include this method + path
//     const hasPermission = role.permissions.some(
//       (p) => p.method === method && p.path === fullPath,
//     );

//     if (!hasPermission) {
//       this.logger.warn(
//         `Access denied: role=${role.roleName}, ${method} ${fullPath}`,
//       );
//       throw new ForbiddenException('You do not have permission to perform this action.');
//     }

//     return true;
//   }
// }

import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Role, RoleDocument } from 'src/modules/role/entities/role.schema';
import { IS_PUBLIC } from '../decorators/public.decorator';
import { SKIP_RBAC } from '../decorators/skip-rbac.decorator';

// const API_PREFIX = '/api/v1';   // must match the global prefix in main.ts

@Injectable()
export class RbacGuard implements CanActivate {
  private readonly logger = new Logger(RbacGuard.name);

  constructor(
    private readonly reflector: Reflector,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    @InjectModel(Role.name) private readonly roleModel: Model<RoleDocument>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Skip RBAC check for public routes (@Public() decorator)
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    // Skip RBAC check(But check JWT)for routes marked with @SkipRbac() decorator
    const skipRbac = this.reflector.getAllAndOverride<boolean>(SKIP_RBAC, [
  context.getHandler(),
  context.getClass(),
]);

if (skipRbac) return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    console.log('>>> RBAC user:', user);
    console.log('>>> RBAC roleId:', user?.roleId);

    // Fetch role from cache, fall back to database
    const cacheKey = `role:${user.roleId}`;
    let role: any = await this.cacheManager.get<RoleDocument>(cacheKey);

    console.log('>>> RBAC role from cache:', role);

    if (!role) {
      this.logger.debug(`Cache miss for ${cacheKey}, querying DB`);
      role = await this.roleModel.findOne({ _id: user.roleId, isDeleted: false }).lean().exec();

      if (!role) {
        this.logger.warn(`Role not found or deleted: ${user.roleId}`);
        throw new ForbiddenException(
          'Your role no longer exists. Please contact an administrator.',
        );
      }

      console.log('>>> RBAC role from DB:', role);
      // Store in cache for next request (TTL set in CacheModule.register)
      await this.cacheManager.set(cacheKey, role);
    }

    // Super Admin bypass — no permission check needed
    if (role.isSuperAdmin) {
      this.logger.debug(`Super Admin bypass for user ${user.userId}`);
      return true;
    }

    // Build the full path with API prefix (e.g. "/api/v1/users/:id")
    const method: string = request.method;
    const routePath: string = request.route?.path ?? '';
    // const fullPath = `${API_PREFIX}${routePath}`;
    const fullPath = routePath;
    // Check if the role's permissions include this method + path
    const hasPermission = role.permissions.some((p) => p.method === method && p.path === fullPath);

    if (!hasPermission) {
      this.logger.warn(`Access denied: role=${role.roleName}, ${method} ${fullPath}`);
      throw new ForbiddenException('You do not have permission to perform this action.');
    }

    return true;
  }
}
