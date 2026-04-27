import { ConfigService } from '@nestjs/config';
import { MongooseModuleOptions } from '@nestjs/mongoose';

export const getDatabaseConfig = (configService: ConfigService): MongooseModuleOptions => {
  console.log(configService, 'configService');

  return {
    uri: configService.get<string>('DATABASE_URL'),
    maxPoolSize: 10,  //MongoDB driver একসাথে max 10টা connection maintain করতে পারবে।
    serverSelectionTimeoutMS: 5000,
    // socketTimeoutMS: 45000,
  };
};


// More pool size = বেশি concurrent DB operation handle করতে পারে
// Too high = DB/server resource বেশি খায়