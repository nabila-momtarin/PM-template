// import {
//   CanActivate,
//   ExecutionContext,
//   Injectable,
//   UnauthorizedException,
// } from '@nestjs/common';
// import { ConfigService } from '@nestjs/config';
// import { JwtService } from '@nestjs/jwt';
// import { Request } from 'express';
// import { AuthHandlerRegistry } from '../services/auth-handler.registry';
// import { TokenService } from '../services/token.service';
// import { RouteContext } from '../types/auth.types';
// import { RouteClassifierService } from '../services/route-classifier.service';

// @Injectable()
// export class JwtAuthGuard implements CanActivate {
//   constructor(
//     private jwtService: JwtService,
//     private configService: ConfigService,
//     private tokenService: TokenService,
//     private handleRegistry: AuthHandlerRegistry,
//     private routeClassifier: RouteClassifierService,
//   ) {}

//   async canActivate(context: ExecutionContext): Promise<boolean> {
//     const request: Request = context.switchToHttp().getRequest();
//     const { authorization } = request.headers;

//     // 1. Validate and decode token
//     const decoded = this.tokenService.validateAndDecode(authorization);

//     console.log(decoded, 'decoded');

//     // 2. Set decoded token on request (used by @CurrentUser() decorator)
//     (request as any).user = decoded;
//     (request as any).userId = decoded.sub;

//     // 3. Create route context
//     const routeContext: RouteContext = {
//       url: request.url,
//       method: request.method,
//       userId: decoded.sub,
//       businessId: request.headers['x-businessid'] as string,
//     };

//     // 4. classify route type
//     const routeType = this.routeClassifier.classifyRoute(request.url);

//     if (!routeType) {
//       return false;
//     }

//     // 5. Get appropriate handler
//     const handler = this.handleRegistry.getHandler(routeType);

//     if (!handler) {
//       return false;
//     }

//     // 6. Execute handler
//     return await handler.handle(routeContext, decoded);
//   }
// }
