// src/common/logger/logger.module.ts
import { Global, Module } from '@nestjs/common';
import { WinstonModule } from 'nest-winston';
import { createWinstonConfig } from './winston.config';

@Global()
@Module({
  imports: [WinstonModule.forRootAsync({ useFactory: createWinstonConfig })],
  exports: [WinstonModule],
})
export class LoggerModule {}
