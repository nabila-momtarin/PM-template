import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from './entities/user.schema';
import { UserRepository } from './user.repository';
import { UserService } from './admin.service';
import { AdminController } from './http-controllers/admin/admin.controller';
import { RoleModule } from '../role/role.module';

@Module({
  imports: [MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]), RoleModule],
  controllers: [AdminController],
  providers: [UserRepository, UserService],
  exports: [UserRepository],
})
export class UserModule {}
