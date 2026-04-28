// import { Injectable } from '@nestjs/common';
// import { AuthHandler } from '../handlers/auth-handler.interface';
// import { RouteType } from '../types/auth.types';

// @Injectable()
// export class AuthHandlerRegistry {
//   private handlers: AuthHandler[] = [];

//   register(handler: AuthHandler) {
//     this.handlers.push(handler);
//   }

//   getHandler(routeType: RouteType): AuthHandler | null {
//     return (
//       this.handlers.find((handler) => handler.canHandle(routeType)) || null
//     );
//   }
// }
