import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { getDatabaseConfig } from 'src/config/db.config';

@Module({
  imports: [
    MongooseModule.forRootAsync({
      useFactory: getDatabaseConfig,
      inject: [ConfigService],
    }),
  ],
})
export class DatabaseModule {}
