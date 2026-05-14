import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AuthenticatedUser } from 'src/infrastructure/auth/types/auth.types';


export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthenticatedUser => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);





/**
 * Extracts the authenticated user (or a specific property of it) from the request.
 * Populated by JwtAuthGuard after token validation.
 *
 * Usage:
 *   @CurrentUser()              → full user object
 *   @CurrentUser('sub')         → user.sub  (user ID)
 *   @CurrentUser('roles')       → user.roles
 */
/* export const CurrentUser = createParamDecorator(
  (field: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;
    return field ? user?.[field] : user;
  },
);
 */