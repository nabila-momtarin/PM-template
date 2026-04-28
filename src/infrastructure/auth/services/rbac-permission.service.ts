// import { Injectable } from '@nestjs/common';
// import { ConfigService } from '@nestjs/config';
// import { HttpClientService } from '../../http-client/http-client.service';

// @Injectable()
// export class RbacPermissionService {
//   constructor(
//     private readonly httpClient: HttpClientService,
//     private readonly configService: ConfigService,
//   ) {}

//   async hasPermission({ roles, endpoint, method }) {
//     const url = `${this.configService.get('externalServices.rbac')}/rbac/check-permissions`;
//     console.log('url', url);
//     const res = await this.httpClient.post(
//       url,
//       { roles, endpoint, method },
//       { serviceName: 'RBAC' },
//     );

//     console.log('res', res);

//     if (!res.data.hasPermission) {
//       return false;
//     }

//     return true;
//   }
// }
