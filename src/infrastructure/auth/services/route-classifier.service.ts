// import { Injectable } from '@nestjs/common';
// import { RouteType } from '../types/auth.types';

// @Injectable()
// export class RouteClassifierService {
//   classifyRoute(url: string): RouteType | null {
//     const routeMap = {
//       [RouteType.ADMIN]: 'admin-app',
//       [RouteType.USER]: 'user-app',
//       [RouteType.BUSINESS]: 'business-app',
//     };

//     for (const [type, pattern] of Object.entries(routeMap)) {
//       if (url.includes(pattern)) {
//         return type as RouteType;
//       }
//     }
//     return null;
//   }
// }
