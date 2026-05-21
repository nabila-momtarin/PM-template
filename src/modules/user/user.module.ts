import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from './entities/user.schema';

import { AdminController } from './controllers/admin.controller';
import { RoleModule } from '../role/role.module';
import { UserRepository } from './repositroy/user.repository';
import { UserService } from './service/admin.service';

@Module({
  imports: [MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]), RoleModule],
  controllers: [AdminController],
  providers: [UserRepository, UserService],
  exports: [UserRepository],
})
export class UserModule {}
