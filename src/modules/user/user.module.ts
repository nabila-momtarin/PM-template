import { forwardRef, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from './entities/user.schema';

import { AdminController } from './controllers/admin.controller';
import { RoleModule } from '../role/role.module';
import { UserRepository } from './repositroy/user.repository';
import { UserService } from './service/admin.service';
import { MyService } from './service/me.service';
import { MyController } from './controllers/me.controller';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]), 
    forwardRef(() => RoleModule),
],
  controllers: [AdminController, MyController],
  providers: [UserRepository, UserService, MyService],
  exports: [UserRepository],
})
export class UserModule {}
