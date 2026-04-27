import { Injectable } from '@nestjs/common';
import { DecodedToken, RouteContext, RouteType } from '../types/auth.types';
import { AuthHandler } from './auth-handler.interface';

@Injectable()
export class UserAuthHandler implements AuthHandler {
  canHandle(routeType: RouteType): boolean {
    return routeType === RouteType.USER;
  }

  async handle(context: RouteContext, decoded: DecodedToken): Promise<boolean> {
    console.log(`User Route Access: Granted for userId ${context.userId}`);

    return true;
  }
}
