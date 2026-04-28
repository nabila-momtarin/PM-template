// import { Global, Module } from '@nestjs/common';
// import { HttpClientModule } from '../http-client/http-client.module';
// import { BillingClient }      from './billing.client';
// import { NotificationClient } from './notification.client';

// /**
//  * ClientsModule — provides all external service HTTP clients.
//  *
//  * @Global() means you import this once in app.module.ts and then
//  * inject any client directly in any service — no per-module imports needed.
//  *
//  * Adding a new external service:
//  *   1. Create src/infrastructure/clients/your-service.client.ts
//  *      extending BaseClient
//  *   2. Add it to providers[] and exports[] below
//  *   3. Add the service URL to src/config/configuration.ts externalServices
//  *   4. Add the env var to .env.template
//  */
// @Global()
// @Module({
//   imports:   [HttpClientModule],
//   providers: [
//     BillingClient,
//     NotificationClient,
//     // SubscriptionClient,
//     // VbsClient,
//     // MetaClient,
//     // RbacClient,
//   ],
//   exports: [
//     BillingClient,
//     NotificationClient,
//     // SubscriptionClient,
//     // VbsClient,
//     // MetaClient,
//     // RbacClient,
//   ],
// })
// export class ClientsModule {}
