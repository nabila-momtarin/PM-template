// import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
// import { ConfigService } from '@nestjs/config';
// import { Request } from 'express';

// /**
//  * ApiKeyGuard — validates the `x-api-key` header for internal server-to-server routes.
//  *
//  * Usage:
//  *   @UseGuards(ApiKeyGuard)
//  *   @Get('internal/some-endpoint')
//  *   getData() { ... }
//  */
// @Injectable()
// export class ApiKeyGuard implements CanActivate {
//   private readonly apiKey: string;

//   constructor(private readonly configService: ConfigService) {
//     this.apiKey = this.configService.get<string>('INTERNAL_API_KEY') ?? '';
//   }

//   canActivate(context: ExecutionContext): boolean {
//     const request: Request = context.switchToHttp().getRequest();
//     const key = request.headers['x-api-key'];

//     if (!key || key !== this.apiKey) {
//       throw new UnauthorizedException('Invalid or missing x-api-key');
//     }

//     return true;
//   }
// }
