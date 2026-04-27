import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from './entities/user.schema';
import { UserRepository } from './user.repository';
import { UserService } from './user.service';
import { UserMutationConsumer } from './consumers/user-mutation.consumer';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
    ]),
  ],
  providers: [UserRepository, UserService, UserMutationConsumer],
  exports: [UserService, UserRepository],
})
export class UserModule {}
