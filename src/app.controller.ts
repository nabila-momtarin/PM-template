import { Controller, Delete, Get, Inject, InternalServerErrorException, NotFoundException, Param, Post } from '@nestjs/common';
// import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
// import { Logger } from 'winston';
import { AppService } from './app.service';
// import { RedisService } from './infrastructure/redis/redis.service';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    // private readonly redisService: RedisService,
    // @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
  ) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('health')
  health() {
    return {
      status:    'ok',
      timestamp: new Date().toISOString(),
      uptime:    process.uptime(),
    };
  }

  // ── Log Test Endpoints ───────────────────────────────────────────────────
  // Hit these to verify Winston is working. Remove before production.

  // @Get('test/log/info')
  // testInfo() {
  //   this.logger.info('Info log test', { context: 'AppController', userId: 'test-user-1' });
  //   return { level: 'info', message: 'Info log emitted' };
  // }

  // @Get('test/log/warn')
  // testWarn() {
  //   this.logger.warn('Warn log test', { context: 'AppController', reason: 'high memory usage' });
  //   return { level: 'warn', message: 'Warn log emitted' };
  // }

  // @Get('test/log/error')
  // testError() {
  //   const err = new Error('Something went wrong');
  //   this.logger.error('Error log test', {
  //     context:    'AppController',
  //     message:    err.message,
  //     stack:      err.stack,
  //     userId:     'test-user-2',
  //   });
  //   return { level: 'error', message: 'Error log emitted' };
  // }

  // @Get('test/log/http-exception')
  // testHttpException() {
  //   // triggers the global AllExceptionsFilter → logs via Winston automatically
  //   throw new NotFoundException('Resource not found — filter log test');
  // }

  // @Get('test/log/unhandled')
  // testUnhandled() {
  //   // triggers the global AllExceptionsFilter with a plain Error
  //   throw new InternalServerErrorException('Unhandled crash — filter log test');
  // }

  // // ── Redis test endpoints ────────────────────────────────────────────────────
  // // Verify Redis is working. Remove before production.

  // @Post('test/cache/:key')
  // async cacheSet(@Param('key') key: string) {
  //   await this.redisService.set(`test:${key}`, { key, cachedAt: new Date().toISOString() }, 60);
  //   const value = await this.redisService.get(`test:${key}`);
  //   return { message: 'Cached successfully', key: `test:${key}`, value };
  // }

  // @Delete('test/cache/:key')
  // async cacheDel(@Param('key') key: string) {
  //   const before = await this.redisService.get(`test:${key}`);
  //   await this.redisService.del(`test:${key}`);
  //   const after = await this.redisService.get(`test:${key}`);
  //   return { message: 'Deleted successfully', key: `test:${key}`, before, after };
  // }
}
