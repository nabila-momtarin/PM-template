import { DecodedToken, RouteContext, RouteType } from '../types/auth.types';

export interface AuthHandler {
  canHandle(routeType: RouteType): boolean;
  handle(context: RouteContext, decoded: DecodedToken): Promise<boolean>;
}
