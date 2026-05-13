// export interface DecodedToken {
//   sub: string;
//   roles?: {
//     adminRole?: string;
//     businessRoles?: Array<{
//       businessId: string;
//       role: string;
//     }>;
//   };
//   [key: string]: any;
// }

// export interface RouteContext {
//   url: string;
//   method: string;
//   userId: string;
//   businessId?: string;
// }

// export enum RouteType {
//   ADMIN = 'admin-app',
//   USER = 'user-app',
//   BUSINESS = 'business-app',
// }


export type AuthenticatedUser = {
  userId: string;
  email: string;
  roleId: string;
};